/**
 * Auth Service
 * ------------
 * De centrale service voor accounts: registreren, e-mailverificatie, inloggen,
 * wachtwoord-reset en sessieduur. Bevat inmiddels:
 *   - STAP 1: registreren met e-mailverificatie (FR-33, FR-55, FR-56)
 *   - STAP 2: inloggen met oplopende wachttijd na 5 mislukte pogingen (FR-35)
 * Wachtwoord-reset en sessieduur volgen in latere stappen/PR's.
 *
 * De service krijgt al zijn "hulpstukken" van buitenaf mee (opslag, mailer,
 * gelekt-wachtwoord-check, klok, beveiligingslog, login-afremming). Dat maakt
 * hem makkelijk te testen (we prikken nepversies in) en straks makkelijk te
 * koppelen aan een echte database en e-maildienst zonder deze logica te wijzigen.
 */

const { validatePassword } = require('./passwordPolicy');
const { hashPassword, verifyPassword } = require('./passwordHasher');
const { TOKEN_TYPES } = require('./tokenStore');
const { EVENT_TYPES } = require('./securityLog');
const { normalizeEmail } = require('./userStore');

/**
 * Een vaste, geldige (maar nutteloze) hash. Als er wordt ingelogd op een
 * niet-bestaand e-mailadres, controleren we het wachtwoord tegen DEZE hash.
 * Dat kost evenveel tijd als een echte controle, zodat aan de responstijd niet
 * te zien is of een e-mailadres bestaat (bescherming tegen timing-aanvallen).
 */
const DUMMY_HASH =
  'scrypt$16384$8$1$26b0abc739c261d6bb9cf73c96249cb8$f7ecd576b5bec9da14d726b411a0d484750a0f4721c036dcd44e2b97044aabb2ef80abd2267688d006c75c3a297fb0ddcd807f34e60f61ccb775cc3f0ef75a79';

// Eén vaste, neutrale foutmelding voor een mislukte inlog: hij verklapt niet of
// het e-mailadres bestond of alleen het wachtwoord fout was (FR-35, geen lek).
const NEUTRALE_LOGIN_FOUT =
  'Inloggen is niet gelukt. Controleer je e-mailadres en wachtwoord en probeer het opnieuw.';

/**
 * Eén vaste, neutrale melding voor registratie. Of het e-mailadres nu nieuw is
 * of al bestaat: de gebruiker ziet EXACT dezelfde tekst (FR-55). Zo kan niemand
 * via het registratieformulier ontdekken welke e-mailadressen bij ons bekend
 * zijn.
 */
const NEUTRALE_REGISTRATIE_MELDING =
  'Bijna klaar! Als dit e-mailadres nog niet in gebruik is, ontvang je een e-mail om je account te bevestigen. Klik op de link in die e-mail om je account te activeren.';

class AuthService {
  /**
   * @param {object} deps
   * @param {object} deps.userStore - opslag van accounts (zie userStore.js)
   * @param {object} deps.tokenStore - opslag van eenmalige links (zie tokenStore.js)
   * @param {object} deps.mailer - verstuurt e-mails; zie de verwachte methodes hieronder
   * @param {object} deps.securityLog - beveiligingslog (NFR-14)
   * @param {(password: string) => Promise<boolean>} [deps.pwnedChecker] - gelekt-wachtwoord-check (FR-56)
   * @param {() => number} [deps.now] - klok (voor tests), geeft milliseconden
   */
  constructor({
    userStore,
    tokenStore,
    mailer,
    securityLog,
    pwnedChecker,
    loginThrottle,
    now = Date.now,
  }) {
    this.userStore = userStore;
    this.tokenStore = tokenStore;
    this.mailer = mailer;
    this.securityLog = securityLog;
    this.pwnedChecker = pwnedChecker;
    this.loginThrottle = loginThrottle;
    this.now = now;
  }

