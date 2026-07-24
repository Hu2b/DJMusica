/**
 * Spotify-koppeling service (FR-37, FR-38, FR-36, NFR-4)
 * -----------------------------------------------------
 * Regelt de "koppel je eigen Spotify-app"-wizard voor een spelleider:
 *  1. levert de vaste redirect-URI die de spelleider in het Spotify Dashboard
 *     moet plakken;
 *  2. controleert de ingevoerde Client ID/Secret met een echte validatietest;
 *  3. bewaart de gegevens (Secret alleen versleuteld) en activeert de
 *     spelleider-rol op het account.
 *
 * Omdat elke spelleider zijn eigen Spotify-app koppelt, draaien meerdere
 * spelleiders volledig onafhankelijk naast elkaar (FR-38).
 */

const { versleutel } = require('./encryptie');

class SpotifyKoppelingService {
  /**
   * @param {object} deps
   * @param {object} deps.spotifyAppStore
   * @param {object} deps.spotifyAuthClient - { testCredentials({clientId, clientSecret}) }
   * @param {object} deps.userStore - accounts (voor rol-activering); heeft findById/update
   * @param {string} deps.encryptieSleutel - uit SPOTIFY_ENCRYPTION_KEY
   * @param {string} [deps.baseUrl] - basis-URL van de app (voor de redirect-URI)
   * @param {object} [deps.securityLog] - optioneel beveiligingslog (NFR-14)
   */
  constructor({ spotifyAppStore, spotifyAuthClient, userStore, encryptieSleutel, baseUrl = 'https://djmusica.fun', securityLog = null }) {
    this.spotifyAppStore = spotifyAppStore;
    this.spotifyAuthClient = spotifyAuthClient;
    this.userStore = userStore;
    this.encryptieSleutel = encryptieSleutel;
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.securityLog = securityLog;
  }

  /** De vaste redirect-URI die de spelleider in het Spotify Dashboard invult (FR-37). */
  getRedirectUri() {
    return `${this.baseUrl}/spelleider/spotify/callback`;
  }

  /**
   * Valideert de ingevoerde Client ID/Secret en slaat de koppeling op (FR-37).
   * @param {object} input
   * @param {string} input.userId
   * @param {string} input.clientId
   * @param {string} input.clientSecret
   * @returns {Promise<{ ok: boolean, reden?: string, gekoppeldOp?: string }>}
   */
  async koppelSpotifyApp({ userId, clientId, clientSecret } = {}) {
    if (!userId) throw new Error('koppelSpotifyApp: userId ontbreekt');
    if (!clientId || !clientSecret) {
      return { ok: false, reden: 'ONTBREEKT', message: 'Vul zowel de Client ID als de Client Secret in.' };
    }

    // Directe validatietest tegen Spotify.
    const test = await this.spotifyAuthClient.testCredentials({ clientId, clientSecret });
    if (!test.ok) {
      if (this.securityLog) {
        this.securityLog.record('SPOTIFY_KOPPELING_MISLUKT', { userId });
      }
      return {
        ok: false,
        reden: 'ONGELDIGE_CREDENTIALS',
        message: 'De koppeling werkt niet. Controleer de Client ID en Client Secret in het Spotify Dashboard.',
      };
    }

    // Geldig: Secret versleuteld opslaan (NFR-4).
    const koppeling = this.spotifyAppStore.upsert({
      userId,
      spotifyClientId: clientId,
      spotifyClientSecretEncrypted: versleutel(clientSecret, this.encryptieSleutel),
    });

    // Spelleider-rol activeren (FR-36): een account kan meerdere rollen hebben.
    this._activeerSpelleiderRol(userId);

    if (this.securityLog) {
      this.securityLog.record('SPOTIFY_KOPPELING_GELUKT', { userId });
    }
    return { ok: true, gekoppeldOp: koppeling.gekoppeldOp };
  }

  _activeerSpelleiderRol(userId) {
    if (!this.userStore) return;
    const user = this.userStore.findById(userId);
    if (user && Array.isArray(user.rollen) && !user.rollen.includes('spelleider')) {
      this.userStore.update(userId, { rollen: [...user.rollen, 'spelleider'] });
    }
  }

  /**
   * Geeft veilige koppelingsinfo terug (nooit de Secret of tokens, NFR-4).
   * @returns {{ gekoppeld: boolean, spotifyClientId?: string, gekoppeldOp?: string }}
   */
  getKoppelingStatus(userId) {
    const k = this.spotifyAppStore.findByUserId(userId);
    if (!k) return { gekoppeld: false };
    return { gekoppeld: true, spotifyClientId: k.spotifyClientId, gekoppeldOp: k.gekoppeldOp };
  }

  /** Mag dit account hosten? Alleen met een werkende Spotify-koppeling (FR-37). */
  kanHosten(userId) {
    return this.spotifyAppStore.heeftKoppeling(userId);
  }
}

module.exports = {
  SpotifyKoppelingService,
};
