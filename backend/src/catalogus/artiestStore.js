/**
 * Artiest-opslag (FR-28)
 * ----------------------
 * Land van herkomst wordt één keer per ARTIEST vastgelegd (niet per nummer).
 * Alle nummers van dezelfde artiest delen dat land automatisch. Daarom bewaren
 * we artiesten apart en zoeken we ze op naam (hoofdletter-ongevoelig), zodat we
 * niet per ongeluk twee keer dezelfde artiest aanmaken.
 *
 * Voorlopig in-memory, achter dezelfde methodes die een echte database later ook
 * zou hebben.
 */

const crypto = require('crypto');

function normaliseerNaam(naam) {
  return String(naam ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

class InMemoryArtiestStore {
  constructor({ generateId = () => crypto.randomUUID() } = {}) {
    this._generateId = generateId;
    this._byId = new Map();
    this._naamNaarId = new Map();
  }

  /**
   * Zoekt een artiest op naam, of maakt hem aan als hij nog niet bestaat.
   * @param {string} naam
   * @param {object} [extra] - bv. spotifyArtistId
   * @returns {object} de (bestaande of nieuwe) artiest
   */
  findOrCreateByNaam(naam, { spotifyArtistId = null } = {}) {
    const sleutel = normaliseerNaam(naam);
    const bestaandId = this._naamNaarId.get(sleutel);
    if (bestaandId) {
      const bestaand = this._byId.get(bestaandId);
      // Vul een ontbrekend Spotify-id alsnog aan als we het nu wél weten.
      if (spotifyArtistId && !bestaand.spotifyArtistId) {
        bestaand.spotifyArtistId = spotifyArtistId;
      }
      return { ...bestaand };
    }
    const artiest = {
      id: this._generateId(),
      naam: String(naam).trim(),
      spotifyArtistId,
      land: null,
      landMatchZekerheid: null, // percentage (0-100), null zolang onbekend
      landHandmatigIngevuld: false,
      landBijgewerktOp: null,
    };
    this._byId.set(artiest.id, artiest);
    this._naamNaarId.set(sleutel, artiest.id);
    return { ...artiest };
  }

  findById(id) {
    const a = this._byId.get(id);
    return a ? { ...a } : null;
  }

  findByNaam(naam) {
    const id = this._naamNaarId.get(normaliseerNaam(naam));
    return id ? { ...this._byId.get(id) } : null;
  }

  update(id, changes) {
    const a = this._byId.get(id);
    if (!a) throw new Error('InMemoryArtiestStore: onbekende artiest');
    Object.assign(a, changes);
    return { ...a };
  }

  /** Alle artiesten (kopie). */
  all() {
    return [...this._byId.values()].map((a) => ({ ...a }));
  }
}

module.exports = {
  InMemoryArtiestStore,
  normaliseerNaam,
};