  /**
   * Registreert een nieuw account (FR-33, FR-55, FR-56).
   *
   * Stappen:
   *  1. Controleer het wachtwoord tegen het beleid (lengte + niet-gelekt).
   *     Dit gaat over het getypte wachtwoord, niet over het e-mailadres, dus
   *     het verklapt niets over bestaande accounts.
   *  2. Bestaat het e-mailadres al? Dan maken we GEEN nieuw account, maar sturen
   *     we de bestaande eigenaar een informatieve mail — en tonen we dezelfde
   *     neutrale melding als bij een nieuwe registratie.
   *  3. Nieuw e-mailadres? Maak een (nog niet geverifieerd) account aan, en
   *     stuur een verificatiemail met een eenmalige link (24 uur geldig).
   *
   * @param {object} input
   * @param {string} input.email
   * @param {string} input.password
   * @param {string} [input.ip] - alleen voor logging
   * @returns {Promise<{ ok: boolean, message?: string, reasons?: string[], messages?: string[] }>}
   */
  async register({ email, password, ip } = {}) {
    // Stap 1: wachtwoordbeleid.
    const beleid = await validatePassword(password, { pwnedChecker: this.pwnedChecker });
    if (!beleid.ok) {
      return { ok: false, reasons: beleid.reasons, messages: beleid.messages };
    }

    const genormaliseerd = normalizeEmail(email);
    const bestaand = this.userStore.findByEmail(genormaliseerd);

    if (bestaand) {
      // Stap 2: e-mailadres bestaat al. Geen tweede account; wel een mail naar
      // de echte eigenaar, en naar buiten toe exact dezelfde melding.
      await this.mailer.sendAccountExistsNotice({ email: genormaliseerd });
      this.securityLog.record(EVENT_TYPES.REGISTRATIE_BESTAAND_EMAIL, {
        email: genormaliseerd,
        ip,
      });
      return { ok: true, message: NEUTRALE_REGISTRATIE_MELDING };
    }

    // Stap 3: nieuw account aanmaken (nog niet geverifieerd).
    const wachtwoordHash = await hashPassword(password);
    const user = this.userStore.create({ email: genormaliseerd, wachtwoordHash });

    const { rawToken } = this.tokenStore.issue(user.id, TOKEN_TYPES.EMAIL_VERIFICATIE);
    await this.mailer.sendVerificationEmail({ email: genormaliseerd, rawToken });

    this.securityLog.record(EVENT_TYPES.REGISTRATIE_GESTART, {
      email: genormaliseerd,
      userId: user.id,
      ip,
    });

    return { ok: true, message: NEUTRALE_REGISTRATIE_MELDING };
  }

  /**
   * Verifieert een account via de link uit de verificatiemail (FR-55).
   * @param {object} input
   * @param {string} input.rawToken - het token uit de e-maillink
   * @param {string} [input.ip]
   * @returns {Promise<{ ok: boolean, reden?: string }>}
   */
  async verifyEmail({ rawToken, ip } = {}) {
    const resultaat = this.tokenStore.consume(rawToken, TOKEN_TYPES.EMAIL_VERIFICATIE);
    if (!resultaat.ok) {
      this.securityLog.record(EVENT_TYPES.EMAIL_VERIFICATIE_MISLUKT, { reden: resultaat.reden, ip });
      return { ok: false, reden: resultaat.reden };
    }

    // Al geverifieerd? Dan laten we de datum staan (idempotent, geen kwaad).
    const user = this.userStore.findById(resultaat.userId);
    if (user && !user.emailGeverifieerdOp) {
      this.userStore.update(user.id, {
        emailGeverifieerdOp: new Date(this.now()).toISOString(),
      });
    }

    this.securityLog.record(EVENT_TYPES.EMAIL_GEVERIFIEERD, { userId: resultaat.userId, ip });
    return { ok: true };
  }

