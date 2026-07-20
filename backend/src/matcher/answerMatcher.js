/**
 * Answer Matcher
 * ---------------
 * Beoordeelt of een door een speler ingevoerd antwoord "goed" is.
 *
 * Regels (zie requirements.md):
 * - FR-17: titel/artiest -> fuzzy matching, Levenshtein-afstand <= 3 tekens (hoofdlettergevoeligheid genegeerd).
 * - FR-18: "jaar plus of min 3" -> goed als binnen 3 jaar van het juiste jaartal.
 * - jaartal (exact) en decennium zijn eenvoudige exacte vergelijkingen.
 */

/**
 * Klassieke Levenshtein-afstand (dynamic programming).
 * @param {string} a
 * @param {string} b
 * @returns {number} aantal edits (invoegen/verwijderen/vervangen) om a in b te veranderen
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // rij-voor-rij DP, O(min(m,n)) geheugen
  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  let currRow = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,       // verwijderen
        currRow[j - 1] + 1,   // invoegen
        prevRow[j - 1] + cost // vervangen (of gelijk)
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[n];
}

/**
 * Normaliseert tekst voor vergelijking: trimmen, lowercase, dubbele spaties opruimen.
 * @param {string} s
 * @returns {string}
 */
function normalize(s) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Fuzzy-match voor titel/artiest (FR-17): goed als Levenshtein-afstand <= maxDistance.
 * @param {string} correctAnswer - het juiste antwoord (bv. artiestnaam of titel)
 * @param {string} givenAnswer - het antwoord van de speler
 * @param {number} [maxDistance=3] - maximale toegestane afstand (default per FR-17)
 * @returns {{ isCorrect: boolean, distance: number }}
 */
function matchFuzzyText(correctAnswer, givenAnswer, maxDistance = 3) {
  const a = normalize(correctAnswer);
  const b = normalize(givenAnswer);
  const distance = levenshteinDistance(a, b);
  return { isCorrect: distance <= maxDistance, distance };
}

/**
 * Exacte jaartal-match.
 * @param {number} correctYear
 * @param {number} givenYear
 * @returns {boolean}
 */
function matchExactYear(correctYear, givenYear) {
  return Number(correctYear) === Number(givenYear);
}

/**
 * "Jaar plus of min 3" (FR-18): goed als binnen tolerantie van het juiste jaartal.
 * @param {number} correctYear
 * @param {number} givenYear
 * @param {number} [tolerance=3]
 * @returns {boolean}
 */
function matchYearRange(correctYear, givenYear, tolerance = 3) {
  return Math.abs(Number(correctYear) - Number(givenYear)) <= tolerance;
}

/**
 * Decennium-match (bv. 1987 en 1989 zijn beide "jaren 80").
 * @param {number} correctYear
 * @param {number} givenDecadeStart - bv. 1980 voor "jaren 80"
 * @returns {boolean}
 */
function matchDecade(correctYear, givenDecadeStart) {
  const correctDecade = Math.floor(Number(correctYear) / 10) * 10;
  const givenDecade = Math.floor(Number(givenDecadeStart) / 10) * 10;
  return correctDecade === givenDecade;
}

module.exports = {
  levenshteinDistance,
  normalize,
  matchFuzzyText,
  matchExactYear,
  matchYearRange,
  matchDecade,
};
