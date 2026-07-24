const { genereerJoinCode, isGeldigFormaat, normaliseerCode, TEKENSET } = require('./joinCode');

// Unit tests voor de join-codes (FR-59).

describe('join-codes (FR-59)', () => {
  test('een code is minimaal 6 tekens lang', () => {
    expect(genereerJoinCode().length).toBeGreaterThanOrEqual(6);
  });

  test('een code bevat geen verwarrende tekens (geen 0, O, 1 of I)', () => {
    for (let i = 0; i < 200; i++) {
      const code = genereerJoinCode();
      expect(code).not.toMatch(/[0O1I]/);
      // Elk teken komt uit de toegestane set.
      expect([...code].every((c) => TEKENSET.includes(c))).toBe(true);
    }
  });

  test('geldig formaat wordt herkend', () => {
    expect(isGeldigFormaat(genereerJoinCode())).toBe(true);
    expect(isGeldigFormaat('ABC7XK')).toBe(true);
    expect(isGeldigFormaat('ABC0O1')).toBe(false); // verboden tekens
    expect(isGeldigFormaat('ABC')).toBe(false); // te kort
    expect(isGeldigFormaat('')).toBe(false);
  });

  test('normaliseren maakt hoofdletters en haalt spaties weg', () => {
    expect(normaliseerCode('abc 7xk')).toBe('ABC7XK');
  });
});
