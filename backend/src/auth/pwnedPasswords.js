/**
 * Gelekte-wachtwoorden-controle (FR-56)
 * -------------------------------------
 * Controleert of een wachtwoord voorkomt in bekende datalekken, via de gratis
 * dienst "HaveIBeenPwned". Belangrijk: het wachtwoord zelf verlaat NOOIT ons
 * systeem. We gebruiken "k-anonimiteit":
 *   1. we berekenen de SHA-1-hash van het wachtwoord;
 *   2. we sturen alleen de EERSTE 5 tekens van die hash naar de dienst;
 *   3. de dienst stuurt alle bekende hashes terug die met die 5 tekens beginnen;
 *   4. wij kijken lokaal of onze volledige hash daartussen zit.
 *
 * Zo weet de externe dienst nooit welk wachtwoord (of welke gebruiker) het betreft.
 *
 * In tests gebruiken we NOOIT deze echte netwerk-versie, maar een nep-checker
 * met een klein lijstje (zie testSupport.js). Deze module wordt pas in de
 * echte draaiende app aangeroepen.
 */

const crypto = require('crypto');
const https = require('https');

const RANGE_API = 'https://api.pwnedpasswords.com/range/';

function httpsGetText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'DJMusica-AuthService' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HaveIBeenPwned gaf status ${res.statusCode}`));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('HaveIBeenPwned time-out')));
  });
}

/**
 * @param {string} password
 * @returns {Promise<boolean>} true als het wachtwoord in een bekend lek voorkomt
 */
async function isPasswordPwned(password) {
  const sha1 = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const body = await httpsGetText(RANGE_API + prefix);
  // Elke regel is: <resthash>:<aantal keer gezien>
  return body.split('\n').some((line) => line.split(':')[0].trim() === suffix);
}

module.exports = {
  isPasswordPwned,
};
