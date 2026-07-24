/**
 * Wachtwoord-hashing (NFR-11, NFR-4)
 * ----------------------------------
 * Wachtwoorden worden NOOIT leesbaar opgeslagen. We bewaren alleen een
 * "hash": een onomkeerbare versleuteling waaruit het oorspronkelijke
 * wachtwoord niet terug te rekenen is.
 *
 * We gebruiken scrypt, een algoritme dat standaard in Node.js zit (module
 * `crypto`). Voordelen:
 * - geen extra externe bibliotheek nodig (past bij "gratis en simpel houden");
 * - scrypt is "geheugen-zwaar", wat het voor aanvallers duur maakt om massaal
 *   wachtwoorden te raden. bcrypt/argon2 (genoemd in de architectuur) zijn
 *   gelijkwaardige alternatieven; scrypt is hier gekozen omdat het zonder
 *   installatie meteen werkt in de CI.
 *
 * Elke hash krijgt een eigen willekeurige "salt" (extra willekeur), zodat
 * twee gebruikers met hetzelfde wachtwoord toch verschillende hashes hebben.
 * De opgeslagen tekst bevat alle parameters, zodat we later kunnen verifiëren:
 *   scrypt$<N>$<r>$<p>$<salt-hex>$<hash-hex>
 */

const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

// scrypt-parameters. N is de "kostenfactor"; hoger = veiliger maar trager.
const N = 16384; // 2^14
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Maakt een opslagbare hash van een wachtwoord.
 * @param {string} password
 * @returns {Promise<string>} tekst in het formaat scrypt$N$r$p$salt$hash
 */
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('hashPassword: wachtwoord ontbreekt');
  }
  const salt = crypto.randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Controleert of een ingevoerd wachtwoord bij een opgeslagen hash hoort.
 * @param {string} password - het zojuist ingevoerde wachtwoord
 * @param {string} stored - de eerder opgeslagen hash-tekst
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');

  const derived = await scryptAsync(password, salt, expected.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
  });

  // Vaste-tijd-vergelijking, zodat de vergelijking niet verklapt hoeveel
  // tekens klopten (bescherming tegen zgn. timing-aanvallen).
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
