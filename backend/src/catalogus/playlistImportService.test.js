const { createCatalogusHarness } = require('./testSupport');

// Integratietests voor STAP 2a: afspeellijst inladen (FR-5a, FR-30, FR-12a/12b).
// Gebaseerd op testset.md §4 "Beheerder beheert afspeellijsten".

const PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M';
const URL = `https://open.spotify.com/playlist/${PLAYLIST_ID}`;
const BEHEERDER = 'beheerder-1';

// Voorbeeld-playlist met o.a. twee nummers van dezelfde artiest (Toto),
// en één nummer zonder jaar.
const spotifyData = {
  [PLAYLIST_ID]: {
    naam: 'Jaren 80 Hits',
    tracks: [
      { spotifyTrackUri: 'spotify:track:a1', titel: 'Africa', artiestNaam: 'Toto', jaar: 1982, spotifyArtistId: 'art-toto' },
      { spotifyTrackUri: 'spotify:track:a2', titel: 'Rosanna', artiestNaam: 'Toto', jaar: 1982, spotifyArtistId: 'art-toto' },
      { spotifyTrackUri: 'spotify:track:a3', titel: 'Take On Me', artiestNaam: 'a-ha', jaar: 1985, spotifyArtistId: 'art-aha' },
      { spotifyTrackUri: 'spotify:track:a4', titel: 'Onbekend jaar', artiestNaam: 'Mystery', jaar: null, spotifyArtistId: null },
    ],
  },
};

describe('PlaylistImportService - importeren (FR-5a, FR-30)', () => {
  test('afspeellijst toevoegen via URL haalt de nummers op en zet ze in het aanbod', async () => {
    const h = createCatalogusHarness({ spotifyData });

    const resultaat = await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });

    expect(resultaat.naam).toBe('Jaren 80 Hits');
    expect(resultaat.aantalTracks).toBe(4);
    // De afspeellijst staat nu in het aanbod voor spelleiders.
    expect(h.playlistStore.all()).toHaveLength(1);
    expect(h.trackStore.byPlaylist(resultaat.playlistId)).toHaveLength(4);
  });

  test('dezelfde artiest wordt maar één keer aangemaakt (FR-28)', async () => {
    const h = createCatalogusHarness({ spotifyData });
    await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });

    // Toto, a-ha, Mystery = 3 unieke artiesten (niet 4, want Toto komt 2x voor).
    expect(h.artiestStore.all()).toHaveLength(3);
    expect(h.artiestStore.findByNaam('Toto')).not.toBeNull();
  });

  test('een al toegevoegde afspeellijst wordt niet nog een keer toegevoegd', async () => {
    const h = createCatalogusHarness({ spotifyData });
    await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });

    await expect(
      h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER })
    ).rejects.toMatchObject({ code: 'AL_TOEGEVOEGD' });
  });

  test('een ongeldige URL wordt geweigerd', async () => {
    const h = createCatalogusHarness({ spotifyData });
    await expect(
      h.service.importPlaylist({ url: 'https://voorbeeld.nl/nietspotify', beheerderUserId: BEHEERDER })
    ).rejects.toThrow();
  });
});

describe('PlaylistImportService - compleetheid & selecteerbaarheid (FR-12a/12b)', () => {
  test('zonder land van de artiest is een nummer nog niet selecteerbaar (FR-12a)', async () => {
    const h = createCatalogusHarness({ spotifyData });
    const { playlistId } = await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });

    // Direct na import kent nog geen enkele artiest een land -> niets selecteerbaar.
    expect(h.service.selecteerbareTracks(playlistId)).toHaveLength(0);
  });

  test('zodra de artiest een land krijgt, wordt het nummer selecteerbaar', async () => {
    const h = createCatalogusHarness({ spotifyData });
    const { playlistId } = await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });

    // Vul het land van Toto in (dit gebeurt straks netjes via stap 2b).
    const toto = h.artiestStore.findByNaam('Toto');
    h.artiestStore.update(toto.id, { land: 'Verenigde Staten' });

    const selecteerbaar = h.service.selecteerbareTracks(playlistId);
    // Africa en Rosanna (beide van Toto, met jaar) zijn nu selecteerbaar.
    const titels = selecteerbaar.map((t) => t.titel).sort();
    expect(titels).toEqual(['Africa', 'Rosanna']);
  });

  test('een nummer zonder jaar blijft geblokkeerd, ook al heeft de artiest een land', async () => {
    const h = createCatalogusHarness({ spotifyData });
    const { playlistId } = await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });

    const mystery = h.artiestStore.findByNaam('Mystery');
    h.artiestStore.update(mystery.id, { land: 'Verenigd Koninkrijk' });

    const mysteryTrack = h.service
      .tracksMetStatus(playlistId)
      .find((t) => t.titel === 'Onbekend jaar');
    expect(mysteryTrack.compleet).toBe(false);
    expect(mysteryTrack.selecteerbaar).toBe(false);
  });

  test('beheerder sluit een nummer handmatig uit en maakt dat weer ongedaan (FR-12b)', async () => {
    const h = createCatalogusHarness({ spotifyData });
    const { playlistId } = await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });
    h.artiestStore.update(h.artiestStore.findByNaam('a-ha').id, { land: 'Noorwegen' });

    const takeOnMe = h.service.tracksMetStatus(playlistId).find((t) => t.titel === 'Take On Me');
    expect(takeOnMe.selecteerbaar).toBe(true);

    h.service.sluitTrackUit(takeOnMe.id);
    expect(
      h.service.tracksMetStatus(playlistId).find((t) => t.titel === 'Take On Me').selecteerbaar
    ).toBe(false);

    h.service.hefUitsluitingOp(takeOnMe.id);
    expect(
      h.service.tracksMetStatus(playlistId).find((t) => t.titel === 'Take On Me').selecteerbaar
    ).toBe(true);
  });
});

describe('PlaylistImportService - verwijderen (FR-5a)', () => {
  test('een afspeellijst verwijderen haalt hem én zijn nummers weg uit het aanbod', async () => {
    const h = createCatalogusHarness({ spotifyData });
    const { playlistId } = await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });

    const resultaat = h.service.deletePlaylist(playlistId);

    expect(resultaat.ok).toBe(true);
    expect(resultaat.verwijderdeTracks).toBe(4);
    expect(h.playlistStore.all()).toHaveLength(0);
    expect(h.trackStore.byPlaylist(playlistId)).toHaveLength(0);
  });
});
