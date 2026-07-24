/**
 * Sessie-service (FR-1 t/m FR-8, FR-3a, FR-59)
 * --------------------------------------------
 * Regelt het opzetten van een spel: sessie aanmaken (met join-code), spelers
 * laten aanmelden, aanmeldingen sluiten en de instellingen + afspeellijst kiezen.
 * Het ronde-verloop en scoren komt in de volgende deelstappen.
 *
 * Afhankelijkheden worden ingeprikt, zodat dit los te testen is:
 *  - `magHosten(userId)`: heeft dit account een werkende Spotify-koppeling? (FR-37)
 *  - `playlistBestaat(playlistId)`: bestaat de gekozen afspeellijst? (FR-5)
 */

const { STATUS } = require('./sessieStore');
const { genereerJoinCode, normaliseerCode } = require('./joinCode');

const JOIN_CODE_GELDIG_MS = 4 * 60 * 60 * 1000; // 4 uur (FR-59)
const MIN_ANTWOORD_SECONDEN = 5;
const MAX_ANTWOORD_SECONDEN = 300;

class SessieService {
  /**
   * @param {object} deps
   * @param {object} deps.sessieStore
   * @param {object} deps.joinThrottle - { poging(ip) => { toegestaan } }
   * @param {(userId: string) => boolean} [deps.magHosten] - Spotify-koppeling aanwezig? (FR-37)
   * @param {(playlistId: string) => boolean} [deps.playlistBestaat] - afspeellijst geldig? (FR-5)
   * @param {() => number} [deps.now]
   * @param {object} [deps.securityLog]
   */
  constructor({ sessieStore, joinThrottle, magHosten = () => true, playlistBestaat = () => true, now = Date.now, securityLog = null }) {
    this.sessieStore = sessieStore;
    this.joinThrottle = joinThrottle;
    this.magHosten = magHosten;
    this.playlistBestaat = playlistBestaat;
    this.now = now;
    this.securityLog = securityLog;
  }

  /**
   * Spelleider maakt een sessie aan en krijgt een join-code (FR-1).
   * @returns {{ ok: boolean, reden?: string, sessieId?: string, joinCode?: string }}
   */
  maakSessie({ spelleiderUserId, spelleiderNaam } = {}) {
    if (!spelleiderUserId) throw new Error('maakSessie: spelleiderUserId ontbreekt');

    // Alleen met een werkende Spotify-koppeling kun je hosten (FR-37).
    if (!this.magHosten(spelleiderUserId)) {
      return { ok: false, reden: 'GEEN_SPOTIFY_KOPPELING', message: 'Koppel eerst je eigen Spotify-app voordat je een spel host.' };
    }
    // Eén actieve sessie per account (FR-3a).
    if (this.sessieStore.isAccountActief(spelleiderUserId)) {
      return { ok: false, reden: 'AL_IN_SPEL', message: 'Je bent al betrokken bij een ander lopend spel.' };
    }

    const joinCode = this._uniekeJoinCode();
    const sessie = this.sessieStore.create({ spelleiderUserId, joinCode });

    // De spelleider kan later kiezen zelf mee te spelen (FR-4a); onthoud de naam.
    this._spelleiderNaam = spelleiderNaam;
    this.sessieStore.update(sessie.id, { spelleiderNaam: spelleiderNaam ?? null });

    return { ok: true, sessieId: sessie.id, joinCode };
  }

  _uniekeJoinCode() {
    for (let poging = 0; poging < 20; poging++) {
      const code = genereerJoinCode();
      if (!this.sessieStore.findByJoinCode(code)) return code;
    }
    throw new Error('Kon geen unieke join-code genereren');
  }

  /**
   * Speler meldt zich aan met een join-code (FR-3, FR-59, FR-3a).
   * @returns {{ ok: boolean, reden?: string, sessieId?: string }}
   */
  join({ joinCode, userId, naam, ip } = {}) {
    // Rate-limiting tegen geautomatiseerd raden (FR-59).
    const rl = this.joinThrottle.poging(ip);
    if (!rl.toegestaan) {
      return { ok: false, reden: 'RATE_LIMIT', message: 'Te veel pogingen. Wacht even en probeer opnieuw.' };
    }

    const code = normaliseerCode(joinCode);
    const sessie = this.sessieStore.findByJoinCode(code);

    // Neutrale foutmelding voor elke ongeldige/verlopen code (FR-59).
    if (!sessie || !this._codeGeldig(sessie)) {
      if (this.securityLog) this.securityLog.record('JOIN_MISLUKT', { ip });
      return { ok: false, reden: 'ONGELDIGE_CODE', message: 'Deze code is ongeldig of verlopen.' };
    }

    // Al meegedaan aan déze sessie? Dan is joinen idempotent.
    if (sessie.deelnemers.some((d) => d.userId === userId)) {
      return { ok: true, sessieId: sessie.id };
    }

    // Eén actieve sessie per account (FR-3a).
    if (this.sessieStore.isAccountActief(userId, sessie.id)) {
      return { ok: false, reden: 'AL_IN_SPEL', message: 'Je speelt al mee in een ander spel.' };
    }

    this.sessieStore.addDeelnemer(sessie.id, { userId, naam, isSpelleider: false });
    return { ok: true, sessieId: sessie.id };
  }