  /**
   * Inloggen met oplopende wachttijd na 5 mislukte pogingen (FR-35).
   *
   * De afremming hangt aan de combinatie e-mailadres + IP-adres, zodat niemand
   * andermans account kan blokkeren door vanaf zijn eigen verbinding fout in te
   * loggen.
   *
   * Volgorde:
   *  1. Zit deze account+IP-combinatie in een wachttijd? Dan meteen weigeren.
   *  2. Controleer het wachtwoord (ook tegen een dummy-hash als het account niet
   *     bestaat, zodat de responstijd niets verklapt).
   *  3. Fout? Registreer de mislukte poging (evt. nieuwe/langere wachttijd).
   *  4. Goed maar e-mail nog niet geverifieerd? Weiger, maar zónder wachttijd
   *     (het juiste wachtwoord bewijst dat het de eigenaar is).
   *  5. Goed én geverifieerd? Inloggen; teller en blokkade wissen.
   *
   * @param {object} input
   * @param {string} input.email
   * @param {string} input.password
   * @param {string} input.ip - afzender-IP (voor de account+IP-blokkade)
   * @returns {Promise<{ ok: boolean, userId?: string, reden?: string, message?: string, retryAfterMs?: number }>}
   */
  async login({ email, password, ip } = {}) {
    const genormaliseerd = normalizeEmail(email);

    // Stap 1: al in een wachttijd?
    const status = this.loginThrottle.status(genormaliseerd, ip);
    if (status.locked) {
      this.securityLog.record(EVENT_TYPES.LOGIN_GEBLOKKEERD, {
        email: genormaliseerd,
        ip,
        retryAfterMs: status.retryAfterMs,
      });
      return {
        ok: false,
        reden: 'GEBLOKKEERD',
        retryAfterMs: status.retryAfterMs,
        message: this._wachttijdMelding(status.retryAfterMs),
      };
    }

    // Stap 2: wachtwoord controleren (dummy-hash bij onbekend account -> gelijke timing).
    const user = this.userStore.findByEmail(genormaliseerd);
    const hash = user ? user.wachtwoordHash : DUMMY_HASH;
    const wachtwoordKlopt = (await verifyPassword(password, hash)) && Boolean(user);

    // Stap 3: verkeerde combinatie -> mislukte poging registreren.
    if (!wachtwoordKlopt) {
      const na = this.loginThrottle.registerFailure(genormaliseerd, ip);
      this.securityLog.record(EVENT_TYPES.LOGIN_MISLUKT, {
        email: genormaliseerd,
        ip,
        mislukt: na.mislukt,
      });
      if (na.locked) {
        this.securityLog.record(EVENT_TYPES.LOGIN_GEBLOKKEERD, {
          email: genormaliseerd,
          ip,
          retryAfterMs: na.retryAfterMs,
        });
        return {
          ok: false,
          reden: 'GEBLOKKEERD',
          retryAfterMs: na.retryAfterMs,
          message: this._wachttijdMelding(na.retryAfterMs),
        };
      }
      return { ok: false, reden: 'ONGELDIG', message: NEUTRALE_LOGIN_FOUT };
    }

    // Wachtwoord klopt: de teller mag hoe dan ook gewist worden (het is de eigenaar).
    this.loginThrottle.registerSuccess(genormaliseerd, ip);

    // Stap 4: nog niet geverifieerd? Wel de eigenaar, maar (nog) niet bruikbaar (FR-55).
    if (!user.emailGeverifieerdOp) {
      return {
        ok: false,
        reden: 'NIET_GEVERIFIEERD',
        message:
          'Bevestig eerst je e-mailadres via de link die we je hebben gestuurd. Daarna kun je inloggen.',
      };
    }

    // Stap 5: succes.
    this.securityLog.record(EVENT_TYPES.LOGIN_GESLAAGD, { email: genormaliseerd, userId: user.id, ip });
    return { ok: true, userId: user.id };
  }

  _wachttijdMelding(retryAfterMs) {
    const minuten = Math.ceil(retryAfterMs / 60000);
    return `Te veel mislukte pogingen. Probeer het over ongeveer ${minuten} minuut${
      minuten === 1 ? '' : 'en'
    } opnieuw, of stel via "wachtwoord vergeten" een nieuw wachtwoord in.`;
  }

  /**
   * Hulpfunctie: mag dit account meespelen/hosten? Pas ná e-mailverificatie
   * (FR-55). Gebruikt door latere stappen (login, sessie).
   */
  isAccountBruikbaar(userId) {
    return this.userStore.isVerified(userId);
  }
}

module.exports = {
  AuthService,
  NEUTRALE_REGISTRATIE_MELDING,
  NEUTRALE_LOGIN_FOUT,
};
