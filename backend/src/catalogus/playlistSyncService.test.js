const { createCatalogusHarness } = require('./testSupport');

// Integratietests voor STAP 2c: het "ververs"-mechanisme (FR-31, FR-28b).
// Gebaseerd op testset.md §4 "Playlist verversen detecteert wijzigingen" en
// "Inactieve nummers worden niet meer gekozen".

const PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M';
const URL = `https://open.spotify.com/playlist/${PLAYLIST_ID}`;
const BEHEERDER = 'beheerder-1';

function beginTracks() {
  return [
    { spotifyTrackUri: 'spotify:track:yellow', titel: 'Yellow', artiestNaam: 'Coldplay', jaar: 2000 },
    { spotifyTrackUri: 'spotify:track:fixyou', titel: 'Fix You', artiestNaam: 'Coldplay', jaar: 2005 },
    { spotifyTrackUri: 'spotify:track:takeonme', titel: 'Take On Me', artiestNaam: 'a-ha', jaar: 1985 },
  ];
}

const musicBrainzData = {
  Coldplay: { land: 'Verenigd Koninkrijk', zekerheid: 98 },
  'a-ha': { land: 'Noorwegen', zekerheid: 96 },
  'Daft Punk': { land: 'Frankrijk', zekerheid: 97 },
};

async function verseHarness() {
  const spotifyData = { [PLAYLIST_ID]: { naam: 'Mix', tracks: beginTracks() } };
  const h = createCatalogusHarness({ spotifyData, musicBrainzData });
  const { playlistId } = await h.service.importPlaylist({ url: URL, beheerderUserId: BEHEERDER });
  await h.verrijking.verrijkAlleOnbekende(); // Coldplay + a-ha krijgen hun land
  return { h, playlistId };
}

/** Telt hoe vaak (en voor wie) MusicBrainz wordt bevraagd. */
function telMusicBrainz(h) {
  const origineel = h.musicBrainzClient.lookupArtistCountry.bind(h.musicBrainzClient);
  const calls = [];
  h.musicBrainzClient.lookupArtistCountry = async (arg) => {
    calls.push(arg.naam);
    return origineel(arg);
  };
  return calls;
}

