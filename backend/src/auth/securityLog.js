/**
 * Beveiligingslog (NFR-14)
 * ------------------------
 * De "rookmelder" van de app: elke belangrijke beveiligingsgebeurtenis wordt
 * hier vastgelegd (mislukte inlog, lockout, wachtwoord-reset, e-mailverificatie,
 * enz.), met tijdstip en het betrokken account.
 *
 * Twee harde regels uit NFR-14:
 *  1. NOOIT wachtwoorden of tokens in het log — daarom weigert deze module
 *     actief velden die daarop lijken (extra vangnet tegen per ongeluk lekken).
 *  2. Het log is bedoeld om achteraf te kunnen terugkijken; deze in-memory
 *     versie is de eerste stap. Later kan dezelfde interface een
 *     append-only/aanpasbeschermde opslag krijgen zonder de rest te wijzigen.
 */

// De soorten gebeurtenissen die we loggen. Uitgebreid per bouwstap.
const EVENT_TYPES = {
  // Stap 1 - registratie & verificatie
  REGISTRATIE_GESTART: 'REGISTRATIE_GESTART',
  REGISTRATIE_BESTAAND_EMAIL: 'REGISTRATIE_BESTAAND_EMAIL',
  EMAIL_GEVERIFIEERD: 'EMAIL_GEVERIFIEERD',
  EMAIL_VERIFICATIE_MISLUKT: 'EMAIL_VERIFICATIE_MISLUKT',
  // Stap 2 - inloggen & lockout
  LOGIN_GESLAAGD: 'LOGIN_GESLAAGD',
  LOGIN_MISLUKT: 'LOGIN_MISLUKT',
  LOGIN_GEBLOKKEERD: 'LOGIN_GEBLOKKEERD',
  // Stap 3 - wachtwoord-reset
  WACHTWOORD_RESET_AANGEVRAAGD: 'WACHTWOORD_RESET_AANGEVRAAGD',
  WACHTWOORD_RESET_VOLTOOID: 'WACHTWOORD_RESET_VOLTOOID',
  WACHTWOORD_RESET_MISLUKT: 'WACHTWOORD_RESET_MISLUKT',
  // Stap 4 - sessieduur
  SESSIE_WAARSCHUWING: 'SESSIE_WAARSCHUWING',
  SESSIE_VERLENGD: 'SESSIE_VERLENGD',
  SESSIE_AUTO_UITGELOGD: 'SESSIE_AUTO_UITGELOGD',
};

// Velden die absoluut niet in een logregel mogen voorkomen.
const VERBODEN_VELDEN = ['password', 'wachtwoord', 'token', 'tokenhash', 'hash', 'secret'];

class SecurityLog {
  constructor({ now = Date.now, sink = null } = {}) {
    this._now = now;
    this._entries = [];
    // Optionele extra bestemming (bv. console of bestand); krijgt dezelfde
    // geschoonde regel. Standaard uit, zodat tests stil blijven.
    this._sink = sink;
  }

  /**
   * Legt een gebeurtenis vast.
   * @param {string} type - een van EVENT_TYPES
   * @param {object} [details] - veilige contextvelden (email, ip, userId, reden, ...)
   */
  record(type, details = {}) {
    for (const key of Object.keys(details)) {
      if (VERBODEN_VELDEN.includes(key.toLowerCase())) {
        throw new Error(
          `SecurityLog: veld "${key}" mag niet gelogd worden (NFR-14: geen wachtwoorden/tokens).`
        );
      }
    }
    const entry = { type, at: new Date(this._now()).toISOString(), ...details };
    this._entries.push(entry);
    if (typeof this._sink === 'function') this._sink(entry);
    return entry;
  }

  /** Alle logregels (kopie), optioneel gefilterd op type. */
  entries(type = null) {
    const all = this._entries.slice();
    return type ? all.filter((e) => e.type === type) : all;
  }

  /** Aantal regels van een bepaald type — handig voor de piek-signalering. */
  count(type) {
    return this._entries.filter((e) => e.type === type).length;
  }
}

module.exports = {
  SecurityLog,
  EVENT_TYPES,
  VERBODEN_VELDEN,
};
