/**
 * Oplopende wachttijd na mislukte inlogpogingen (FR-35)
 * -----------------------------------------------------
 * Remt brute-force-pogingen af. Na 5 mislukte inlogpogingen op rij geldt een
 * wachttijd die telkens verdubbelt:
 *   5e mislukte poging -> 1 minuut wachten
 *   6e                 -> 2 minuten
 *   7e                 -> 4 minuten  (8, 16, ... enzovoort)
 *
 * BELANGRIJK (FR-35): de blokkade hangt aan de COMBINATIE van account én
 * afzender (IP-adres), niet aan het account alleen. Zo kan een kwaadwillende
 * niet expres andermans account op slot zetten door vanaf zijn eigen verbinding
 * fout in te loggen — de echte eigenaar logt gewoon in vanaf haar eigen IP.
 *
 * We gebruiken het (genormaliseerde) e-mailadres samen met het IP als sleutel.
 * Dat werkt ook als het account niet bestaat, zónder te verklappen of het
 * bestaat (de afremming is voor beide gevallen gelijk).
 */

const DREMPEL = 5; // vanaf de 5e mislukte poging gaat de wachttijd in
const BASIS_WACHT_MS = 60 * 1000; // 1 minuut

class InMemoryLoginThrottle {
  constructor({ now = Date.now, drempel = DREMPEL, basisWachtMs = BASIS_WACHT_MS } = {}) {
    this._now = now;
    this._drempel = drempel;
    this._basisWachtMs = basisWachtMs;
    // sleutel = "email|ip", waarde = { mislukt: number, lockedUntil: number }
    this._pogingen = new Map();
  }

  _sleutel(email, ip) {
    return `${String(email ?? '').toLowerCase()}|${String(ip ?? '')}`;
  }

  _record(email, ip) {
    const sleutel = this._sleutel(email, ip);
    let rec = this._pogingen.get(sleutel);
    if (!rec) {
      rec = { mislukt: 0, lockedUntil: 0 };
      this._pogingen.set(sleutel, rec);
    }
    return rec;
  }

  /**
   * Huidige status voor een account+IP-combinatie.
   * @returns {{ locked: boolean, retryAfterMs: number, mislukt: number }}
   */
  status(email, ip) {
    const rec = this._pogingen.get(this._sleutel(email, ip));
    if (!rec) return { locked: false, retryAfterMs: 0, mislukt: 0 };
    const resterend = rec.lockedUntil - this._now();
    return {
      locked: resterend > 0,
      retryAfterMs: resterend > 0 ? resterend : 0,
      mislukt: rec.mislukt,
    };
  }

  /**
   * Registreert een mislukte poging en berekent de (eventueel) nieuwe wachttijd.
   * @returns {{ locked: boolean, retryAfterMs: number, mislukt: number }}
   */
  registerFailure(email, ip) {
    const rec = this._record(email, ip);
    rec.mislukt += 1;

    if (rec.mislukt >= this._drempel) {
      // 5e poging -> factor 1, 6e -> 2, 7e -> 4, ...
      const factor = 2 ** (rec.mislukt - this._drempel);
      const wacht = this._basisWachtMs * factor;
      rec.lockedUntil = this._now() + wacht;
      return { locked: true, retryAfterMs: wacht, mislukt: rec.mislukt };
    }
    return { locked: false, retryAfterMs: 0, mislukt: rec.mislukt };
  }

  /** Bij een geslaagde inlog: de teller en blokkade voor deze combinatie wissen. */
  registerSuccess(email, ip) {
    this._pogingen.delete(this._sleutel(email, ip));
  }
}

module.exports = {
  InMemoryLoginThrottle,
  DREMPEL,
  BASIS_WACHT_MS,
};
