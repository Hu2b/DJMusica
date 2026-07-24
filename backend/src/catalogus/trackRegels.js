/**
 * Regels rond track-compleetheid en selecteerbaarheid (FR-12a, FR-12b)
 * --------------------------------------------------------------------
 * Zuivere regels (geen opslag), zodat ze los te testen zijn.
 *
 * - Een track is COMPLEET als titel, jaar én het land van de gekoppelde artiest
 *   allemaal ingevuld zijn (FR-12a). Ontbreekt er iets, dan is de track (nog)
 *   niet bruikbaar in het spel.
 * - Een track is SELECTEERBAAR (mag in een ronde gekozen worden) als hij
 *   compleet is, niet handmatig is uitgesloten (FR-12b), én nog actief is
 *   (niet uit de Spotify-playlist verdwenen, FR-31).
 */

/**
 * @param {object} track - trackrecord
 * @param {object|null} artiest - de gekoppelde artiest (voor het land)
 * @returns {boolean}
 */
function isCompleet(track, artiest) {
  if (!track) return false;
  const heeftTitel = Boolean(track.titel && String(track.titel).trim());
  const heeftJaar = track.jaar !== null && track.jaar !== undefined && track.jaar !== '';
  const heeftLand = Boolean(artiest && artiest.land && String(artiest.land).trim());
  return heeftTitel && heeftJaar && heeftLand;
}

/**
 * @param {object} track
 * @param {object|null} artiest
 * @returns {boolean}
 */
function isSelecteerbaar(track, artiest) {
  return (
    isCompleet(track, artiest) &&
    track.actief !== false &&
    track.uitgeslotenDoorBeheerder !== true
  );
}

module.exports = {
  isCompleet,
  isSelecteerbaar,
};
