/**
 * Spotify-playlist-URL inlezen (FR-5a)
 * ------------------------------------
 * De beheerder plakt een Spotify-playlist-link; wij halen daar het "id" uit
 * (het unieke kenmerk van die afspeellijst). We accepteren de gangbare vormen:
 *   - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 *   - https://open.spotify.com/intl-nl/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc
 *   - open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 *   - spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
 *
 * Eventuele extra rommel achter een "?" (bv. ?si=...) negeren we.
 */

// Zoek "playlist" gevolgd door "/" of ":" en daarna het id (letters/cijfers).
const PLAYLIST_PATROON = /playlist[/:]([A-Za-z0-9]+)/;

/**
 * Haalt het playlist-id uit een Spotify-URL of -URI.
 * @param {string} input
 * @returns {string} het playlist-id
 * @throws {Error} als er geen geldig playlist-id in zit
 */
function parseSpotifyPlaylistId(input) {
  const tekst = String(input ?? '').trim();
  const match = tekst.match(PLAYLIST_PATROON);
  if (!match || !match[1]) {
    throw new Error(
      'Dit lijkt geen geldige Spotify-afspeellijst-link. Plak de link naar een playlist ' +
        '(bv. https://open.spotify.com/playlist/...).'
    );
  }
  return match[1];
}

/** Handig voor een niet-crashende check (bv. in de UI). */
function isGeldigePlaylistUrl(input) {
  try {
    parseSpotifyPlaylistId(input);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  parseSpotifyPlaylistId,
  isGeldigePlaylistUrl,
};
