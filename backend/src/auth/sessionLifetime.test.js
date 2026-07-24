const { berekenSessieStatus, SESSIE_TOESTAND } = require('./sessionLifetime');

// Unit tests voor de pure sessieduur-berekening (FR-57).

const UUR = 60 * 60 * 1000;
const START = 1_700_000_000_000;

describe('berekenSessieStatus (FR-57)', () => {
  test('minder dan 2 uur na inloggen: ACTIEF', () => {
    const r = berekenSessieStatus({ lastExtendedAt: START, now: START + UUR, inActiveGame: false });
    expect(r.state).toBe(SESSIE_TOESTAND.ACTIEF);
  });

  test('precies 2 uur na inloggen: WAARSCHUWING met ~60 seconden afteller', () => {
    const r = berekenSessieStatus({ lastExtendedAt: START, now: START + 2 * UUR, inActiveGame: false });
    expect(r.state).toBe(SESSIE_TOESTAND.WAARSCHUWING);
    expect(r.secondsRemaining).toBe(60);
  });

  test('halverwege de afteller: WAARSCHUWING met minder resterende seconden', () => {
    const r = berekenSessieStatus({
      lastExtendedAt: START,
      now: START + 2 * UUR + 30 * 1000,
      inActiveGame: false,
    });
    expect(r.state).toBe(SESSIE_TOESTAND.WAARSCHUWING);
    expect(r.secondsRemaining).toBe(30);
  });

  test('na 2 uur + meer dan 60 seconden: VERLOPEN', () => {
    const r = berekenSessieStatus({
      lastExtendedAt: START,
      now: START + 2 * UUR + 61 * 1000,
      inActiveGame: false,
    });
    expect(r.state).toBe(SESSIE_TOESTAND.VERLOPEN);
  });

  test('tijdens een actief spel blijft de sessie ACTIEF, ook na 3 uur (FR-57)', () => {
    const r = berekenSessieStatus({ lastExtendedAt: START, now: START + 3 * UUR, inActiveGame: true });
    expect(r.state).toBe(SESSIE_TOESTAND.ACTIEF);
    expect(r.inSpel).toBe(true);
  });
});
