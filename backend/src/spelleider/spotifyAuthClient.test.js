const { SpotifyAuthClient, TOKEN_ENDPOINT } = require('./spotifyAuthClient');

// Unit tests voor de validatietest van Spotify-credentials (FR-37).
// De netwerk-aanroep is gemockt: er gaat nooit een echte aanvraag naar Spotify.

describe('SpotifyAuthClient.testCredentials (FR-37)', () => {
  test('geldige credentials (token terug) -> ok', async () => {
    let laatste = null;
    const client = new SpotifyAuthClient({
      httpPost: async (url, opts) => {
        laatste = { url, opts };
        return { status: 200, ok: true, json: { access_token: 'abc', token_type: 'Bearer' } };
      },
    });
    const r = await client.testCredentials({ clientId: 'id', clientSecret: 'secret' });
    expect(r.ok).toBe(true);
    expect(laatste.url).toBe(TOKEN_ENDPOINT);
    // De client verstuurt een Basic-Authorization-header (geen geheim in de body).
    expect(laatste.opts.headers.Authorization).toMatch(/^Basic /);
  });

  test('ongeldige credentials (401) -> niet ok', async () => {
    const client = new SpotifyAuthClient({
      httpPost: async () => ({ status: 401, ok: false, json: { error: 'invalid_client' } }),
    });
    const r = await client.testCredentials({ clientId: 'id', clientSecret: 'fout' });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('ONGELDIGE_CREDENTIALS');
  });

  test('ontbrekende invoer -> niet ok, zonder netwerk-aanroep', async () => {
    let aangeroepen = false;
    const client = new SpotifyAuthClient({
      httpPost: async () => {
        aangeroepen = true;
        return { status: 200, ok: true, json: {} };
      },
    });
    const r = await client.testCredentials({ clientId: '', clientSecret: '' });
    expect(r.ok).toBe(false);
    expect(aangeroepen).toBe(false);
  });
});
