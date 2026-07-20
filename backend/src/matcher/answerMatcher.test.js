const {
  levenshteinDistance,
  matchFuzzyText,
  matchExactYear,
  matchYearRange,
  matchDecade,
} = require('./answerMatcher');

// Deze tests zijn de code-versie van de tabel in testset.md, sectie
// "Unit-testniveau (Answer Matcher)".

describe('levenshteinDistance', () => {
  test('identieke strings hebben afstand 0', () => {
    expect(levenshteinDistance('coldplay', 'coldplay')).toBe(0);
  });

  test('lege string vs niet-lege string is gelijk aan de lengte', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
  });
});

describe('matchFuzzyText (FR-17: fuzzy matching, Levenshtein <= 3)', () => {
  test('"The Beatles" vs "the beatles" -> juist (hoofdlettergevoeligheid genegeerd)', () => {
    const { isCorrect } = matchFuzzyText('The Beatles', 'the beatles');
    expect(isCorrect).toBe(true);
  });

  test('"The Beatles" vs "The Beattles" -> juist (1 teken verschil, <=3)', () => {
    const { isCorrect, distance } = matchFuzzyText('The Beatles', 'The Beattles');
    expect(distance).toBeLessThanOrEqual(3);
    expect(isCorrect).toBe(true);
  });

  test('"Nirvana" vs "Nirvna" -> juist (1 teken verschil, deletie)', () => {
    const { isCorrect } = matchFuzzyText('Nirvana', 'Nirvna');
    expect(isCorrect).toBe(true);
  });

  test('"Nirvana" vs "Nirvanaa1" -> juist (2 tekens verschil)', () => {
    const { isCorrect } = matchFuzzyText('Nirvana', 'Nirvanaa1');
    expect(isCorrect).toBe(true);
  });

  test('"Nirvana" vs "Nirvanaland" -> onjuist (4+ tekens verschil)', () => {
    const { isCorrect, distance } = matchFuzzyText('Nirvana', 'Nirvanaland');
    expect(distance).toBe(4);
    expect(isCorrect).toBe(false);
  });

  test('"Nirvana" vs "Metallica" -> onjuist (volledig ander antwoord)', () => {
    const { isCorrect } = matchFuzzyText('Nirvana', 'Metallica');
    expect(isCorrect).toBe(false);
  });

  // Open vraag uit requirements.md/testset.md: moet "Beatles" (zonder "The")
  // ook goedgekeurd worden? Met pure Levenshtein-afstand is dit "onjuist",
  // want het verschil (4 tekens: "the ") overschrijdt de grens van 3.
  // Deze test legt het HUIDIGE gedrag vast, niet per se het gewenste eindgedrag --
  // zie de open vraag in requirements.md over gedeeltelijke matches.
  test('"The Beatles" vs "Beatles" -> onjuist onder pure Levenshtein (open designvraag)', () => {
    const { isCorrect, distance } = matchFuzzyText('The Beatles', 'Beatles');
    expect(distance).toBe(4);
    expect(isCorrect).toBe(false);
  });
});

describe('matchExactYear', () => {
  test('1999 vs 1999 -> juist', () => {
    expect(matchExactYear(1999, 1999)).toBe(true);
  });

  test('1999 vs 2000 -> onjuist', () => {
    expect(matchExactYear(1999, 2000)).toBe(false);
  });
});

describe('matchYearRange (FR-18: jaar plus of min 3)', () => {
  test.each([
    [1985, 1985, true],
    [1985, 1982, true], // -3
    [1985, 1988, true], // +3
    [1985, 1981, false], // -4, net buiten de marge
    [1985, 1989, false], // +4, net buiten de marge
  ])('correct=%i, gegeven=%i -> %s', (correctYear, givenYear, expected) => {
    expect(matchYearRange(correctYear, givenYear)).toBe(expected);
  });
});

describe('matchDecade', () => {
  test('1987 valt in "jaren 80" (1980)', () => {
    expect(matchDecade(1987, 1980)).toBe(true);
  });

  test('1987 valt niet in "jaren 90" (1990)', () => {
    expect(matchDecade(1987, 1990)).toBe(false);
  });
});
