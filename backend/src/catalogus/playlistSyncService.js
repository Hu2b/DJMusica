/**
 * Playlist Sync Service — "verversen" (FR-31)
 * -------------------------------------------
 * De beheerder klikt op "verversen"; deze service haalt de afspeellijst opnieuw
 * op bij Spotify en synchroniseert:
 *  - Nieuwe nummers worden toegevoegd (titel/artiest/jaar via Spotify).
 *    - Van een al bekende artiest (land al vastgelegd) wordt dat land automatisch
 *      hergebruikt — géén nieuwe MusicBrainz-aanroep.
 *    - Van een nog onbekende artiest wordt het land opgezocht via MusicBrainz.
 *  - Nummers die uit de Spotify-afspeellijst zijn verdwenen, worden op "inactief"
 *    gezet (niet verwijderd), zodat afspeelhistorie/statistieken intact blijven en
 *    ze niet meer in nieuwe rondes gekozen worden.
 *  - Een nummer dat eerder verdwenen was maar weer terug is, wordt heractiveerd.
 *  - Artiesten met een al bekend land (handmatig of automatisch) worden nooit
 *    opnieuw bevraagd, om rate limits te sparen. Alleen artiesten zónder land
 *    (nieuw, of waarvan de beheerder het land net heeft verwijderd) worden
 *    opgezocht.
 *
 * De land-opzoeking hergebruikt de VerrijkingService (die al de 95%-regel en de
 * "sla bekende artiesten over"-logica bevat).
 */

class PlaylistSyncService {
  /**
   * @param {object} deps
   * @param {object} deps.spotifyClient
   * @param {object} deps.playlistStore
   * @param {object} deps.trackStore
   * @param {object} deps.artiestStore
   * @param {object} deps.verrijking - VerrijkingService (voor land-opzoeking)
   */
  constructor({ spotifyClient, playlistStore, trackStore, artiestStore, verrijking }) {
    this.spotifyClient = spotifyClient;
    this.playlistStore = playlistStore;
    this.trackStore = trackStore;
    this.artiestStore = artiestStore;
    this.verrijking = verrijking;
  }

  /**
   * Ververst één afspeellijst tegen de huidige Spotify-inhoud.
   * @param {string} playlistId
   * @returns {Promise<{ toegevoegd, opnieuwActief, inactiefGezet, verrijkt }>}
   */
  async verversPlaylist(playlistId) {
    const playlist = this.playlistStore.findById(playlistId);
    if (!playlist) {
      const err = new Error('PlaylistSyncService: onbekende afspeellijst');
      err.code = 'NIET_GEVONDEN';
      throw err;
    }

    const data = await this.spotifyClient.getPlaylist(playlist.spotifyPlaylistId);
    const spotifyUris = new Set(data.tracks.map((t) => t.spotifyTrackUri));

    let toegevoegd = 0;
    let opnieuwActief = 0;
    let inactiefGezet = 0;

    // 1. Nieuwe nummers toevoegen, of eerder verdwenen nummers heractiveren.
    for (const t of data.tracks) {
      const bestaand = this.trackStore.findByUri(playlistId, t.spotifyTrackUri);
      if (bestaand) {
        if (bestaand.actief === false) {
          this.trackStore.update(bestaand.id, { actief: true });
          opnieuwActief += 1;
        }
        continue;
      }
      const artiest = this.artiestStore.findOrCreateByNaam(t.artiestNaam, {
        spotifyArtistId: t.spotifyArtistId ?? null,
      });
      this.trackStore.create({
        playlistId,
        spotifyTrackUri: t.spotifyTrackUri,
        titel: t.titel,
        artiestId: artiest.id,
        jaar: t.jaar ?? null,
      });
      toegevoegd += 1;
    }

    // 2. Nummers die niet meer in de Spotify-playlist staan -> inactief (niet verwijderen).
    for (const track of this.trackStore.byPlaylist(playlistId)) {
      if (!spotifyUris.has(track.spotifyTrackUri) && track.actief !== false) {
        this.trackStore.update(track.id, { actief: false });
        inactiefGezet += 1;
      }
    }

    // 3. Land opzoeken voor artiesten zónder land die (nog) in de playlist zitten.
    //    Artiesten mét land (bekend of handmatig) slaat verrijkArtiest over (FR-31).
    const referentieArtiesten = new Set(
      this.trackStore
        .byPlaylist(playlistId)
        .filter((t) => t.actief !== false)
        .map((t) => t.artiestId)
    );
    const verrijkt = [];
    for (const artiestId of referentieArtiesten) {
      const artiest = this.artiestStore.findById(artiestId);
      if (artiest && !artiest.land) {
        const r = await this.verrijking.verrijkArtiest(artiestId);
        verrijkt.push({ artiestId, naam: artiest.naam, ...r });
      }
    }

    return { toegevoegd, opnieuwActief, inactiefGezet, verrijkt };
  }
}

module.exports = {
  PlaylistSyncService,
};
