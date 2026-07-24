/**
 * Resend-mailer (echte e-mailkoppeling)
 * -------------------------------------
 * De "echte" versie van de mailer die de Auth Service gebruikt: hij verstuurt
 * verificatie- en wachtwoord-reset-mails via de dienst Resend (https://resend.com).
 * In tests wordt hij niet gebruikt — daar gebruiken we de nep-mailer uit
 * testSupport.js — maar in de draaiende app vervangt hij die.
 *
 * Deze mailer heeft exact dezelfde methodes als de nep-mailer:
 *   - sendVerificationEmail({ email, rawToken })
 *   - sendPasswordResetEmail({ email, rawToken })
 *   - sendAccountExistsNotice({ email })
 * zodat hij zonder verdere aanpassingen "van buitenaf" in de Auth Service past.
 *
 * Beveiliging:
 *  - de API-sleutel komt uit een omgevingsvariabele (RESEND_API_KEY), NOOIT uit
 *    de code, en verschijnt nergens in logs of foutmeldingen;
 *  - de netwerk-aanroep zit achter een injecteerbare `httpPost`, zodat tests
 *    geen echte mail versturen.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Standaard-verzendfunctie: doet de echte POST naar Resend met de globale fetch
 * (aanwezig in Node 22). Geeft bij een foutstatus een nette fout, zonder de
 * API-sleutel prijs te geven.
 */
async function defaultHttpPost(url, { apiKey, payload }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const tekst = await res.text();
  if (!res.ok) {
    // Bewust alleen status + antwoordtekst; de sleutel staat hier niet in.
    throw new Error(`Resend gaf status ${res.status}: ${tekst}`);
  }
  return tekst ? JSON.parse(tekst) : {};
}

class ResendMailer {
  /**
   * @param {object} opts
   * @param {string} opts.apiKey - Resend API-sleutel (uit RESEND_API_KEY)
   * @param {string} [opts.from] - afzender, standaard een noreply op het eigen domein
   * @param {string} [opts.baseUrl] - basis-URL van de app, voor de links in de mail
   * @param {Function} [opts.httpPost] - injecteerbare verzendfunctie (voor tests)
   */
  constructor({
    apiKey,
    from = 'DJMusica <noreply@djmusica.fun>',
    baseUrl = 'https://djmusica.fun',
    httpPost = defaultHttpPost,
  } = {}) {
    if (!apiKey) {
      throw new Error('ResendMailer: API-sleutel ontbreekt (zet RESEND_API_KEY).');
    }
    this.apiKey = apiKey;
    this.from = from;
    // Trailing slash weghalen zodat we links netjes kunnen samenstellen.
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.httpPost = httpPost;
  }

  _link(pad, rawToken) {
    return `${this.baseUrl}/${pad}?token=${encodeURIComponent(rawToken)}`;
  }

  async _send({ to, subject, html, text }) {
    return this.httpPost(RESEND_ENDPOINT, {
      apiKey: this.apiKey,
      payload: { from: this.from, to: [to], subject, html, text },
    });
  }

  /** Verificatiemail bij registratie (FR-55). */
  async sendVerificationEmail({ email, rawToken }) {
    const link = this._link('verifieer', rawToken);
    return this._send({
      to: email,
      subject: 'Bevestig je DJMusica-account',
      text:
        `Welkom bij DJMusica!\n\n` +
        `Klik op de onderstaande link om je account te activeren (24 uur geldig):\n${link}\n\n` +
        `Heb je je niet aangemeld? Dan kun je deze e-mail negeren.`,
      html:
        `<p>Welkom bij <strong>DJMusica</strong>!</p>` +
        `<p>Klik op de knop om je account te activeren (24 uur geldig):</p>` +
        `<p><a href="${link}">Account activeren</a></p>` +
        `<p style="color:#666">Heb je je niet aangemeld? Dan kun je deze e-mail negeren.</p>`,
    });
  }

  /** Wachtwoord-reset-mail (FR-34). */
  async sendPasswordResetEmail({ email, rawToken }) {
    const link = this._link('wachtwoord-reset', rawToken);
    return this._send({
      to: email,
      subject: 'Stel je DJMusica-wachtwoord opnieuw in',
      text:
        `Je hebt gevraagd om je wachtwoord opnieuw in te stellen.\n\n` +
        `Klik op de onderstaande link (1 uur geldig, eenmalig bruikbaar):\n${link}\n\n` +
        `Heb je dit niet aangevraagd? Dan hoef je niets te doen; je wachtwoord blijft ongewijzigd.`,
      html:
        `<p>Je hebt gevraagd om je wachtwoord opnieuw in te stellen.</p>` +
        `<p>Klik op de knop (1 uur geldig, eenmalig bruikbaar):</p>` +
        `<p><a href="${link}">Nieuw wachtwoord instellen</a></p>` +
        `<p style="color:#666">Heb je dit niet aangevraagd? Dan hoef je niets te doen; je wachtwoord blijft ongewijzigd.</p>`,
    });
  }

  /**
   * Informatieve mail aan de bestaande eigenaar wanneer iemand probeert te
   * registreren met een al bestaand e-mailadres (FR-55). Bevat geen link met
   * token — het bestaande account verandert niet.
   */
  async sendAccountExistsNotice({ email }) {
    const login = `${this.baseUrl}/inloggen`;
    const reset = `${this.baseUrl}/wachtwoord-vergeten`;
    return this._send({
      to: email,
      subject: 'Er is een registratiepoging met jouw e-mailadres gedaan',
      text:
        `Iemand probeerde een DJMusica-account aan te maken met dit e-mailadres, ` +
        `maar er bestaat al een account.\n\n` +
        `Was jij dit? Log gewoon in: ${login}\n` +
        `Wachtwoord kwijt? Stel het opnieuw in: ${reset}\n\n` +
        `Was jij dit niet? Dan hoef je niets te doen; er is geen nieuw account aangemaakt.`,
      html:
        `<p>Iemand probeerde een DJMusica-account aan te maken met dit e-mailadres, ` +
        `maar er bestaat al een account.</p>` +
        `<p>Was jij dit? <a href="${login}">Log gewoon in</a>. ` +
        `Wachtwoord kwijt? <a href="${reset}">Stel het opnieuw in</a>.</p>` +
        `<p style="color:#666">Was jij dit niet? Dan hoef je niets te doen; er is geen nieuw account aangemaakt.</p>`,
    });
  }
}

/**
 * Bouwt een ResendMailer op basis van omgevingsvariabelen. Dit is wat de echte
 * server straks aanroept.
 *   - RESEND_API_KEY  (verplicht)
 *   - RESEND_FROM     (optioneel, standaard noreply@djmusica.fun)
 *   - APP_BASE_URL    (optioneel, standaard https://djmusica.fun)
 */
function createResendMailerFromEnv(env = process.env) {
  return new ResendMailer({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM || undefined,
    baseUrl: env.APP_BASE_URL || undefined,
  });
}

module.exports = {
  ResendMailer,
  createResendMailerFromEnv,
  RESEND_ENDPOINT,
};
