/**
 * Gebruikersopslag (in-memory)
 * ----------------------------
 * Bewaart de accounts (de USER-tabel uit architectuur.md). Dit is voorlopig
 * een eenvoudige opslag in het werkgeheugen, zodat we de Auth Service volledig
 * kunnen bouwen en testen zonder al een echte PostgreSQL-database nodig te
 * hebben (die komt in een latere fase, zie bouwplan Fase 3).
 *
 * Alle methodes zijn met opzet dezelfde vorm als een database-versie later zou
 * hebben (findByEmail, create, update, ...), zodat we straks alleen de
 * binnenkant hoeven te vervangen, niet de Auth Service eromheen.
 *
 * We slaan bewust zo min mogelijk persoonsgegevens op (dataminimalisatie,
 * NFR-13): een e-mailadres en de wachtwoord-hash. Geen leesbaar wachtwoord.
 */

const crypto = require('crypto');

/** E-mailadressen vergelijken we hoofdletter-ongevoelig en zonder spaties. */
function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

class InMemoryUserStore {
  constructor({ now = Date.now, generateId = () => crypto.randomUUID() } = {}) {
    this._now = now;
    this._generateId = generateId;
    this._byId = new Map();
    this._emailToId = new Map();
  }

  /**
   * Maakt een nieuw account aan.
   * @param {object} data
   * @param {string} data.email
   * @param {string} data.wachtwoordHash
   * @param {string[]} [data.rollen]
   * @returns {object} het aangemaakte gebruikersrecord
   */
  create({ email, wachtwoordHash, rollen = ['speler'] }) {
    const normalized = normalizeEmail(email);
    if (this._emailToId.has(normalized)) {
      throw new Error('InMemoryUserStore: e-mailadres bestaat al');
    }
    const user = {
      id: this._generateId(),
      email: normalized,
      wachtwoordHash,
      rollen: rollen.slice(),
      emailGeverifieerdOp: null, // pas gevuld na klikken op de verificatielink (FR-55)
      verwijderStatus: 'actief',
      createdAt: new Date(this._now()).toISOString(),
    };
    this._byId.set(user.id, user);
    this._emailToId.set(normalized, user.id);
    return { ...user };
  }

  /** @returns {object|null} kopie van het record, of null. */
  findByEmail(email) {
    const id = this._emailToId.get(normalizeEmail(email));
    return id ? { ...this._byId.get(id) } : null;
  }

  /** @returns {object|null} kopie van het record, of null. */
  findById(id) {
    const user = this._byId.get(id);
    return user ? { ...user } : null;
  }

  /**
   * Werkt bestaande velden bij (bv. emailGeverifieerdOp, wachtwoordHash).
   * @returns {object} het bijgewerkte record
   */
  update(id, changes) {
    const user = this._byId.get(id);
    if (!user) throw new Error('InMemoryUserStore: onbekend account');
    Object.assign(user, changes);
    return { ...user };
  }

  /** Een account geldt als "geverifieerd/bruikbaar" zodra de e-mail bevestigd is (FR-55). */
  isVerified(id) {
    const user = this._byId.get(id);
    return Boolean(user && user.emailGeverifieerdOp);
  }
}

module.exports = {
  InMemoryUserStore,
  normalizeEmail,
};
