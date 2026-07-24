const { createAuthTestHarness } = require('./testSupport');
const { SESSIE_TOESTAND } = require('./sessionLifetime');
const { EVENT_TYPES } = require('./securityLog');

// Integratietests voor STAP 4: uitloggen en sessieduur (FR-57).
// Gebaseerd op testset.md sectie 0, Feature "Uitloggen en sessieduur".

const GOED_WW = 'een-goed-wachtwoord';
const UUR = 60 * 60 * 1000;

async function logIn(harness, email = 'sanne@example.com') {
  const { userId } = await harness.maakGeverifieerdAccount({ email, password: GOED_WW });
  const login = await harness.auth.login({ email, password: GOED_WW, ip: '10.0.0.1' });
  return { userId, sessionId: login.sessionId };
}

describe('Auth Service - uitloggen en sessieduur (FR-57)', () => {
  test('aftelwaarschuwing 2 uur na inloggen, buiten een actief spel', async () => {
    const harness = createAuthTestHarness();
    const { sessionId } = await logIn(harness);

    // Direct na inloggen: gewoon actief.
    expect(harness.auth.checkSession({ sessionId }).state).toBe(SESSIE_TOESTAND.ACTIEF);

    // 2 uur later: waarschuwing met een aftellende teller.
    harness.now.advance(2 * UUR);
    const status = harness.auth.checkSession({ sessionId });
    expect(status.state).toBe(SESSIE_TOESTAND.WAARSCHUWING);
    expect(status.secondsRemaining).toBeGreaterThan(0);
    expect(status.secondsRemaining).toBeLessThanOrEqual(60);
  });

  test('"blijf ingelogd" verlengt met opnieuw 2 uur', async () => {
    const harness = createAuthTestHarness();
    const { sessionId } = await logIn(harness);

    harness.now.advance(2 * UUR); // waarschuwing loopt
    expect(harness.auth.checkSession({ sessionId }).state).toBe(SESSIE_TOESTAND.WAARSCHUWING);

    harness.auth.extendSession({ sessionId }); // knopdruk
    expect(harness.auth.checkSession({ sessionId }).state).toBe(SESSIE_TOESTAND.ACTIEF);

    // Bijna 2 uur later nog actief...
    harness.now.advance(2 * UUR - 1000);
    expect(harness.auth.checkSession({ sessionId }).state).toBe(SESSIE_TOESTAND.ACTIEF);
    // ...en pas daarna weer een waarschuwing.
    harness.now.advance(2000);
    expect(harness.auth.checkSession({ sessionId }).state).toBe(SESSIE_TOESTAND.WAARSCHUWING);
  });

  test('geen reactie binnen 60 seconden betekent automatisch uitloggen', async () => {
    const harness = createAuthTestHarness();
    const { sessionId } = await logIn(harness);

    harness.now.advance(2 * UUR + 61 * 1000); // afteller voorbij, geen knopdruk
    const status = harness.auth.checkSession({ sessionId });

    expect(status.state).toBe(SESSIE_TOESTAND.VERLOPEN);
    // De sessie is echt beëindigd.
    expect(harness.sessionStore.isActive(sessionId)).toBe(false);
  });

  test('na automatisch uitloggen kan gewoon opnieuw worden ingelogd, zonder dataverlies', async () => {
    const harness = createAuthTestHarness();
    const { sessionId } = await logIn(harness);

    harness.now.advance(2 * UUR + 61 * 1000);
    harness.auth.checkSession({ sessionId }); // triggert de auto-uitlog

    const opnieuw = await harness.auth.login({ email: 'sanne@example.com', password: GOED_WW, ip: '10.0.0.1' });
    expect(opnieuw.ok).toBe(true);
    expect(opnieuw.sessionId).toBeDefined();
  });

  test('nooit automatisch uitloggen tijdens een actief spel (FR-57)', async () => {
    const harness = createAuthTestHarness();
    const { userId, sessionId } = await logIn(harness);

    // Zet de gebruiker "in een actief spel".
    harness.gameState.setInGame(userId, true);

    // Zelfs na 3 uur: geen waarschuwing, niet uitgelogd.
    harness.now.advance(3 * UUR);
    const status = harness.auth.checkSession({ sessionId });
    expect(status.state).toBe(SESSIE_TOESTAND.ACTIEF);
    expect(harness.sessionStore.isActive(sessionId)).toBe(true);
  });

  test('de uitlog-knop beëindigt de sessie meteen (FR-57)', async () => {
    const harness = createAuthTestHarness();
    const { sessionId } = await logIn(harness);

    expect(harness.auth.logout({ sessionId }).ok).toBe(true);
    expect(harness.sessionStore.isActive(sessionId)).toBe(false);
    expect(harness.auth.checkSession({ sessionId }).state).toBe('GEEN_SESSIE');
  });

  test('beveiligingslogging: waarschuwing, verlenging en auto-uitloggen worden gelogd (NFR-14)', async () => {
    const harness = createAuthTestHarness();
    const { sessionId } = await logIn(harness);

    harness.now.advance(2 * UUR);
    harness.auth.checkSession({ sessionId }); // -> waarschuwing
    harness.auth.extendSession({ sessionId }); // -> verlengd

    harness.now.advance(2 * UUR + 61 * 1000);
    harness.auth.checkSession({ sessionId }); // -> auto-uitgelogd

    expect(harness.securityLog.count(EVENT_TYPES.SESSIE_WAARSCHUWING)).toBe(1);
    expect(harness.securityLog.count(EVENT_TYPES.SESSIE_VERLENGD)).toBe(1);
    expect(harness.securityLog.count(EVENT_TYPES.SESSIE_AUTO_UITGELOGD)).toBe(1);
  });

  test('de waarschuwing wordt maar één keer gelogd, ook bij meerdere controles', async () => {
    const harness = createAuthTestHarness();
    const { sessionId } = await logIn(harness);

    harness.now.advance(2 * UUR);
    harness.auth.checkSession({ sessionId });
    harness.auth.checkSession({ sessionId });
    harness.auth.checkSession({ sessionId });

    expect(harness.securityLog.count(EVENT_TYPES.SESSIE_WAARSCHUWING)).toBe(1);
  });
});
