/**
 * Track-opslag (FR-30)
 * --------------------
 * Eén record per nummer, met alle gegevens die tijdens het spelen nodig zijn
 * (titel, artiest, jaar, Spotify-URI). Het land zit NIET op de track maar op de
 * gekoppelde artiest (zie artiestStore, FR-28).
 *
 * Velden die het spelgedrag sturen:
 *  - uitgeslotenDoorBeheerder: handmatig geblokkeerd (FR-12b), omkeerbaar.
 *  - actief: gaat op false als het nummer uit de Spotify-playlist verdwijnt
 *    (FR-31); we verwijderen het niet, zodat afspeelhistorie intact blijft.
 *  - playCount/laatstGespeeld: basis voor de afspeelcyclus (FR-25/26), later.
 */

const crypto = require('crypto');

class InMemoryTrackStore {
  constructor({ now = Date.now, generateId = () => crypto.randomUUID() } = {}) {
    this._now = now;
    this._generateId = generateId;
    this._byId = new Map();
  }

  create({ playlistId, spotifyTrackUri, titel, artiestId, jaar }) {
    const track = {
      id: this._generateId(),
      playlistId,
      spotifyTrackUri,
      titel: titel ?? null,
      artiestId,
      jaar: jaar ?? null,
      uitgeslotenDoorBeheerder: false,
      actief: true,
      playCount: 0,
      laatstGespeeld: null,
      toegevoegdOp: new Date(this._now()).toISOString(),
    };
    this._byId.set(track.id, track);
    return { ...track };
  }

  findById(id) {
    const t = this._byId.get(id);
    return t ? { ...t } : null;
  }

  update(id, changes) {
    const t = this._byId.get(id);
    if (!t) throw new Error('InMemoryTrackStore: onbekende track');
    Object.assign(t, changes);
    return { ...t };
  }

  /** Alle tracks van een afspeellijst (kopie). */
  byPlaylist(playlistId) {
    return [...this._byId.values()]
      .filter((t) => t.playlistId === playlistId)
      .map((t) => ({ ...t }));
  }

  /** Zoekt een track binnen een playlist op zijn Spotify-URI (voor de sync). */
  findByUri(playlistId, spotifyTrackUri) {
    const gevonden = [...this._byId.values()].find(
      (t) => t.playlistId === playlistId && t.spotifyTrackUri === spotifyTrackUri
    );
    return gevonden ? { ...gevonden } : null;
  }

  /** Verwijdert alle tracks van een afspeellijst (bij playlist verwijderen). */
  deleteByPlaylist(playlistId) {
    let aantal = 0;
    for (const [id, t] of this._byId.entries()) {
      if (t.playlistId === playlistId) {
        this._byId.delete(id);
        aantal += 1;
      }
    }
    return aantal;
  }
}

module.exports = {
  InMemoryTrackStore,
};
