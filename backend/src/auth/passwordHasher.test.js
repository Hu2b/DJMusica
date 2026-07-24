const { hashPassword, verifyPassword } = require('./passwordHasher');

// Unit tests voor wachtwoord-hashing (NFR-11).
// Sluit aan bij testset.md: "is mijn wachtwoord gehasht opgeslagen, niet in
// leesbare vorm".

describe('hashPassword / verifyPassword (NFR-11)', () => {
  test('de hash bevat het wachtwoord niet in leesbare vorm', async () => {
    const hash = await hashPassword('geheim-wachtwoord-123');
    expect(hash).not.toContain('geheim-wachtwoord-123');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  test('hetzelfde wachtwoord levert twee verschillende hashes op (eigen salt)', async () => {
    const a = await hashPassword('zelfde-wachtwoord');
    const b = await hashPassword('zelfde-wachtwoord');
    expect(a).not.toBe(b);
  });

  test('verifyPassword herkent het juiste wachtwoord', async () => {
    const hash = await hashPassword('mijn-wachtwoord');
    expect(await verifyPassword('mijn-wachtwoord', hash)).toBe(true);
  });

  test('verifyPassword wijst een fout wachtwoord af', async () => {
    const hash = await hashPassword('mijn-wachtwoord');
    expect(await verifyPassword('ander-wachtwoord', hash)).toBe(false);
  });

  test('verifyPassword faalt netjes bij een kapotte/onbekende hash', async () => {
    expect(await verifyPassword('x', 'geen-geldige-hash')).toBe(false);
    expect(await verifyPassword('x', null)).toBe(false);
  });

  test('hashPassword weigert een leeg wachtwoord', async () => {
    await expect(hashPassword('')).rejects.toThrow();
  });
});
