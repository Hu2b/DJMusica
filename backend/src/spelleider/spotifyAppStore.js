/**
 * Spotify-app-koppeling opslag (FR-37, NFR-4)
 * -------------------------------------------
 * Bewaart per spelleider (USER) diens eigen Spotify Client ID en de versleutelde
 * Client Secret (en later de OAuth-tokens). Eén koppeling per account.
 *
 * De Client Secret wordt alleen versleuteld opgeslagen (zie encryptie.js) en
 * verlaat de server nooit richting andere clients (NFR-4).
 */

class InMemorySpotifyAppStore {
  constructor({ now = Date.now } = {}) {
    this._now = now;
    this._byUserId = new Map();
  }

  /**
   * Maakt of vervangt de koppeling van een account.
   * @param {object} data
   * @param {string} data.userId
   * @param {string} data.spotifyClientId
   * @param {string} data.spotifyClientSecretEncrypted
   */
  upsert({ userId, spotifyClientId, spotifyClientSecretEncrypted }) {
    const koppeling = {
      userId,
      spotifyClientId,
      spotifyClientSecretEncrypted,
      oauthAccessTokenEncrypted: null,
      oauthRefreshTokenEncrypted: null,
      gekoppeldOp: new Date(this._now()).toISOString(),
    };
    this._byUserId.set(userId, koppeling);
    return { ...koppeling };
  }

  findByUserId(userId) {
    const k = this._byUserId.get(userId);
    return k ? { ...k } : null;
  }

  heeftKoppeling(userId) {
    return this._byUserId.has(userId);
  }

  delete(userId) {
    return this._byUserId.delete(userId);
  }
}

module.exports = {
  InMemorySpotifyAppStore,
};
