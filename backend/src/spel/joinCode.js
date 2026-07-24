/**
 * Join-codes (FR-59)
 * ------------------
 * De code die spelers invoeren om mee te doen. Eisen:
 *  - minimaal 6 tekens;
 *  - uit een tekenset zónder verwarrende tekens: geen 0/O en geen 1/I;
 *  - cryptografisch willekeurig gekozen.
 * Vervaltijd en rate-limiting zitten in de sessie-logica (zie sessieService.js).
 */

const crypto = require('crypto');

// Hoofdletters zonder I en O; cijfers zonder 0 en 1.
const TEKENSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STANDAARD_LENGTE = 6;

/**
 * Genereert een willekeurige join-code.
 * @param {number} [lengte=6]
 * @returns {string}
 */
function genereerJoinCode(lengte = STANDAARD_LENGTE) {
  const n = Math.max(STANDAARD_LENGTE, lengte);
  const bytes = crypto.randomBytes(n);
  let code = '';
  for (let i = 0; i < n; i++) {
    code += TEKENSET[bytes[i] % TEKENSET.length];
  }
  return code;
}

/** Controleert of een code aan het formaat voldoet (lengte + toegestane tekens). */
function isGeldigFormaat(code) {
  return typeof code === 'string' && new RegExp(`^[${TEKENSET}]{${STANDAARD_LENGTE},}$`).test(code);
}

/** Normaliseert invoer (hoofdletters, spaties eruit) zodat "abc 7xk" ook werkt. */
function normaliseerCode(code) {
  return String(code ?? '').replace(/\s+/g, '').toUpperCase();
}

module.exports = {
  TEKENSET,
  STANDAARD_LENGTE,
  genereerJoinCode,
  isGeldigFormaat,
  normaliseerCode,
};
