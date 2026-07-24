/**
 * Sessie-opslag (ingelogde apparaten)
 * -----------------------------------
 * Houdt bij welke apparaten op dit moment ingelogd zijn. Elke keer dat iemand
 * inlogt, ontstaat er een "sessie" (te vergelijken met: één ingelogd apparaat).
 *
 * We hebben dit hier nodig voor twee dingen:
 *  - STAP 3 (FR-34): na een geslaagde wachtwoord-reset moeten ALLE sessies van
 *    dat account worden uitgelogd — een indringer die stiekem was ingelogd,
 *    vliegt er zo direct uit.
 *  - STAP 4 (FR-57): buiten een actief spel verloopt een sessie na 2 uur; dat
 *    rekenwerk komt in een latere stap bovenop deze opslag.
 *
 * Voorlopig in het werkgeheugen; later te vervangen door Redis/database zonder
 * de rest te wijzigen.
 */

const crypto = require('crypto');

class InMemorySessionStore {
  constructor({ now = Date.now, generateId = () => crypto.randomUUID() } = {}) {
    this._now = now;
    this._generateId = generateId;
    this._byId = new Map();
  }

  /**
   * Start een nieuwe sessie voor een account.
   * @param {string} userId
   * @returns {object} de nieuwe sessie (met id)
   */
  create(userId) {
    const nu = this._now();
    const sessie = {
      id: this._generateId(),
      userId,
      createdAt: nu,
      // "laatste teken van leven" — basis voor de 2-uursregel in stap 4.
      lastActivityAt: nu,
      // Verlengd t/m dit moment; bij inloggen gelijk aan createdAt + 2 uur (stap 4).
      geldigTot: null,
    };
    this._byId.set(sessie.id, sessie);
    return { ...sessie };
  }

  /** @returns {object|null} de sessie, of null als hij niet (meer) bestaat. */
  get(sessionId) {
    const s = this._byId.get(sessionId);
    return s ? { ...s } : null;
  }

  /** Is deze sessie nog actief (bestaat hij nog)? */
  isActive(sessionId) {
    return this._byId.has(sessionId);
  }

  /** Werkt velden van een sessie bij (bv. lastActivityAt/geldigTot in stap 4). */
  update(sessionId, changes) {
    const s = this._byId.get(sessionId);
    if (!s) return null;
    Object.assign(s, changes);
    return { ...s };
  }

  /** Beëindigt één sessie (uitloggen op één apparaat). */
  destroy(sessionId) {
    return this._byId.delete(sessionId);
  }

  /**
   * Beëindigt ALLE sessies van een account (FR-34: uitloggen op alle apparaten).
   * @returns {number} aantal beëindigde sessies
   */
  destroyAllForUser(userId) {
    let aantal = 0;
    for (const [id, s] of this._byId.entries()) {
      if (s.userId === userId) {
        this._byId.delete(id);
        aantal += 1;
      }
    }
    return aantal;
  }

  /** Alle actieve sessies van een account (kopie). */
  listForUser(userId) {
    return [...this._byId.values()].filter((s) => s.userId === userId).map((s) => ({ ...s }));
  }
}

module.exports = {
  InMemorySessionStore,
};
