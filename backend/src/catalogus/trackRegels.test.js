const { isCompleet, isSelecteerbaar } = require('./trackRegels');

// Unit tests voor track-compleetheid en selecteerbaarheid (FR-12a, FR-12b).

const completeTrack = { titel: 'Africa', jaar: 1982, actief: true, uitgeslotenDoorBeheerder: false };
const artiestMetLand = { land: 'United States' };
const artiestZonderLand = { land: null };

describe('isCompleet (FR-12a)', () => {
  test('compleet wanneer titel, jaar én land van de artiest aanwezig zijn', () => {
    expect(isCompleet(completeTrack, artiestMetLand)).toBe(true);
  });

  test('niet compleet zonder land van de artiest', () => {
    expect(isCompleet(completeTrack, artiestZonderLand)).toBe(false);
    expect(isCompleet(completeTrack, null)).toBe(false);
  });

  test('niet compleet zonder jaar', () => {
    expect(isCompleet({ ...completeTrack, jaar: null }, artiestMetLand)).toBe(false);
  });

  test('niet compleet zonder titel', () => {
    expect(isCompleet({ ...completeTrack, titel: '' }, artiestMetLand)).toBe(false);
  });
});

describe('isSelecteerbaar (FR-12a/12b)', () => {
  test('een compleet, actief, niet-uitgesloten nummer is selecteerbaar', () => {
    expect(isSelecteerbaar(completeTrack, artiestMetLand)).toBe(true);
  });

  test('handmatig uitgesloten nummer is niet selecteerbaar (FR-12b)', () => {
    expect(isSelecteerbaar({ ...completeTrack, uitgeslotenDoorBeheerder: true }, artiestMetLand)).toBe(false);
  });

  test('inactief nummer (uit playlist verdwenen) is niet selecteerbaar (FR-31)', () => {
    expect(isSelecteerbaar({ ...completeTrack, actief: false }, artiestMetLand)).toBe(false);
  });

  test('incompleet nummer is nooit selecteerbaar', () => {
    expect(isSelecteerbaar(completeTrack, artiestZonderLand)).toBe(false);
  });
});
