const { SecurityLog, EVENT_TYPES } = require('./securityLog');
const { createFakeClock } = require('./testSupport');

// Unit tests voor het beveiligingslog (NFR-14).

describe('SecurityLog (NFR-14)', () => {
  test('een gebeurtenis wordt vastgelegd met tijdstip en context', () => {
    const log = new SecurityLog({ now: createFakeClock() });
    log.record(EVENT_TYPES.LOGIN_MISLUKT, { email: 'sanne@example.com', ip: '10.0.0.1' });

    const regels = log.entries();
    expect(regels).toHaveLength(1);
    expect(regels[0].type).toBe(EVENT_TYPES.LOGIN_MISLUKT);
    expect(regels[0].email).toBe('sanne@example.com');
    expect(regels[0].at).toBeDefined();
  });

  test('het log weigert een wachtwoord-veld (NFR-14: geen wachtwoorden loggen)', () => {
    const log = new SecurityLog();
    expect(() =>
      log.record(EVENT_TYPES.LOGIN_MISLUKT, { email: 'x@example.com', password: 'geheim' })
    ).toThrow(/mag niet gelogd/i);
  });

  test('het log weigert een token-veld (NFR-14: geen tokens loggen)', () => {
    const log = new SecurityLog();
    expect(() =>
      log.record(EVENT_TYPES.WACHTWOORD_RESET_AANGEVRAAGD, { token: 'abc123' })
    ).toThrow(/mag niet gelogd/i);
  });

  test('filteren op type en tellen werkt (basis voor piek-signalering)', () => {
    const log = new SecurityLog();
    log.record(EVENT_TYPES.LOGIN_MISLUKT, { email: 'a@example.com' });
    log.record(EVENT_TYPES.LOGIN_MISLUKT, { email: 'a@example.com' });
    log.record(EVENT_TYPES.LOGIN_GESLAAGD, { email: 'a@example.com' });

    expect(log.count(EVENT_TYPES.LOGIN_MISLUKT)).toBe(2);
    expect(log.entries(EVENT_TYPES.LOGIN_GESLAAGD)).toHaveLength(1);
  });
});
