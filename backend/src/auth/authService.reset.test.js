const { createAuthTestHarness } = require('./testSupport');
const { NEUTRALE_RESET_MELDING } = require('./authService');
const { EVENT_TYPES } = require('./securityLog');

// Integratietests voor STAP 3: wachtwoord vergeten / reset (FR-34).
// Gebaseerd op testset.md sectie 0, Feature "Veilige wachtwoord-reset en lockout":
//  - Resetmelding onthult niet of een adres bestaat
//  - Resetlink is eenmalig en kort geldig
//  - Alle sessies uitgelogd na geslaagde reset

const GOED_WW = 'een-goed-wachtwoord';
const NIEUW_WW = 'een-nieuw-sterk-wachtwoord';

describe('Auth Service - wachtwoord vergeten / reset (FR-34)', () => {
  test('reset aanvragen op een bekend adres stuurt een resetlink', async () => {
    const { auth, mailer, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });

    const resultaat = await auth.requestPasswordReset({ email: 'sanne@example.com' });
    expect(resultaat.ok).toBe(true);
    expect(resultaat.message).toBe(NEUTRALE_RESET_MELDING);
    expect(mailer.last('wachtwoord-reset')).not.toBeNull();
  });

  test('de resetmelding is identiek voor een onbekend adres en verstuurt geen mail (geen lek)', async () => {
    const { auth, mailer, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });

    const bekend = await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const onbekend = await auth.requestPasswordReset({ email: 'niemand@example.com' });

    expect(onbekend.message).toBe(bekend.message);
    // Voor het onbekende adres is geen mail verstuurd.
    expect(mailer.lastTo('niemand@example.com')).toBeNull();
  });

  test('met een geldige link kan een nieuw wachtwoord worden ingesteld', async () => {
    const { auth, mailer, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
    await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const { rawToken } = mailer.last('wachtwoord-reset');

    const reset = await auth.resetPassword({ rawToken, newPassword: NIEUW_WW });
    expect(reset.ok).toBe(true);

    // Oude wachtwoord werkt niet meer, nieuwe wel.
    expect((await auth.login({ email: 'sanne@example.com', password: GOED_WW, ip: '1.1.1.1' })).ok).toBe(false);
    expect((await auth.login({ email: 'sanne@example.com', password: NIEUW_WW, ip: '1.1.1.1' })).ok).toBe(true);
  });

  test('een resetlink is eenmalig: een tweede poging met dezelfde link heeft geen effect', async () => {
    const { auth, mailer, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
    await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const { rawToken } = mailer.last('wachtwoord-reset');

    expect((await auth.resetPassword({ rawToken, newPassword: NIEUW_WW })).ok).toBe(true);
    const tweede = await auth.resetPassword({ rawToken, newPassword: 'weer-een-ander-wachtwoord' });
    expect(tweede.ok).toBe(false);
    expect(tweede.reden).toBe('AL_GEBRUIKT');
  });

  test('een resetlink verloopt na 1 uur (na 2 uur werkt hij niet meer)', async () => {
    const { auth, mailer, now, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
    await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const { rawToken } = mailer.last('wachtwoord-reset');

    now.advance(2 * 60 * 60 * 1000); // 2 uur later
    const reset = await auth.resetPassword({ rawToken, newPassword: NIEUW_WW });
    expect(reset.ok).toBe(false);
    expect(reset.reden).toBe('VERLOPEN');
  });

  test('alle lopende sessies worden uitgelogd na een geslaagde reset (FR-34)', async () => {
    const { auth, sessionStore, mailer, maakGeverifieerdAccount } = createAuthTestHarness();
    const { userId } = await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });

    // Ingelogd op twee apparaten.
    const apparaat1 = await auth.login({ email: 'sanne@example.com', password: GOED_WW, ip: '1.1.1.1' });
    const apparaat2 = await auth.login({ email: 'sanne@example.com', password: GOED_WW, ip: '2.2.2.2' });
    expect(sessionStore.listForUser(userId)).toHaveLength(2);

    // Reset uitvoeren.
    await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const { rawToken } = mailer.last('wachtwoord-reset');
    const reset = await auth.resetPassword({ rawToken, newPassword: NIEUW_WW });

    expect(reset.uitgelogdeSessies).toBe(2);
    expect(sessionStore.isActive(apparaat1.sessionId)).toBe(false);
    expect(sessionStore.isActive(apparaat2.sessionId)).toBe(false);
    expect(sessionStore.listForUser(userId)).toHaveLength(0);
  });

  test('een nieuw, te zwak wachtwoord bij reset wordt geweigerd (FR-56)', async () => {
    const { auth, mailer, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
    await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const { rawToken } = mailer.last('wachtwoord-reset');

    const reset = await auth.resetPassword({ rawToken, newPassword: 'kort1' });
    expect(reset.ok).toBe(false);
    expect(reset.reden).toBe('WACHTWOORD_ZWAK');
  });

  test('een nieuwe resetaanvraag maakt de vorige link ongeldig', async () => {
    const { auth, mailer, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });

    await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const eersteLink = mailer.last('wachtwoord-reset').rawToken;
    await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const tweedeLink = mailer.last('wachtwoord-reset').rawToken;

    // De eerste (oude) link werkt niet meer; de nieuwste wel.
    expect((await auth.resetPassword({ rawToken: eersteLink, newPassword: NIEUW_WW })).ok).toBe(false);
    expect((await auth.resetPassword({ rawToken: tweedeLink, newPassword: NIEUW_WW })).ok).toBe(true);
  });

  test('beveiligingslogging: aanvraag en voltooiing gelogd, zonder wachtwoord of token (NFR-14)', async () => {
    const { auth, securityLog, mailer, maakGeverifieerdAccount } = createAuthTestHarness();
    await maakGeverifieerdAccount({ email: 'sanne@example.com', password: GOED_WW });
    await auth.requestPasswordReset({ email: 'sanne@example.com' });
    const { rawToken } = mailer.last('wachtwoord-reset');
    await auth.resetPassword({ rawToken, newPassword: NIEUW_WW });

    expect(securityLog.count(EVENT_TYPES.WACHTWOORD_RESET_AANGEVRAAGD)).toBe(1);
    expect(securityLog.count(EVENT_TYPES.WACHTWOORD_RESET_VOLTOOID)).toBe(1);

    const alleTekst = JSON.stringify(securityLog.entries());
    expect(alleTekst).not.toContain(NIEUW_WW);
    expect(alleTekst).not.toContain(rawToken);
  });
});
