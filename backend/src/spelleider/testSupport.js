/**
 * Test-hulpmiddelen voor de Spotify-koppeling. Nep-Spotify-authenticatie zodat
 * tests geen echte Spotify-aanroepen doen. Bevat geen tests zelf.
 */

const { InMemoryUserStore } = require('../auth/userStore');
const { InMemorySpotifyAppStore } = require('./spotifyAppStore');
const { SpotifyKoppelingService } = require('./spotifyKoppelingService');

/**
 * Nep Spotify-auth-client. `geldig` bepaalt of testCredentials slaagt; met
 * `geldigeParen` kun je specifieke Client ID/Secret-combinaties geldig maken.
 */
function createFakeSpotifyAuthClient({ geldig = true, geldigeParen = null } = {}) {
  const calls = [];
  return {
    calls,
    async testCredentials({ clientId, clientSecret }) {
      calls.push({ clientId, clientSecret });
      if (!clientId || !clientSecret) return { ok: false, reden: 'ONTBREEKT' };
      if (geldigeParen) {
        const ok = geldigeParen.some((p) => p.clientId === clientId && p.clientSecret === clientSecret);
        return ok ? { ok: true } : { ok: false, reden: 'ONGELDIGE_CREDENTIALS' };
      }
      return geldig ? { ok: true } : { ok: false, reden: 'ONGELDIGE_CREDENTIALS' };
    },
  };
}

const TEST_SLEUTEL = 'test-encryptiesleutel-djmusica';

function createSpelleiderHarness({ authOpts = {}, now = () => 1_700_000_000_000 } = {}) {
  const userStore = new InMemoryUserStore({ now });
  const spotifyAppStore = new InMemorySpotifyAppStore({ now });
  const spotifyAuthClient = createFakeSpotifyAuthClient(authOpts);

  const service = new SpotifyKoppelingService({
    spotifyAppStore,
    spotifyAuthClient,
    userStore,
    encryptieSleutel: TEST_SLEUTEL,
    baseUrl: 'https://djmusica.fun',
  });

  // Maak een account aan dat (voorlopig) alleen speler is.
  function maakSpelerAccount() {
    return userStore.create({ email: 'sanne@example.com', wachtwoordHash: 'x', rollen: ['speler'] });
  }

  return { service, userStore, spotifyAppStore, spotifyAuthClient, maakSpelerAccount, TEST_SLEUTEL };
}

module.exports = {
  createFakeSpotifyAuthClient,
  createSpelleiderHarness,
  TEST_SLEUTEL,
};
