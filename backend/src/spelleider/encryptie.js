/**
 * Versleuteling van gevoelige gegevens (NFR-4)
 * --------------------------------------------
 * De Spotify Client Secret (en later de OAuth-tokens) van een spelleider worden
 * NOOIT leesbaar opgeslagen. We versleutelen ze met AES-256-GCM. De sleutel komt
 * uit een omgevingsvariabele (SPOTIFY_ENCRYPTION_KEY), apart van de database
 * bewaard — zo levert een gestolen database alleen onbruikbare cijfertekst op.
 *
 * Verschil met wachtwoord-hashing: een wachtwoord hoeven we alleen te
 * vergelijken (onomkeerbaar hashen). Een Client Secret moeten we later weer
 * kunnen gebruiken om met Spotify te praten, dus dit is omkeerbare
 * versleuteling — met een sleutel die buiten de database blijft.
 */

const crypto = require('crypto');

/**
 * Maakt van een willekeurige sleutel-tekst een geldige 32-byte AES-sleutel
 * (via SHA-256). Zo werkt elke voldoende lange geheime tekst als sleutel.
 */
function normaliseerSleutel(raw) {
  if (!raw) throw new Error('Encryptiesleutel ontbreekt (zet SPOTIFY_ENCRYPTION_KEY).');
  return crypto.createHash('sha256').update(String(raw)).digest();
}

/**
 * Versleutelt tekst. Resultaat: "iv:tag:cijfertekst" (alledrie base64).
 * @param {string} plaintext
 * @param {string|Buffer} sleutel
 * @returns {string}
 */
function versleutel(plaintext, sleutel) {
  const key = Buffer.isBuffer(sleutel) ? sleutel : normaliseerSleutel(sleutel);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

/**
 * Ontsleutelt wat met `versleutel` is gemaakt.
 * @param {string} payload
 * @param {string|Buffer} sleutel
 * @returns {string}
 */
function ontsleutel(payload, sleutel) {
  const key = Buffer.isBuffer(sleutel) ? sleutel : normaliseerSleutel(sleutel);
  const delen = String(payload).split(':');
  if (delen.length !== 3) throw new Error('Ongeldige cijfertekst.');
  const [ivB64, tagB64, ctB64] = delen;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
  return pt.toString('utf8');
}

module.exports = {
  normaliseerSleutel,
  versleutel,
  ontsleutel,
};
