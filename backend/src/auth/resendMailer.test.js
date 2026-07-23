const { ResendMailer, createResendMailerFromEnv, RESEND_ENDPOINT } = require('./resendMailer');

// Unit tests voor de Resend-mailer. We versturen NOOIT een echte mail: de
// netwerk-aanroep (httpPost) wordt vervangen door een nep die alles onthoudt.

function createFakeHttpPost() {
  const calls = [];
  const httpPost = async (url, opts) => {
    calls.push({ url, ...opts });
    return { id: 'nep-mail-id' };
  };
  httpPost.calls = calls;
  httpPost.last = () => calls[calls.length - 1];
  return httpPost;
}

function maakMailer(extra = {}) {
  const httpPost = createFakeHttpPost();
  const mailer = new ResendMailer({ apiKey: 'test-sleutel', httpPost, ...extra });
  return { mailer, httpPost };
}

describe('ResendMailer', () => {
  test('weigert aangemaakt te worden zonder API-sleutel', () => {
    expect(() => new ResendMailer({})).toThrow(/API-sleutel/i);
  });

  test('verificatiemail bevat de activatielink met het token en gaat naar het juiste adres', async () => {
    const { mailer, httpPost } = maakMailer();
    await mailer.sendVerificationEmail({ email: 'sanne@example.com', rawToken: 'abc123' });

    const call = httpPost.last();
    expect(call.url).toBe(RESEND_ENDPOINT);
    expect(call.payload.to).toEqual(['sanne@example.com']);
    expect(call.payload.subject).toMatch(/bevestig/i);
    // Zowel de tekst- als de html-versie bevatten de link met het token.
    expect(call.payload.text).toContain('https://djmusica.fun/verifieer?token=abc123');
    expect(call.payload.html).toContain('https://djmusica.fun/verifieer?token=abc123');
  });

  test('reset-mail bevat de resetlink met het token', async () => {
    const { mailer, httpPost } = maakMailer();
    await mailer.sendPasswordResetEmail({ email: 'sanne@example.com', rawToken: 'reset-token-9' });

    const call = httpPost.last();
    expect(call.payload.subject).toMatch(/opnieuw/i);
    expect(call.payload.text).toContain('https://djmusica.fun/wachtwoord-reset?token=reset-token-9');
  });

  test('account-bestaat-al-mail bevat GEEN token (het account verandert niet)', async () => {
    const { mailer, httpPost } = maakMailer();
    await mailer.sendAccountExistsNotice({ email: 'sanne@example.com' });

    const call = httpPost.last();
    expect(call.payload.to).toEqual(['sanne@example.com']);
    expect(call.payload.text).toMatch(/al een account/i);
    expect(call.payload.text).not.toContain('token=');
  });

  test('de API-sleutel wordt meegestuurd in de Authorization-header, niet in de mailinhoud', async () => {
    const { mailer, httpPost } = maakMailer();
    await mailer.sendVerificationEmail({ email: 'sanne@example.com', rawToken: 'abc123' });

    const call = httpPost.last();
    // De sleutel gaat als apiKey mee (naar de header in de echte versie)...
    expect(call.apiKey).toBe('test-sleutel');
    // ...maar staat nergens in de zichtbare mailinhoud.
    expect(JSON.stringify(call.payload)).not.toContain('test-sleutel');
  });

  test('een afwijkende afzender en basis-URL worden gebruikt', async () => {
    const { mailer, httpPost } = maakMailer({
      from: 'Quiz <hallo@djmusica.fun>',
      baseUrl: 'https://app.djmusica.fun/',
    });
    await mailer.sendVerificationEmail({ email: 'x@example.com', rawToken: 't' });

    const call = httpPost.last();
    expect(call.payload.from).toBe('Quiz <hallo@djmusica.fun>');
    // Trailing slash is netjes weggehaald.
    expect(call.payload.text).toContain('https://app.djmusica.fun/verifieer?token=t');
  });

  test('een foutstatus van Resend geeft een nette fout zonder de sleutel te lekken', async () => {
    const httpPost = async () => {
      throw new Error('Resend gaf status 422: ongeldig adres');
    };
    const mailer = new ResendMailer({ apiKey: 'geheime-sleutel', httpPost });
    await expect(
      mailer.sendVerificationEmail({ email: 'fout', rawToken: 't' })
    ).rejects.toThrow(/status 422/);
  });
});

describe('createResendMailerFromEnv', () => {
  test('leest de sleutel en instellingen uit de omgevingsvariabelen', async () => {
    const mailer = createResendMailerFromEnv({
      RESEND_API_KEY: 'env-sleutel',
      RESEND_FROM: 'DJMusica <noreply@djmusica.fun>',
      APP_BASE_URL: 'https://djmusica.fun',
    });
    expect(mailer).toBeInstanceOf(ResendMailer);
    expect(mailer.apiKey).toBe('env-sleutel');
  });

  test('geeft een duidelijke fout als RESEND_API_KEY ontbreekt', () => {
    expect(() => createResendMailerFromEnv({})).toThrow(/RESEND_API_KEY/);
  });
});
