/**
 * Playlist Import Service (FR-5a, FR-30)
 * --------------------------------------
 * De beheerder plakt een Spotify-playlist-link; deze service haalt de nummers op
 * (via een ingeprikte Spotify-client) en slaat ze op als één record per nummer,
 * met de artiesten apart (zodat het land later per artiest bepaald kan worden).
 *
 * Deze eerste versie (stap 2a) doet nog GEEN land-opzoeking (MusicBrainz) en nog
 * geen "ververs" — dat zijn stap 2b en 2c. Nieuwe nummers zijn daarom nog niet
 * "compleet" zolang het land van de artiest ontbreekt; ze worden dus nog niet
 * gekozen in een ronde. Dat is precies het gewenste gedrag (FR-12a).
 *
 * De Spotify-client wordt van buitenaf meegegeven, zodat tests draaien zonder
 * echte Spotify-aanroepen. De echte client (met OAuth) komt in een latere
 * infra-stap.
 */

const { parseSpotifyPlaylistId } = require('./spotifyUrl');
const { isCompleet, isSelecteerbaar } = require('./trackRegels');

class PlaylistImportService {
  /**
   * @param {object} deps
   * @param {object} deps.spotifyClient - { getPlaylist(playlistId) => { naam, tracks[] } }
   * @param {object} deps.playlistStore
   * @param {object} deps.trackStore
   * @param {object} deps.artiestStore
   */
  constructor({ spotifyClient, playlistStore, trackStore, artiestStore }) {
    this.spotifyClient = spotifyClient;
    this.playlistStore = playlistStore;
    this.trackStore = trackStore;
    this.artiestStore = artiestStore;
  }

  /**
   * Voegt een afspeellijst toe op basis van een Spotify-URL.
   * @param {object} input
   * @param {string} input.url - de Spotify-playlist-link
   * @param {string} input.beheerderUserId - wie hem toevoegt
   * @returns {Promise<{ playlistId, naam, aantalTracks, aantalNieuweArtiesten }>}
   */
  async importPlaylist({ url, beheerderUserId } = {}) {
    const spotifyPlaylistId = parseSpotifyPlaylistId(url);

    // Al eerder toegevoegd? Dan niet nog een keer (gebruik "ververs" in stap 2c).
    const bestaand = this.playlistStore.findBySpotifyId(spotifyPlaylistId);
    if (bestaand) {
      const err = new Error('Deze afspeellijst is al toegevoegd. Gebruik "verversen" om te synchroniseren.');
      err.code = 'AL_TOEGEVOEGD';
      err.playlistId = bestaand.id;
      throw err;
    }

    const data = await this.spotifyClient.getPlaylist(spotifyPlaylistId);

    const playlist = this.playlistStore.create({
      spotifyPlaylistId,
      naam: data.naam,
      toegevoegdDoorUserId: beheerderUserId,
    });

    const nieuweArtiesten = new Set();
    for (const t of data.tracks) {
      const bestondArtiest = this.artiestStore.findByNaam(t.artiestNaam) !== null;
      const artiest = this.artiestStore.findOrCreateByNaam(t.artiestNaam, {
        spotifyArtistId: t.spotifyArtistId ?? null,
      });
      if (!bestondArtiest) nieuweArtiesten.add(artiest.id);

      this.trackStore.create({
        playlistId: playlist.id,
        spotifyTrackUri: t.spotifyTrackUri,
        titel: t.titel,
        artiestId: artiest.id,
        jaar: t.jaar ?? null,
      });
    }

    return {
      playlistId: playlist.id,
      naam: playlist.naam,
      aantalTracks: data.tracks.length,
      aantalNieuweArtiesten: nieuweArtiesten.size,
    };
  }

  /**
   * Verwijdert een afspeellijst en haar nummers (FR-5a).
   * @returns {{ ok: boolean, verwijderdeTracks: number }}
   */
  deletePlaylist(playlistId) {
    const bestond = this.playlistStore.findById(playlistId);
    if (!bestond) return { ok: false, verwijderdeTracks: 0 };
    const verwijderdeTracks = this.trackStore.deleteByPlaylist(playlistId);
    this.playlistStore.delete(playlistId);
    return { ok: true, verwijderdeTracks };
  }

  /** Markeert een nummer handmatig als uitgesloten (FR-12b). */
  sluitTrackUit(trackId) {
    return this.trackStore.update(trackId, { uitgeslotenDoorBeheerder: true });
  }

  /** Maakt een handmatige uitsluiting weer ongedaan (FR-12b). */
  hefUitsluitingOp(trackId) {
    return this.trackStore.update(trackId, { uitgeslotenDoorBeheerder: false });
  }

  /**
   * Verrijkt elke track van een afspeellijst met de gekoppelde artiest én de
   * afgeleide velden compleet/selecteerbaar — handig voor het beheer- en
   * bewerk-scherm.
   */
  tracksMetStatus(playlistId) {
    return this.trackStore.byPlaylist(playlistId).map((track) => {
      const artiest = this.artiestStore.findById(track.artiestId);
      return {
        ...track,
        artiest,
        compleet: isCompleet(track, artiest),
        selecteerbaar: isSelecteerbaar(track, artiest),
      };
    });
  }

  /** Alleen de nummers die daadwerkelijk in een ronde gekozen mogen worden (FR-12a/12b). */
  selecteerbareTracks(playlistId) {
    return this.tracksMetStatus(playlistId).filter((t) => t.selecteerbaar);
  }
}

module.exports = {
  PlaylistImportService,
};
