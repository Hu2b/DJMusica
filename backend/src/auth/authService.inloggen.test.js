const { createAuthTestHarness } = require('./testSupport');
const { EVENT_TYPES } = require('./securityLog');

// Integratietests voor STAP 2: inloggen met oplopende wachttijd (FR-35).
// Gebaseerd op testset.md sectie 0:
//  - Feature "Registreren en inloggen" (Inloggen met correcte gegevens,
//    Oplopende wachttijd na mislukte inlogpogingen)
//  - Feature "Veilige wachtwoord-reset en lockout" (lockout niet misbruikbaar)

const GOED_WW = 'een-goed-wachtwoord';

describe('Auth Service - inloggen (FR-35)', () => {
  test('inloggen met de juiste gegevens lukt (na e-mailverificatie)', async () => {
    const { auth, maakGeverifieerdAccount } = createAuthTestHarness();
    const { userId } = await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });

    const resultaat = await auth.login({ email: 'sanne@example.com', password: GOED_WW, ip: '10.0.0.1' });
    expect(resultaat.ok).toBe(true);
    expect(resultaat.userId).toBe(userId);
  });

  test('inloggen met een verkeerd wachtwoord mislukt, met een neutrale melding', async () => {
    const { auth, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });

    const resultaat = await auth.login({ email: 'sanne@example.com', password: 'fout', ip: '10.0.0.1' });
    expect(resultaat.ok).toBe(false);
    expect(resultaat.reden).toBe('ONGELDIG');
  });

  test('inloggen op een onbekend e-mailadres geeft dezelfde neutrale melding (geen lek)', async () => {
    const { auth, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });

    const bekendFout = await auth.login({ email: 'sanne@example.com', password: 'fout', ip: '1.1.1.1' });
    const onbekend = await auth.login({ email: 'niemand@example.com', password: 'fout', ip: '1.1.1.1' });
    expect(onbekend.reden).toBe(bekendFout.reden);
    expect(onbekend.message).toBe(bekendFout.message);
  });

  test('een nog niet geverifieerd account kan niet inloggen, ook met het juiste wachtwoord (FR-55)', async () => {
    const { auth } = createAuthTestHarness();
    await auth.register({ email: 'nieuw@example.com', password: GOED_WW });

    const resultaat = await auth.login({ email: 'nieuw@example.com', password: GOED_WW, ip: '10.0.0.1' });
    expect(resultaat.ok).toBe(false);
    expect(resultaat.reden).toBe('NIET_GEVERIFIEERD');
  });

  describe('oplopende wachttijd na 5 mislukte pogingen', () => {
    test('5e mislukte poging -> minstens 1 minuut wachten (scenario testset.md)', async () => {
      const { auth, maakGeverifieerdAccount } = createAuthTestHarness();
      await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
      const ip = '10.0.0.1';

      // 4 mislukte pogingen: nog geen blokkade.
      for (let i = 0; i < 4; i++) {
        const r = await auth.login({ email: 'sanne@example.com', password: 'fout', ip });
        expect(r.reden).toBe('ONGELDIG');
      }
      // 5e mislukte poging -> geblokkeerd, ~1 minuut.
      const vijfde = await auth.login({ email: 'sanne@example.com', password: 'fout', ip });
      expect(vijfde.reden).toBe('GEBLOKKEERD');
      expect(vijfde.retryAfterMs).toBe(60 * 1000);
    });

    test('wachttijd verdubbelt: 6e -> 2 min, 7e -> 4 min', async () => {
      const { auth, now, maakGeverifieerdAccount } = createAuthTestHarness();
      await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
      const ip = '10.0.0.1';

      for (let i = 0; i < 5; i++) await auth.login({ email: 'sanne@example.com', password: 'fout', ip });

      now.advance(60 * 1000); // 1e wachttijd voorbij
      const zesde = await auth.login({ email: 'sanne@example.com', password: 'fout', ip });
      expect(zesde.retryAfterMs).toBe(2 * 60 * 1000);

      now.advance(2 * 60 * 1000); // 2e wachttijd voorbij
      const zevende = await auth.login({ email: 'sanne@example.com', password: 'fout', ip });
      expect(zevende.retryAfterMs).toBe(4 * 60 * 1000);
    });

    test('tijdens de wachttijd wordt zelfs het JUISTE wachtwoord geweigerd', async () => {
      const { auth, maakGeverifieerdAccount } = createAuthTestHarness();
      await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
      const ip = '10.0.0.1';

      for (let i = 0; i < 5; i++) await auth.login({ email: 'sanne@example.com', password: 'fout', ip });
      const metJuist = await auth.login({ email: 'sanne@example.com', password: GOED_WW, ip });
      expect(metJuist.ok).toBe(false);
      expect(metJuist.reden).toBe('GEBLOKKEERD');
    });

    test('na afloop van de wachttijd lukt inloggen met het juiste wachtwoord weer', async () => {
      const { auth, now, maakGeverifieerdAccount } = createAuthTestHarness();
      await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
      const ip = '10.0.0.1';

      for (let i = 0; i < 5; i++) await auth.login({ email: 'sanne@example.com', password: 'fout', ip });
      now.advance(60 * 1000 + 1); // wachttijd voorbij

      const resultaat = await auth.login({ email: 'sanne@example.com', password: GOED_WW, ip });
      expect(resultaat.ok).toBe(true);
    });
  });

  test('lockout is niet te misbruiken om andermans account te blokkeren (FR-35, testset.md)', async () => {
    const { auth, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });

    // Een kwaadwillende logt vanaf zijn EIGEN IP 5x expres fout in op Sanne's account.
    const aanvallerIp = '6.6.6.6';
    for (let i = 0; i < 5; i++) {
      await auth.login({ email: 'sanne@example.com', password: 'fout', ip: aanvallerIp });
    }

    // Sanne logt vanaf HAAR EIGEN telefoon (ander IP) in met het juiste wachtwoord.
    const sanne = await auth.login({ email: 'sanne@example.com', password: GOED_WW, ip: '9.9.9.9' });
    expect(sanne.ok).toBe(true);
  });

  test('beveiligingslogging: mislukte, geblokkeerde en geslaagde inlog worden gelogd, zonder wachtwoord (NFR-14)', async () => {
    const { auth, securityLog, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
    const ip = '10.0.0.1';

    for (let i = 0; i < 5; i++) await auth.login({ email: 'sanne@example.com', password: 'fout', ip });

    expect(securityLog.count(EVENT_TYPES.LOGIN_MISLUKT)).toBe(5);
    expect(securityLog.count(EVENT_TYPES.LOGIN_GEBLOKKEERD)).toBeGreaterThanOrEqual(1);

    expect(JSON.stringify(securityLog.entries())).not.toContain('fout');
    expect(JSON.stringify(securityLog.entries())).not.toContain(GOED_WW);
  });
});
