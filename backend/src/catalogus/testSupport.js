/**
 * Test-hulpmiddelen voor de catalogus (afspeellijsten/tracks/artiesten).
 * Nep-versie van Spotify, zodat tests draaien zonder echte Spotify-aanroepen.
 * Dit bestand bevat geen tests zelf.
 */

const { InMemoryPlaylistStore } = require('./playlistStore');
const { InMemoryTrackStore } = require('./trackStore');
const { InMemoryArtiestStore } = require('./artiestStore');
const { PlaylistImportService } = require('./playlistImportService');

/**
 * Nep Spotify-client. `data` is een map: playlistId -> { naam, tracks[] }.
 * De data is aanpasbaar tijdens een test (nodig om in stap 2c een "ververs" te
 * simuleren: nummers toevoegen/verwijderen in Spotify).
 *
 * Elke track: { spotifyTrackUri, titel, artiestNaam, jaar, spotifyArtistId? }.
 */
function createFakeSpotifyClient(data = {}) {
  return {
    data,
    async getPlaylist(playlistId) {
      const p = data[playlistId];
      if (!p) {
        const err = new Error(`Fake Spotify: onbekende playlist "${playlistId}"`);
        err.code = 'NIET_GEVONDEN';
        throw err;
      }
      return { naam: p.naam, tracks: p.tracks.map((t) => ({ ...t })) };
    },
  };
}

function createCatalogusHarness({ spotifyData = {} } = {}) {
  const playlistStore = new InMemoryPlaylistStore();
  const trackStore = new InMemoryTrackStore();
  const artiestStore = new InMemoryArtiestStore();
  const spotifyClient = createFakeSpotifyClient(spotifyData);

  const service = new PlaylistImportService({
    spotifyClient,
    playlistStore,
    trackStore,
    artiestStore,
  });

  return { service, playlistStore, trackStore, artiestStore, spotifyClient };
}

module.exports = {
  createFakeSpotifyClient,
  createCatalogusHarness,
};