  /** Join-code is alleen geldig in de lobby én binnen 4 uur na aanmaak (FR-59). */
  _codeGeldig(sessie) {
    if (sessie.status !== STATUS.LOBBY) return false;
    return this.now() - sessie.aangemaaktOp <= JOIN_CODE_GELDIG_MS;
  }

  /** Live deelnemerslijst voor het spelleider-scherm (FR-4). */
  deelnemers(sessieId) {
    const s = this.sessieStore.findById(sessieId);
    return s ? s.deelnemers : [];
  }

  /**
   * Spelleider sluit de aanmeldingen (FR-5): lobby -> playlist kiezen.
   * De join-code vervalt hiermee (FR-59).
   */
  sluitAanmeldingen({ sessieId, spelleiderUserId } = {}) {
    const s = this._eigenSessie(sessieId, spelleiderUserId);
    if (!s.ok) return s;
    if (s.sessie.status !== STATUS.LOBBY) {
      return { ok: false, reden: 'VERKEERDE_STATUS' };
    }
    this.sessieStore.update(sessieId, { status: STATUS.PLAYLIST_KIEZEN });
    return { ok: true };
  }

  /**
   * Spelleider kiest afspeellijst + instellingen (FR-5 t/m FR-8, FR-4a).
   * @returns {{ ok: boolean, reden?: string, sessie?: object }}
   */
  kiesInstellingen({ sessieId, spelleiderUserId, playlistId, targetScore, difficulty, maxAntwoordSeconden, spelleiderSpeeltMee, vraagtypeVerdeling } = {}) {
    const s = this._eigenSessie(sessieId, spelleiderUserId);
    if (!s.ok) return s;
    if (![STATUS.PLAYLIST_KIEZEN, STATUS.KLAAR].includes(s.sessie.status)) {
      return { ok: false, reden: 'VERKEERDE_STATUS' };
    }
    if (!playlistId || !this.playlistBestaat(playlistId)) {
      return { ok: false, reden: 'ONGELDIGE_PLAYLIST', message: 'Kies een geldige afspeellijst uit het aanbod.' };
    }
    if (difficulty && !['makkelijk', 'moeilijk'].includes(difficulty)) {
      return { ok: false, reden: 'ONGELDIGE_MOEILIJKHEID' };
    }

    const changes = {
      playlistId,
      status: STATUS.KLAAR,
    };
    if (typeof targetScore === 'number' && targetScore > 0) changes.targetScore = targetScore;
    if (difficulty) changes.difficulty = difficulty;
    if (typeof maxAntwoordSeconden === 'number') {
      changes.maxAntwoordSeconden = Math.min(MAX_ANTWOORD_SECONDEN, Math.max(MIN_ANTWOORD_SECONDEN, maxAntwoordSeconden));
    }
    if (typeof vraagtypeVerdeling === 'object' && vraagtypeVerdeling) changes.vraagtypeVerdeling = vraagtypeVerdeling;

    // Speelt de spelleider zelf mee? (FR-4a) Voeg hem dan toe als deelnemer.
    if (spelleiderSpeeltMee === true) {
      changes.spelleiderSpeeltMee = true;
      const al = s.sessie.deelnemers.some((d) => d.userId === spelleiderUserId);
      if (!al) {
        this.sessieStore.addDeelnemer(sessieId, {
          userId: spelleiderUserId,
          naam: s.sessie.spelleiderNaam ?? 'Spelleider',
          isSpelleider: true,
        });
      }
    } else if (spelleiderSpeeltMee === false) {
      changes.spelleiderSpeeltMee = false;
    }

    const sessie = this.sessieStore.update(sessieId, changes);
    return { ok: true, sessie };
  }

  /** Hulpfunctie: haalt de sessie op en checkt dat het de eigen spelleider is. */
  _eigenSessie(sessieId, spelleiderUserId) {
    const sessie = this.sessieStore.findById(sessieId);
    if (!sessie) return { ok: false, reden: 'ONBEKENDE_SESSIE' };
    if (sessie.spelleiderUserId !== spelleiderUserId) return { ok: false, reden: 'GEEN_SPELLEIDER' };
    return { ok: true, sessie };
  }
}

module.exports = {
  SessieService,
  JOIN_CODE_GELDIG_MS,
};
