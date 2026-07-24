/**
 * Spotify-authenticatie-client — validatietest (FR-37)
 * ----------------------------------------------------
 * Controleert of een ingevoerde Client ID + Client Secret echt werken, door een
 * "client credentials"-token op te vragen bij Spotify. Lukt dat, dan zijn de
 * gegevens geldig en kan de koppeling worden opgeslagen. Zo krijgt de spelleider
 * meteen bevestiging dat de koppeling werkt (de "directe validatietest" uit FR-37).
 *
 * De netwerk-aanroep zit achter een injecteerbare `httpPost`, zodat tests geen
 * echte Spotify-aanroepen doen.
 */

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

async function defaultHttpPost(url, { headers, body }) {
  const res = await fetch(url, { method: 'POST', headers, body });
  const tekst = await res.text();
  let json = {};
  try {
    json = tekst ? JSON.parse(tekst) : {};
  } catch {
    json = {};
  }
  return { status: res.status, ok: res.ok, json };
}

class SpotifyAuthClient {
  constructor({ httpPost = defaultHttpPost } = {}) {
    this.httpPost = httpPost;
  }

  /**
   * @param {object} input
   * @param {string} input.clientId
   * @param {string} input.clientSecret
   * @returns {Promise<{ ok: boolean, reden?: string }>}
   */
  async testCredentials({ clientId, clientSecret }) {
    if (!clientId || !clientSecret) {
      return { ok: false, reden: 'ONTBREEKT' };
    }
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const resultaat = await this.httpPost(TOKEN_ENDPOINT, {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (resultaat.ok && resultaat.json && resultaat.json.access_token) {
      return { ok: true };
    }
    // Spotify geeft bij verkeerde gegevens meestal 400/401.
    return { ok: false, reden: 'ONGELDIGE_CREDENTIALS' };
  }
}

module.exports = {
  SpotifyAuthClient,
  TOKEN_ENDPOINT,
};
