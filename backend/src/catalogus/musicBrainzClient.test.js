const { MusicBrainzClient } = require('./musicBrainzClient');

// Unit tests voor de MusicBrainz-client. De netwerk-aanroep is gemockt, dus er
// gaat NOOIT een echte aanvraag naar MusicBrainz.

function clientMetAntwoord(json) {
  let laatsteUrl = null;
  const httpGetJson = async (url) => {
    laatsteUrl = url;
    return json;
  };
  const client = new MusicBrainzClient({ httpGetJson });
  return { client, urlVan: () => laatsteUrl };
}

describe('MusicBrainzClient', () => {
  test('vertaalt de landcode uit "country" naar een canonieke naam + zekerheid', async () => {
    const { client } = clientMetAntwoord({
      artists: [{ score: 98, country: 'GB' }],
    });
    const r = await client.lookupArtistCountry({ naam: 'Coldplay' });
    expect(r).toEqual({ land: 'United Kingdom', zekerheid: 98 });
  });

  test('gebruikt het "area"-veld als "country" ontbreekt', async () => {
    const { client } = clientMetAntwoord({
      artists: [{ score: 96, area: { 'iso-3166-1-codes': ['NL'] } }],
    });
    const r = await client.lookupArtistCountry({ naam: 'Kensington' });
    expect(r).toEqual({ land: 'Netherlands', zekerheid: 96 });
  });

  test('geeft land null als er geen land in het resultaat zit', async () => {
    const { client } = clientMetAntwoord({ artists: [{ score: 80 }] });
    const r = await client.lookupArtistCountry({ naam: 'Onbekend' });
    expect(r).toEqual({ land: null, zekerheid: 80 });
  });

  test('geeft zekerheid 0 als er geen enkele match is', async () => {
    const { client } = clientMetAntwoord({ artists: [] });
    const r = await client.lookupArtistCountry({ naam: 'Niksbestaat' });
    expect(r).toEqual({ land: null, zekerheid: 0 });
  });

  test('stelt een nette zoek-URL samen met de artiestnaam', async () => {
    const { client, urlVan } = clientMetAntwoord({ artists: [] });
    await client.lookupArtistCountry({ naam: 'a-ha' });
    expect(urlVan()).toContain('musicbrainz.org/ws/2/artist/');
    expect(urlVan()).toContain('fmt=json');
    expect(decodeURIComponent(urlVan())).toContain('a-ha');
  });
});
