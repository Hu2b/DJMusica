/**
 * Eenmalige e-maillinks / tokens (FR-34, FR-49, FR-55)
 * ----------------------------------------------------
 * Op één plek geregeld voor alle soorten beveiligde links die we per e-mail
 * versturen: e-mailverificatie (24 uur), wachtwoord-reset (1 uur) en later
 * account-verwijdering (24 uur). Dezelfde strenge regels gelden zo automatisch
 * voor alle soorten:
 *   - het token is cryptografisch willekeurig en minimaal 128 bits;
 *   - we bewaren NOOIT het token zelf, alleen een onomkeerbare hash ervan
 *     (net als bij wachtwoorden) — komt de database ooit op straat, dan zijn de
 *     links nog steeds niet bruikbaar;
 *   - elk token is EENMALIG bruikbaar en heeft een vervaltijd;
 *   - de gebruiker krijgt het "rauwe" token één keer (in de e-maillink); wij
 *     kunnen het daarna alleen nog controleren, niet reproduceren.
 */

const crypto = require('crypto');

const TOKEN_TYPES = {
  EMAIL_VERIFICATIE: 'emailVerificatie',
  WACHTWOORD_RESET: 'wachtwoordReset',
};

// Standaard geldigheidsduur per type (in milliseconden).
const DEFAULT_TTL_MS = {
  [TOKEN_TYPES.EMAIL_VERIFICATIE]: 24 * 60 * 60 * 1000, // 24 uur (FR-55)
  [TOKEN_TYPES.WACHTWOORD_RESET]: 60 * 60 * 1000, // 1 uur (FR-34)
};

const TOKEN_BYTES = 16; // 16 bytes = 128 bits (voldoet aan "minimaal 128 bits")

function hashRawToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

class InMemoryTokenStore {
  constructor({ now = Date.now } = {}) {
    this._now = now;
    // sleutel = tokenHash, waarde = { userId, type, expiresAt, used }
    this._byHash = new Map();
  }

  /**
   * Maakt een nieuw token aan voor een account en geeft het RAUWE token terug
   * (dat gaat in de e-maillink en wordt nergens bewaard).
   * @param {string} userId
   * @param {string} type - een van TOKEN_TYPES
   * @param {object} [opts]
   * @param {number} [opts.ttlMs] - eigen geldigheidsduur; anders de standaard van het type
   * @returns {{ rawToken: string, expiresAt: number }}
   */
  issue(userId, type, { ttlMs } = {}) {
    if (!Object.values(TOKEN_TYPES).includes(type)) {
      throw new Error(`InMemoryTokenStore: onbekend tokentype "${type}"`);
    }
    const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = hashRawToken(rawToken);
    const geldigheid = typeof ttlMs === 'number' ? ttlMs : DEFAULT_TTL_MS[type];
    const expiresAt = this._now() + geldigheid;
    this._byHash.set(tokenHash, { userId, type, expiresAt, used: false });
    return { rawToken, expiresAt };
  }

  /**
   * Probeert een token in te wisselen. Slaagt alleen als het token bestaat,
   * het juiste type heeft, niet verlopen is en nog niet eerder is gebruikt.
   * Bij succes wordt het meteen als "gebruikt" gemarkeerd (eenmalig).
   * @returns {{ ok: true, userId: string } | { ok: false, reden: string }}
   */
  consume(rawToken, type) {
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      return { ok: false, reden: 'ONGELDIG' };
    }
    const record = this._byHash.get(hashRawToken(rawToken));
    if (!record || record.type !== type) {
      return { ok: false, reden: 'ONGELDIG' };
    }
    if (record.used) {
      return { ok: false, reden: 'AL_GEBRUIKT' };
    }
    if (this._now() > record.expiresAt) {
      return { ok: false, reden: 'VERLOPEN' };
    }
    record.used = true;
    return { ok: true, userId: record.userId };
  }

  /**
   * Trekt alle nog openstaande tokens van een bepaald type voor een account in
   * (bv. oude reset-links ongeldig maken zodra er een nieuwe wordt aangevraagd).
   */
  invalidateAllForUser(userId, type) {
    for (const record of this._byHash.values()) {
      if (record.userId === userId && record.type === type && !record.used) {
        record.used = true;
      }
    }
  }
}

module.exports = {
  InMemoryTokenStore,
  TOKEN_TYPES,
  DEFAULT_TTL_MS,
  hashRawToken,
};
