/**
 * Wachtwoordbeleid (FR-56)
 * ------------------------
 * Controleert of een gekozen wachtwoord voldoet aan de eisen:
 * - minimaal 8 tekens;
 * - een ruime maximumlengte (we hanteren 128, ruim boven de door FR-56
 *   genoemde 64+), zodat lange wachtzinnen ("passphrases") mogen;
 * - het wachtwoord mag niet voorkomen in bekende lijsten van gelekte
 *   wachtwoorden (de controle zelf zit in pwnedPasswords.js en wordt hier
 *   als functie "ingeprikt", zodat we in tests geen echte internetaanroep doen).
 *
 * BEWUST GEEN eis van "minimaal één hoofdletter/cijfer": FR-56 stelt dat
 * lengte en niet-gelekt-zijn belangrijker zijn dan zulke regels.
 */

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

// Redenen (codes) die we teruggeven; de leesbare Nederlandse tekst staat in MESSAGES.
const REASONS = {
  TE_KORT: 'TE_KORT',
  TE_LANG: 'TE_LANG',
  GELEKT: 'GELEKT',
};

const MESSAGES = {
  [REASONS.TE_KORT]: `Kies een wachtwoord van minimaal ${MIN_LENGTH} tekens.`,
  [REASONS.TE_LANG]: `Een wachtwoord mag maximaal ${MAX_LENGTH} tekens lang zijn.`,
  [REASONS.GELEKT]:
    'Dit wachtwoord staat in bekende lijsten van gelekte wachtwoorden. Kies er een die je nergens anders gebruikt.',
};

/**
 * Valideert een wachtwoord tegen het beleid.
 *
 * @param {string} password - het door de gebruiker gekozen wachtwoord
 * @param {object} [opts]
 * @param {(password: string) => Promise<boolean>} [opts.pwnedChecker]
 *   Optionele functie die `true` teruggeeft als het wachtwoord gelekt is.
 *   Wordt overgeslagen als hij niet is meegegeven (bv. in pure lengte-tests).
 * @returns {Promise<{ ok: boolean, reasons: string[], messages: string[] }>}
 */
async function validatePassword(password, { pwnedChecker } = {}) {
  const reasons = [];

  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    reasons.push(REASONS.TE_KORT);
  } else if (password.length > MAX_LENGTH) {
    reasons.push(REASONS.TE_LANG);
  }

  // Alleen de (duurdere) gelekt-controle draaien als de lengte al klopt.
  if (reasons.length === 0 && typeof pwnedChecker === 'function') {
    const isPwned = await pwnedChecker(password);
    if (isPwned) {
      reasons.push(REASONS.GELEKT);
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    messages: reasons.map((r) => MESSAGES[r]),
  };
}

module.exports = {
  MIN_LENGTH,
  MAX_LENGTH,
  REASONS,
  MESSAGES,
  validatePassword,
};
