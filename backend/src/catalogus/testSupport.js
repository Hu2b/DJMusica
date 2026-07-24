/**
 * Test-hulpmiddelen voor de catalogus (afspeellijsten/tracks/artiesten).
 * Nep-versie van Spotify, zodat tests draaien zonder echte Spotify-aanroepen.
 * Dit bestand bevat geen tests zelf.
 */

const { InMemoryPlaylistStore } = require('./playlistStore');
const { InMemoryTrackStore } = require('./trackStore');
const { InMemoryArtiestStore } = require('./artiestStore');
const { PlaylistImportService } = require('./playlistImportService');
const { VerrijkingService } = require('./verrijkingService');
const { PlaylistSyncService } = require('./playlistSyncService');

/** Nep-MusicBrainz: een map van artiestnaam -> { land, zekerheid }. */
function createFakeMusicBrainzClient(byNaam = {}) {
  // Normaliseer de sleutels naar kleine letters voor makkelijk opzoeken.
  const genormaliseerd = {};
  for (const [naam, waarde] of Object.entries(byNaam)) {
    genormaliseerd[naam.trim().toLowerCase()] = waarde;
  }
  return {
    byNaam: genormaliseerd,
    async lookupArtistCountry({ naam }) {
      return genormaliseerd[String(naam).trim().toLowerCase()] || { land: null, zekerheid: 0 };
    },
  };
}

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

function createCatalogusHarness({ spotifyData = {}, musicBrainzData = {} } = {}) {
  const playlistStore = new InMemoryPlaylistStore();
  const trackStore = new InMemoryTrackStore();
  const artiestStore = new InMemoryArtiestStore();
  const spotifyClient = createFakeSpotifyClient(spotifyData);
  const musicBrainzClient = createFakeMusicBrainzClient(musicBrainzData);

  const service = new PlaylistImportService({
    spotifyClient,
    playlistStore,
    trackStore,
    artiestStore,
  });

  const verrijking = new VerrijkingService({ musicBrainzClient, artiestStore });

  const sync = new PlaylistSyncService({
    spotifyClient,
    playlistStore,
    trackStore,
    artiestStore,
    verrijking,
  });

  return {
    service,
    verrijking,
    sync,
    playlistStore,
    trackStore,
    artiestStore,
    spotifyClient,
    musicBrainzClient,
  };
}

module.exports = {
  createFakeSpotifyClient,
  createFakeMusicBrainzClient,
  createCatalogusHarness,
};
