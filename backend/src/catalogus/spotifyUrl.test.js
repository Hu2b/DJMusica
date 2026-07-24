const { parseSpotifyPlaylistId, isGeldigePlaylistUrl } = require('./spotifyUrl');

// Unit tests voor het inlezen van een Spotify-playlist-URL (FR-5a).

describe('parseSpotifyPlaylistId', () => {
  const ID = '37i9dQZF1DXcBWIGoYBM5M';

  test.each([
    [`https://open.spotify.com/playlist/${ID}`],
    [`https://open.spotify.com/playlist/${ID}?si=abc123`],
    [`https://open.spotify.com/intl-nl/playlist/${ID}`],
    [`http://open.spotify.com/playlist/${ID}`],
    [`open.spotify.com/playlist/${ID}`],
    [`spotify:playlist:${ID}`],
    [`  spotify:playlist:${ID}  `],
  ])('haalt het id uit "%s"', (invoer) => {
    expect(parseSpotifyPlaylistId(invoer)).toBe(ID);
  });

  test.each([
    ['https://open.spotify.com/track/123'], // een track, geen playlist
    ['https://voorbeeld.nl/iets'],
    ['zomaar wat tekst'],
    [''],
    [null],
    [undefined],
  ])('weigert ongeldige invoer "%s"', (invoer) => {
    expect(() => parseSpotifyPlaylistId(invoer)).toThrow();
    expect(isGeldigePlaylistUrl(invoer)).toBe(false);
  });
});
