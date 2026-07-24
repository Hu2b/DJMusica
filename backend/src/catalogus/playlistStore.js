/**
 * Afspeellijst-opslag (FR-5a)
 * ---------------------------
 * Bewaart de afspeellijsten die de beheerder aan de app toevoegt. De nummers
 * zelf staan in de trackStore (gekoppeld via playlistId).
 *
 * `standaardVraagtypeVerdeling` is de door de beheerder ingestelde standaard per
 * afspeellijst (FR-5b); zolang die niet is ingesteld geldt de fabrieksstandaard.
 * Dat instellen komt in een latere stap — hier bewaren we alleen het veld.
 */

const crypto = require('crypto');

class InMemoryPlaylistStore {
  constructor({ now = Date.now, generateId = () => crypto.randomUUID() } = {}) {
    this._now = now;
    this._generateId = generateId;
    this._byId = new Map();
  }

  create({ spotifyPlaylistId, naam, toegevoegdDoorUserId }) {
    const playlist = {
      id: this._generateId(),
      spotifyPlaylistId,
      naam,
      toegevoegdDoorUserId,
      standaardVraagtypeVerdeling: null,
      toegevoegdOp: new Date(this._now()).toISOString(),
    };
    this._byId.set(playlist.id, playlist);
    return { ...playlist };
  }

  findById(id) {
    const p = this._byId.get(id);
    return p ? { ...p } : null;
  }

  /** Zoekt een al toegevoegde afspeellijst op zijn Spotify-id (voorkomt dubbel toevoegen). */
  findBySpotifyId(spotifyPlaylistId) {
    const gevonden = [...this._byId.values()].find(
      (p) => p.spotifyPlaylistId === spotifyPlaylistId
    );
    return gevonden ? { ...gevonden } : null;
  }

  update(id, changes) {
    const p = this._byId.get(id);
    if (!p) throw new Error('InMemoryPlaylistStore: onbekende afspeellijst');
    Object.assign(p, changes);
    return { ...p };
  }

  delete(id) {
    return this._byId.delete(id);
  }

  /** Alle afspeellijsten (kopie) — het aanbod waar spelleiders uit kiezen. */
  all() {
    return [...this._byId.values()].map((p) => ({ ...p }));
  }
}

module.exports = {
  InMemoryPlaylistStore,
};
