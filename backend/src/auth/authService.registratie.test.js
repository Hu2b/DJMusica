const { createAuthTestHarness } = require('./testSupport');
const { NEUTRALE_REGISTRATIE_MELDING } = require('./authService');
const { EVENT_TYPES } = require('./securityLog');

// Integratietests voor STAP 1: registreren met e-mailverificatie.
// Deze testen de Auth Service als geheel (opslag + tokens + mailer + log samen).
// Gebaseerd op testset.md sectie 0:
//  - Feature "Registreren en inloggen" (Nieuw account aanmaken)
//  - Feature "E-mailverificatie en wachtwoordeisen" (FR-55, FR-56)

describe('Auth Service - registreren (FR-33, FR-55, FR-56)', () => {
  test('nieuw account aanmaken: account bestaat, wachtwoord is gehasht opgeslagen', async () => {
    const { auth, userStore, mailer } = createAuthTestHarness();

    const resultaat = await auth.register({
      email: 'sanne@example.com',
      password: 'een-goed-wachtwoord',
      ip: '10.0.0.1',
    });

    expect(resultaat.ok).toBe(true);
    expect(resultaat.message).toBe(NEUTRALE_REGISTRATIE_MELDING);

    const user = userStore.findByEmail('sanne@example.com');
    expect(user).not.toBeNull();
    // Wachtwoord is gehasht, niet leesbaar opgeslagen (testset.md).
    expect(user.wachtwoordHash).toBeDefined();
    expect(user.wachtwoordHash).not.toContain('een-goed-wachtwoord');
    // Er is een verificatiemail verstuurd.
    expect(mailer.last('verificatie')).not.toBeNull();
  });

  test('account is pas bruikbaar ná het klikken op de verificatielink (FR-55)', async () => {
    const { auth, userStore, mailer } = createAuthTestHarness();
    await auth.register({ email: 'sanne@example.com', password: 'een-goed-wachtwoord' });

    const user = userStore.findByEmail('sanne@example.com');
    // Vóór verificatie: niet bruikbaar.
    expect(auth.isAccountBruikbaar(user.id)).toBe(false);
    expect(user.emailGeverifieerdOp).toBeNull();

    // Klik op de link uit de mail.
    const { rawToken } = mailer.last('verificatie');
    const verificatie = await auth.verifyEmail({ rawToken });

    expect(verificatie.ok).toBe(true);
    expect(auth.isAccountBruikbaar(user.id)).toBe(true);
  });

  test('e-mailadres wordt hoofdletter-ongevoelig behandeld', async () => {
    const { auth, userStore } = createAuthTestHarness();
    await auth.register({ email: 'Sanne@Example.com', password: 'een-goed-wachtwoord' });
    expect(userStore.findByEmail('sanne@example.com')).not.toBeNull();
  });

  describe('registreren met een al bestaand e-mailadres onthult niets (FR-55)', () => {
    test('zelfde neutrale melding, geen tweede account, wel een mail naar de eigenaar', async () => {
      const { auth, userStore, mailer } = createAuthTestHarness();

      const eerste = await auth.register({
        email: 'sanne@example.com',
        password: 'een-goed-wachtwoord',
      });
      const idNaEerste = userStore.findByEmail('sanne@example.com').id;

      const tweede = await auth.register({
        email: 'sanne@example.com',
        password: 'een-ander-goed-wachtwoord',
      });

      // 1. Exact dezelfde melding als bij een nieuwe registratie.
      expect(tweede.ok).toBe(true);
      expect(tweede.message).toBe(eerste.message);

      // 2. Geen nieuw/gewijzigd account (het blijft hetzelfde account).
      expect(userStore.findByEmail('sanne@example.com').id).toBe(idNaEerste);

      // 3. De bestaande eigenaar krijgt een informatieve mail (geen nieuw account).
      expect(mailer.last('account-bestaat-al')).not.toBeNull();
    });
  });

  describe('wachtwoordeisen (FR-56)', () => {
    test('te kort wachtwoord wordt geweigerd, met uitleg, en er ontstaat geen account', async () => {
      const { auth, userStore, mailer } = createAuthTestHarness();
      const resultaat = await auth.register({ email: 'kort@example.com', password: 'kort1' });

      expect(resultaat.ok).toBe(false);
      expect(resultaat.messages.join(' ')).toMatch(/8 tekens/);
      expect(userStore.findByEmail('kort@example.com')).toBeNull();
      expect(mailer.sent).toHaveLength(0);
    });

    test('bekend gelekt wachtwoord ("welkom123") wordt geweigerd', async () => {
      const { auth, userStore } = createAuthTestHarness();
      const resultaat = await auth.register({ email: 'lek@example.com', password: 'welkom123' });

      expect(resultaat.ok).toBe(false);
      expect(resultaat.messages.join(' ')).toMatch(/gelekt/i);
      expect(userStore.findByEmail('lek@example.com')).toBeNull();
    });
  });

  describe('e-mailverificatie via de link (FR-55)', () => {
    test('een tweede klik op dezelfde link heeft geen effect (eenmalig)', async () => {
      const { auth, mailer } = createAuthTestHarness();
      await auth.register({ email: 'sanne@example.com', password: 'een-goed-wachtwoord' });
      const { rawToken } = mailer.last('verificatie');

      expect((await auth.verifyEmail({ rawToken })).ok).toBe(true);
      const tweede = await auth.verifyEmail({ rawToken });
      expect(tweede.ok).toBe(false);
      expect(tweede.reden).toBe('AL_GEBRUIKT');
    });

    test('een verlopen verificatielink (na 25 uur) werkt niet meer', async () => {
      const { auth, userStore, mailer, now } = createAuthTestHarness();
      await auth.register({ email: 'laat@example.com', password: 'een-goed-wachtwoord' });
      const { rawToken } = mailer.last('verificatie');

      now.advance(25 * 60 * 60 * 1000); // 25 uur later
      const verificatie = await auth.verifyEmail({ rawToken });

      expect(verificatie.ok).toBe(false);
      expect(verificatie.reden).toBe('VERLOPEN');
      expect(auth.isAccountBruikbaar(userStore.findByEmail('laat@example.com').id)).toBe(false);
    });
  });

  describe('beveiligingslogging (NFR-14)', () => {
    test('registratie en verificatie worden gelogd, zonder wachtwoord of token', async () => {
      const { auth, securityLog, mailer } = createAuthTestHarness();
      await auth.register({ email: 'sanne@example.com', password: 'een-goed-wachtwoord', ip: '10.0.0.1' });
      const { rawToken } = mailer.last('verificatie');
      await auth.verifyEmail({ rawToken, ip: '10.0.0.1' });

      expect(securityLog.count(EVENT_TYPES.REGISTRATIE_GESTART)).toBe(1);
      expect(securityLog.count(EVENT_TYPES.EMAIL_GEVERIFIEERD)).toBe(1);

      // Geen enkele logregel bevat het wachtwoord of het rauwe token.
      const alleTekst = JSON.stringify(securityLog.entries());
      expect(alleTekst).not.toContain('een-goed-wachtwoord');
      expect(alleTekst).not.toContain(rawToken);
    });

    test('een poging op een bestaand e-mailadres wordt apart gelogd', async () => {
      const { auth, securityLog } = createAuthTestHarness();
      await auth.register({ email: 'sanne@example.com', password: 'een-goed-wachtwoord' });
      await auth.register({ email: 'sanne@example.com', password: 'nog-een-wachtwoord' });

      expect(securityLog.count(EVENT_TYPES.REGISTRATIE_BESTAAND_EMAIL)).toBe(1);
    });
  });
});
