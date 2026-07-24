/**
 * Rate-limiting op join-pogingen (FR-59)
 * --------------------------------------
 * Remt geautomatiseerd raden van join-codes af: per afzender (IP) mogen er maar
 * een beperkt aantal join-pogingen per tijdvenster zijn. Daarboven worden
 * verdere pogingen tijdelijk geweigerd.
 */

const STANDAARD_MAX = 10; // pogingen per venster
const STANDAARD_VENSTER_MS = 60 * 1000; // 1 minuut

class InMemoryJoinThrottle {
  constructor({ now = Date.now, max = STANDAARD_MAX, vensterMs = STANDAARD_VENSTER_MS } = {}) {
    this._now = now;
    this._max = max;
    this._vensterMs = vensterMs;
    this._perIp = new Map(); // ip -> { count, resetOp }
  }

  /**
   * Registreert een poging en zegt of hij is toegestaan.
   * @param {string} ip
   * @returns {{ toegestaan: boolean, resterend: number }}
   */
  poging(ip) {
    const sleutel = String(ip ?? '');
    const nu = this._now();
    let rec = this._perIp.get(sleutel);
    if (!rec || nu >= rec.resetOp) {
      rec = { count: 0, resetOp: nu + this._vensterMs };
      this._perIp.set(sleutel, rec);
    }
    rec.count += 1;
    const toegestaan = rec.count <= this._max;
    return { toegestaan, resterend: Math.max(0, this._max - rec.count) };
  }
}

module.exports = {
  InMemoryJoinThrottle,
  STANDAARD_MAX,
  STANDAARD_VENSTER_MS,
};
