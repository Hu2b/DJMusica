/**
 * Auth Service
 * ------------
 * De centrale service voor accounts: registreren, e-mailverificatie, inloggen,
 * wachtwoord-reset en sessieduur. Deze eerste versie bevat STAP 1 uit het
 * bouwplan (Fase 4, stap 1): registreren met e-mailverificatie (FR-33, FR-55,
 * FR-56). Inloggen/lockout, reset en sessieduur volgen in latere stappen/PR's.
 *
 * De service krijgt al zijn "hulpstukken" van buitenaf mee (opslag, mailer,
 * gelekt-wachtwoord-check, klok, beveiligingslog). Dat maakt hem makkelijk te
 * testen (we prikken nepversies in) en straks makkelijk te koppelen aan een
 * echte database en e-maildienst zonder deze logica te wijzigen.
 */

const { validatePassword } = require('./passwordPolicy');
const { hashPassword } = require('./passwordHasher');
const { TOKEN_TYPES } = require('./tokenStore');
const { EVENT_TYPES } = require('./securityLog');
const { normalizeEmail } = require('./userStore');

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
  constructor({ userStore, tokenStore, mailer, securityLog, pwnedChecker, now = Date.now }) {
    this.userStore = userStore;
    this.tokenStore = tokenStore;
    this.mailer = mailer;
    this.securityLog = securityLog;
    this.pwnedChecker = pwnedChecker;
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
};
