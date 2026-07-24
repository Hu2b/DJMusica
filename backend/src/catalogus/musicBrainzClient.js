/**
 * MusicBrainz-client (FR-28, FR-28a)
 * ----------------------------------
 * Zoekt het land van herkomst van een artiest op via de gratis MusicBrainz-API.
 * Geen account of API-sleutel nodig; wel een nette User-Agent (verplicht) en
 * rustig aan met het aantal aanvragen (we cachen per artiest, dus dat komt goed).
 *
 * Geeft terug: { land, zekerheid } waarbij:
 *  - `zekerheid` het MusicBrainz-matchpercentage is (0-100),
 *  - `land` de canonieke landnaam is (via de ISO-code), of null als onbekend.
 *
 * De netwerk-aanroep zit achter een injecteerbare `httpGetJson`, zodat tests
 * geen echte MusicBrainz-aanvragen doen.
 */

const { landVoorCode } = require('./landen');

const MB_ENDPOINT = 'https://musicbrainz.org/ws/2/artist/';
const USER_AGENT = 'DJMusica/0.1 (https://djmusica.fun)';

async function defaultHttpGetJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`MusicBrainz gaf status ${res.status}`);
  }
  return res.json();
}

class MusicBrainzClient {
  constructor({ httpGetJson = defaultHttpGetJson } = {}) {
    this.httpGetJson = httpGetJson;
  }

  /**
   * @param {object} input
   * @param {string} input.naam - artiestnaam
   * @returns {Promise<{ land: string|null, zekerheid: number }>}
   */
  async lookupArtistCountry({ naam }) {
    const query = encodeURIComponent(`artist:"${String(naam ?? '').replace(/"/g, '')}"`);
    const url = `${MB_ENDPOINT}?query=${query}&fmt=json&limit=1`;

    const data = await this.httpGetJson(url);
    const beste = data && Array.isArray(data.artists) ? data.artists[0] : null;
    if (!beste) return { land: null, zekerheid: 0 };

    const zekerheid = typeof beste.score === 'number' ? beste.score : 0;

    // MusicBrainz levert het land als "country" (ISO-code) of via het "area"-veld.
    const code =
      beste.country ||
      (beste.area &&
        beste.area['iso-3166-1-codes'] &&
        beste.area['iso-3166-1-codes'][0]) ||
      null;

    return { land: code ? landVoorCode(code) : null, zekerheid };
  }
}

module.exports = {
  MusicBrainzClient,
  MB_ENDPOINT,
  USER_AGENT,
};
