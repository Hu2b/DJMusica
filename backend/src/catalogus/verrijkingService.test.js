const { createCatalogusHarness } = require('./testSupport');

// Integratietests voor STAP 2b: land per artiest via MusicBrainz (FR-28, 28a, 28b).
// Gebaseerd op testset.md §4 "Land van herkomst per artiest".

const PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M';
const URL = `https://open.spotify.com/playlist/${PLAYLIST_ID}`;

const spotifyData = {
  [PLAYLIST_ID]: {
    naam: 'Mix',
    tracks: [
      { spotifyTrackUri: 'spotify:track:c1', titel: 'Yellow', artiestNaam: 'Coldplay', jaar: 2000 },
      { spotifyTrackUri: 'spotify:track:c2', titel: 'Fix You', artiestNaam: 'Coldplay', jaar: 2005 },
      { spotifyTrackUri: 'spotify:track:h1', titel: 'Take On Me', artiestNaam: 'a-ha', jaar: 1985 },
      { spotifyTrackUri: 'spotify:track:v1', titel: 'Vaag', artiestNaam: 'Vage Band', jaar: 2010 },
    ],
  },
};

// Coldplay: hoge zekerheid; a-ha: hoge zekerheid; Vage Band: te lage zekerheid.
// Namen in het Nederlands, zoals de echte MusicBrainz-client ze ook zou opleveren.
const musicBrainzData = {
  Coldplay: { land: 'Verenigd Koninkrijk', zekerheid: 98 },
  'a-ha': { land: 'Noorwegen', zekerheid: 96 },
  'Vage Band': { land: 'Frankrijk', zekerheid: 80 },
};

async function harnessMetImport() {
  const h = createCatalogusHarness({ spotifyData, musicBrainzData });
  const { playlistId } = await h.service.importPlaylist({ url: URL, beheerderUserId: 'beheerder-1' });
  return { h, playlistId };
}

describe('VerrijkingService (FR-28, 28a, 28b)', () => {
  test('land wordt automatisch overgenomen bij hoge zekerheid (>= 95%) en geldt voor alle nummers', async () => {
    const { h, playlistId } = await harnessMetImport();

    await h.verrijking.verrijkAlleOnbekende();

    const coldplay = h.artiestStore.findByNaam('Coldplay');
    expect(coldplay.land).toBe('Verenigd Koninkrijk');
    expect(coldplay.landMatchZekerheid).toBe(98);
    expect(coldplay.landHandmatigIngevuld).toBe(false);

    // Beide Coldplay-nummers zijn nu compleet/selecteerbaar.
    const selecteerbaar = h.service.selecteerbareTracks(playlistId).map((t) => t.titel).sort();
    expect(selecteerbaar).toEqual(['Fix You', 'Take On Me', 'Yellow']);
  });

  test('een onzekere match (< 95%) wordt NIET automatisch overgenomen; land blijft leeg', async () => {
    const { h } = await harnessMetImport();
    await h.verrijking.verrijkAlleOnbekende();

    const vage = h.artiestStore.findByNaam('Vage Band');
    expect(vage.land).toBeNull();
  });

  test('land wordt één keer per artiest bepaald; een bekende artiest wordt niet opnieuw bevraagd (FR-31)', async () => {
    const { h } = await harnessMetImport();
    await h.verrijking.verrijkAlleOnbekende();

    // Maak elke volgende MusicBrainz-aanroep kapot: als er tóch bevraagd wordt, faalt de test.
    h.musicBrainzClient.lookupArtistCountry = async () => {
      throw new Error('Er had geen MusicBrainz-aanroep mogen zijn');
    };

    const coldplay = h.artiestStore.findByNaam('Coldplay');
    const resultaat = await h.verrijking.verrijkArtiest(coldplay.id);
    expect(resultaat.status).toBe('AL_BEKEND');
  });

  test('handmatige invoer krijgt 100% zekerheid en wordt niet overschreven door een volgende verrijking (FR-28b)', async () => {
    const { h } = await harnessMetImport();
    const vage = h.artiestStore.findByNaam('Vage Band');

    h.verrijking.zetLandHandmatig(vage.id, 'Nederland');
    let na = h.artiestStore.findById(vage.id);
    expect(na.land).toBe('Nederland');
    expect(na.landMatchZekerheid).toBe(100);
    expect(na.landHandmatigIngevuld).toBe(true);

    // Nog een verrijkingsronde mag dit handmatige land niet aanraken.
    await h.verrijking.verrijkAlleOnbekende();
    na = h.artiestStore.findById(vage.id);
    expect(na.land).toBe('Nederland');
    expect(na.landHandmatigIngevuld).toBe(true);
  });

  test('een land buiten de vaste lijst wordt geweigerd (FR-28c)', async () => {
    const { h } = await harnessMetImport();
    const vage = h.artiestStore.findByNaam('Vage Band');
    expect(() => h.verrijking.zetLandHandmatig(vage.id, 'Verzonnenland')).toThrow(/landenlijst/i);
  });

  test('land verwijderen zet de artiest terug op onbekend en triggert een nieuwe opzoeking', async () => {
    const { h } = await harnessMetImport();
    await h.verrijking.verrijkAlleOnbekende();

    const coldplay = h.artiestStore.findByNaam('Coldplay');
    expect(h.artiestStore.findById(coldplay.id).land).toBe('Verenigd Koninkrijk');

    // Beheerder verwijdert het land...
    h.verrijking.verwijderLand(coldplay.id);
    expect(h.artiestStore.findById(coldplay.id).land).toBeNull();

    // ...en een volgende verrijking zoekt het opnieuw op via MusicBrainz.
    const resultaat = await h.verrijking.verrijkArtiest(coldplay.id);
    expect(resultaat.status).toBe('AUTO_INGEVULD');
    expect(h.artiestStore.findById(coldplay.id).land).toBe('Verenigd Koninkrijk');
  });
});
