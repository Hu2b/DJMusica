/**
 * Test-hulpmiddelen voor de Auth Service
 * --------------------------------------
 * Nep-versies ("test doubles") van de buitenwereld, zodat tests snel en zonder
 * echte database, e-mailserver of internet draaien (conform bouwplan Fase 2:
 * geen echte externe API-calls in tests).
 *
 * Dit bestand bevat GEEN tests zelf; het wordt door de test-bestanden ingeladen.
 */

const { InMemoryUserStore } = require('./userStore');
const { InMemoryTokenStore } = require('./tokenStore');
const { InMemoryLoginThrottle } = require('./loginThrottle');
const { InMemorySessionStore } = require('./sessionStore');
const { SecurityLog } = require('./securityLog');
const { AuthService } = require('./authService');

/**
 * Een verstelbare klok. Standaard begint hij op een vast tijdstip; met
 * advance(ms) laat je "de tijd verstrijken" in een test.
 */
function createFakeClock(startMs = 1_700_000_000_000) {
  let current = startMs;
  const now = () => current;
  now.advance = (ms) => {
    current += ms;
    return current;
  };
  now.set = (ms) => {
    current = ms;
    return current;
  };
  return now;
}

/** Nep-mailer die verstuurde e-mails onthoudt, zodat tests ze kunnen inspecteren. */
function createFakeMailer() {
  const sent = [];
  return {
    sent,
    async sendVerificationEmail({ email, rawToken }) {
      sent.push({ kind: 'verificatie', email, rawToken });
    },
    async sendAccountExistsNotice({ email }) {
      sent.push({ kind: 'account-bestaat-al', email });
    },
    async sendPasswordResetEmail({ email, rawToken }) {
      sent.push({ kind: 'wachtwoord-reset', email, rawToken });
    },
    /** Handig in tests: de laatste mail naar een adres van een bepaald soort. */
    last(kind) {
      return [...sent].reverse().find((m) => m.kind === kind) || null;
    },
    lastTo(email, kind) {
      return [...sent]
        .reverse()
        .find((m) => m.email === email && (!kind || m.kind === kind)) || null;
    },
  };
}

/**
 * Nep gelekt-wachtwoord-check (FR-56) met een klein, vast lijstje. Zo hoeven
 * tests niet naar het echte HaveIBeenPwned. "welkom123" staat erin, zodat het
 * scenario uit testset.md ("bekend gelekt wachtwoord wordt geweigerd") werkt.
 */
function createFakePwnedChecker(extra = []) {
  const gelekt = new Set(
    ['welkom123', 'password', '12345678', 'wachtwoord', 'qwerty123', ...extra].map((p) =>
      p.toLowerCase()
    )
  );
  return async (password) => gelekt.has(String(password).toLowerCase());
}

/**
 * Bouwt een complete Auth Service met verse in-memory opslag en nepversies.
 * Geeft ook de losse onderdelen terug, zodat een test bv. het beveiligingslog
 * of de verstuurde mails kan controleren.
 */
function createAuthTestHarness({ pwned = [], now = createFakeClock() } = {}) {
  const userStore = new InMemoryUserStore({ now });
  const tokenStore = new InMemoryTokenStore({ now });
  const loginThrottle = new InMemoryLoginThrottle({ now });
  const sessionStore = new InMemorySessionStore({ now });
  const securityLog = new SecurityLog({ now });
  const mailer = createFakeMailer();
  const pwnedChecker = createFakePwnedChecker(pwned);

  const auth = new AuthService({
    userStore,
    tokenStore,
    mailer,
    securityLog,
    pwnedChecker,
    loginThrottle,
    sessionStore,
    now,
  });

  /**
   * Hulpje voor tests: maak snel een geverifieerd, klaar-om-in-te-loggen account.
   * @returns {Promise<{ userId: string }>}
   */
  async function maakGeverifieerdAccount({ email, password }) {
    await auth.register({ email, password });
    const verificatie = mailer.lastTo(email.toLowerCase(), 'verificatie');
    await auth.verifyEmail({ rawToken: verificatie.rawToken });
    return { userId: userStore.findByEmail(email).id };
  }

  return {
    auth,
    userStore,
    tokenStore,
    loginThrottle,
    sessionStore,
    securityLog,
    mailer,
    pwnedChecker,
    now,
    maakGeverifieerdAccount,
  };
}

module.exports = {
  createFakeClock,
  createFakeMailer,
  createFakePwnedChecker,
  createAuthTestHarness,
};
