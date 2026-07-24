const { versleutel, ontsleutel } = require('./encryptie');

// Unit tests voor de versleuteling van gevoelige gegevens (NFR-4).

const SLEUTEL = 'een-geheime-sleutel-voor-de-test';

describe('encryptie (NFR-4)', () => {
  test('versleutelde tekst is niet leesbaar en ontsleutelt weer naar het origineel', () => {
    const geheim = 'mijn-spotify-client-secret-123';
    const cijfer = versleutel(geheim, SLEUTEL);

    expect(cijfer).not.toContain(geheim);
    expect(ontsleutel(cijfer, SLEUTEL)).toBe(geheim);
  });

  test('twee keer versleutelen geeft verschillende cijfertekst (eigen willekeur)', () => {
    const a = versleutel('zelfde', SLEUTEL);
    const b = versleutel('zelfde', SLEUTEL);
    expect(a).not.toBe(b);
    expect(ontsleutel(a, SLEUTEL)).toBe('zelfde');
    expect(ontsleutel(b, SLEUTEL)).toBe('zelfde');
  });

  test('ontsleutelen met de verkeerde sleutel mislukt', () => {
    const cijfer = versleutel('geheim', SLEUTEL);
    expect(() => ontsleutel(cijfer, 'andere-sleutel')).toThrow();
  });

  test('geknoei met de cijfertekst wordt gedetecteerd (AES-GCM)', () => {
    const cijfer = versleutel('geheim', SLEUTEL);
    const geknoeid = cijfer.slice(0, -2) + (cijfer.endsWith('A') ? 'B' : 'A');
    expect(() => ontsleutel(geknoeid, SLEUTEL)).toThrow();
  });
});
