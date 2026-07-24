const { validatePassword, MIN_LENGTH, REASONS } = require('./passwordPolicy');
const { createFakePwnedChecker } = require('./testSupport');

// Unit tests voor het wachtwoordbeleid (FR-56).
// Sluit aan bij testset.md: "Te kort wachtwoord wordt geweigerd" en
// "Bekend gelekt wachtwoord wordt geweigerd".

describe('validatePassword (FR-56)', () => {
  test('een wachtwoord van precies 8 tekens wordt geaccepteerd (grensgeval)', async () => {
    const resultaat = await validatePassword('abcdefgh');
    expect(resultaat.ok).toBe(true);
    expect(resultaat.reasons).toEqual([]);
  });

  test('een wachtwoord korter dan 8 tekens wordt geweigerd', async () => {
    const resultaat = await validatePassword('kort1');
    expect(resultaat.ok).toBe(false);
    expect(resultaat.reasons).toContain(REASONS.TE_KORT);
    // De uitleg noemt de minimumlengte, zodat de gebruiker weet wat er mis is.
    expect(resultaat.messages[0]).toContain(String(MIN_LENGTH));
  });

  test('een leeg of ontbrekend wachtwoord wordt geweigerd', async () => {
    expect((await validatePassword('')).ok).toBe(false);
    expect((await validatePassword(undefined)).ok).toBe(false);
  });

  test('een te lang wachtwoord (>128 tekens) wordt geweigerd', async () => {
    const resultaat = await validatePassword('a'.repeat(129));
    expect(resultaat.ok).toBe(false);
    expect(resultaat.reasons).toContain(REASONS.TE_LANG);
  });

  test('een lange wachtzin (passphrase) is prima', async () => {
    const resultaat = await validatePassword('paars paard eet graag verse frambozen');
    expect(resultaat.ok).toBe(true);
  });

  test('een bekend gelekt wachtwoord ("welkom123") wordt geweigerd', async () => {
    const resultaat = await validatePassword('welkom123', {
      pwnedChecker: createFakePwnedChecker(),
    });
    expect(resultaat.ok).toBe(false);
    expect(resultaat.reasons).toContain(REASONS.GELEKT);
  });

  test('een lang genoeg, niet-gelekt wachtwoord komt door de volledige controle', async () => {
    const resultaat = await validatePassword('een-uniek-wachtwoord-42', {
      pwnedChecker: createFakePwnedChecker(),
    });
    expect(resultaat.ok).toBe(true);
  });

  test('zonder pwnedChecker wordt de gelekt-controle overgeslagen (alleen lengte telt)', async () => {
    const resultaat = await validatePassword('welkom123'); // gelekt, maar geen checker meegegeven
    expect(resultaat.ok).toBe(true);
  });
});
