const { InMemoryLoginThrottle } = require('./loginThrottle');
const { createFakeClock } = require('./testSupport');

// Unit tests voor de oplopende wachttijd (FR-35).

describe('InMemoryLoginThrottle (FR-35)', () => {
  test('geen wachttijd bij minder dan 5 mislukte pogingen', () => {
    const t = new InMemoryLoginThrottle({ now: createFakeClock() });
    for (let i = 0; i < 4; i++) {
      const r = t.registerFailure('sanne@example.com', '10.0.0.1');
      expect(r.locked).toBe(false);
    }
    expect(t.status('sanne@example.com', '10.0.0.1').locked).toBe(false);
  });

  test('oplopende wachttijd: 5e -> 1 min, 6e -> 2 min, 7e -> 4 min', () => {
    const clock = createFakeClock();
    const t = new InMemoryLoginThrottle({ now: clock });
    const email = 'sanne@example.com';
    const ip = '10.0.0.1';

    for (let i = 0; i < 4; i++) t.registerFailure(email, ip);

    // 5e mislukte poging -> 1 minuut
    let r = t.registerFailure(email, ip);
    expect(r.locked).toBe(true);
    expect(r.retryAfterMs).toBe(60 * 1000);

    // wachttijd voorbij, dan 6e mislukte poging -> 2 minuten
    clock.advance(60 * 1000);
    r = t.registerFailure(email, ip);
    expect(r.retryAfterMs).toBe(2 * 60 * 1000);

    // 7e mislukte poging -> 4 minuten
    clock.advance(2 * 60 * 1000);
    r = t.registerFailure(email, ip);
    expect(r.retryAfterMs).toBe(4 * 60 * 1000);
  });

  test('de wachttijd loopt af naarmate de tijd verstrijkt', () => {
    const clock = createFakeClock();
    const t = new InMemoryLoginThrottle({ now: clock });
    for (let i = 0; i < 5; i++) t.registerFailure('a@example.com', '1.1.1.1');

    expect(t.status('a@example.com', '1.1.1.1').locked).toBe(true);
    clock.advance(60 * 1000 + 1);
    expect(t.status('a@example.com', '1.1.1.1').locked).toBe(false);
  });

  test('blokkade geldt per account+IP: een ander IP is niet geblokkeerd (FR-35)', () => {
    const t = new InMemoryLoginThrottle({ now: createFakeClock() });
    for (let i = 0; i < 5; i++) t.registerFailure('sanne@example.com', '6.6.6.6'); // aanvaller

    expect(t.status('sanne@example.com', '6.6.6.6').locked).toBe(true); // aanvaller geblokkeerd
    expect(t.status('sanne@example.com', '9.9.9.9').locked).toBe(false); // Sanne's eigen IP niet
  });

  test('een geslaagde inlog wist de teller en de blokkade', () => {
    const t = new InMemoryLoginThrottle({ now: createFakeClock() });
    for (let i = 0; i < 3; i++) t.registerFailure('a@example.com', '1.1.1.1');
    t.registerSuccess('a@example.com', '1.1.1.1');
    expect(t.status('a@example.com', '1.1.1.1').mislukt).toBe(0);
  });
});