describe('PlaylistSyncService - verversen (FR-31)', () => {
  test('nieuwe nummers toegevoegd, verdwenen nummers op inactief, bekend land hergebruikt', async () => {
    const { h, playlistId } = await verseHarness();
    const mbCalls = telMusicBrainz(h);

    // In Spotify: "Fix You" verwijderd; "Clocks" (Coldplay) en "Get Lucky" (Daft Punk) toegevoegd.
    h.spotifyClient.data[PLAYLIST_ID].tracks = [
      { spotifyTrackUri: 'spotify:track:yellow', titel: 'Yellow', artiestNaam: 'Coldplay', jaar: 2000 },
      { spotifyTrackUri: 'spotify:track:takeonme', titel: 'Take On Me', artiestNaam: 'a-ha', jaar: 1985 },
      { spotifyTrackUri: 'spotify:track:clocks', titel: 'Clocks', artiestNaam: 'Coldplay', jaar: 2002 },
      { spotifyTrackUri: 'spotify:track:getlucky', titel: 'Get Lucky', artiestNaam: 'Daft Punk', jaar: 2013 },
    ];

    const resultaat = await h.sync.verversPlaylist(playlistId);

    expect(resultaat.toegevoegd).toBe(2);
    expect(resultaat.inactiefGezet).toBe(1);

    // Alleen de nieuwe, onbekende artiest (Daft Punk) is bij MusicBrainz opgezocht;
    // Coldplay (al bekend) NIET opnieuw.
    expect(mbCalls).toEqual(['Daft Punk']);

    // "Fix You" staat nu op inactief en is niet meer selecteerbaar.
    const fixYou = h.trackStore.findByUri(playlistId, 'spotify:track:fixyou');
    expect(fixYou.actief).toBe(false);
    const selecteerbareTitels = h.service.selecteerbareTracks(playlistId).map((t) => t.titel).sort();
    expect(selecteerbareTitels).not.toContain('Fix You');
    // Het nieuwe Coldplay-nummer hergebruikt het land en is direct selecteerbaar.
    expect(selecteerbareTitels).toContain('Clocks');
    expect(selecteerbareTitels).toContain('Get Lucky');
  });

  test('een nieuw nummer van een al bekende artiest wordt niet opnieuw bij MusicBrainz bevraagd', async () => {
    const { h, playlistId } = await verseHarness();
    const mbCalls = telMusicBrainz(h);

    h.spotifyClient.data[PLAYLIST_ID].tracks.push({
      spotifyTrackUri: 'spotify:track:clocks',
      titel: 'Clocks',
      artiestNaam: 'Coldplay',
      jaar: 2002,
    });

    await h.sync.verversPlaylist(playlistId);
    expect(mbCalls).toEqual([]); // geen enkele MusicBrainz-aanroep
  });

  test('een eerder verdwenen nummer wordt heractiveerd als het terugkomt', async () => {
    const { h, playlistId } = await verseHarness();

    // "Fix You" verdwijnt...
    h.spotifyClient.data[PLAYLIST_ID].tracks = beginTracks().filter((t) => t.titel !== 'Fix You');
    await h.sync.verversPlaylist(playlistId);
    expect(h.trackStore.findByUri(playlistId, 'spotify:track:fixyou').actief).toBe(false);

    // ...en komt later weer terug.
    h.spotifyClient.data[PLAYLIST_ID].tracks = beginTracks();
    const resultaat = await h.sync.verversPlaylist(playlistId);
    expect(resultaat.opnieuwActief).toBe(1);
    expect(h.trackStore.findByUri(playlistId, 'spotify:track:fixyou').actief).toBe(true);
  });

  test('een handmatig ingevuld land wordt bij verversen nooit opnieuw bevraagd (FR-28b/FR-31)', async () => {
    const { h, playlistId } = await verseHarness();
    // Beheerder overschrijft Coldplay handmatig.
    h.verrijking.zetLandHandmatig(h.artiestStore.findByNaam('Coldplay').id, 'België');

    // Elke MusicBrainz-aanroep zou nu een fout geven.
    h.musicBrainzClient.lookupArtistCountry = async () => {
      throw new Error('Had geen MusicBrainz-aanroep mogen zijn');
    };

    // Nieuw Coldplay-nummer toevoegen en verversen mag niet crashen...
    h.spotifyClient.data[PLAYLIST_ID].tracks.push({
      spotifyTrackUri: 'spotify:track:clocks',
      titel: 'Clocks',
      artiestNaam: 'Coldplay',
      jaar: 2002,
    });
    await expect(h.sync.verversPlaylist(playlistId)).resolves.toBeDefined();
    // ...en het handmatige land blijft staan.
    expect(h.artiestStore.findByNaam('Coldplay').land).toBe('België');
  });

  test('na het verwijderen van een land wordt het bij de volgende verversing opnieuw opgezocht (FR-28b)', async () => {
    const { h, playlistId } = await verseHarness();
    const coldplay = h.artiestStore.findByNaam('Coldplay');
    expect(h.artiestStore.findById(coldplay.id).land).toBe('Verenigd Koninkrijk');

    // Beheerder verwijdert het land...
    h.verrijking.verwijderLand(coldplay.id);

    // ...en een verversing (zonder Spotify-wijzigingen) zoekt het opnieuw op.
    const resultaat = await h.sync.verversPlaylist(playlistId);
    expect(h.artiestStore.findById(coldplay.id).land).toBe('Verenigd Koninkrijk');
    expect(resultaat.verrijkt.some((v) => v.naam === 'Coldplay' && v.status === 'AUTO_INGEVULD')).toBe(true);
  });

  test('verversen van een onbekende afspeellijst geeft een nette fout', async () => {
    const { h } = await verseHarness();
    await expect(h.sync.verversPlaylist('bestaat-niet')).rejects.toMatchObject({ code: 'NIET_GEVONDEN' });
  });
});
