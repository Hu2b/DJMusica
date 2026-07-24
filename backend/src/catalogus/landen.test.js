const { alleLandennamen, zoekLanden, isGeldigLand, landVoorCode } = require('./landen');

// Unit tests voor de canonieke landenlijst (FR-28c/28d).

describe('landen', () => {
  test('de lijst wordt alfabetisch gesorteerd getoond', () => {
    const namen = alleLandennamen();
    const gesorteerd = [...namen].sort((a, b) => a.localeCompare(b));
    expect(namen).toEqual(gesorteerd);
    expect(namen).toContain('Netherlands');
  });

  // FR-28d: zoeken filtert op letters die ergens in de naam voorkomen.
  test.each([
    ['land', 'Netherlands'],
    ['land', 'Finland'],
    ['land', 'Ireland'],
    ['ing', 'United Kingdom'],
  ])('zoeken op "%s" bevat "%s"', (term, verwacht) => {
    expect(zoekLanden(term)).toContain(verwacht);
  });

  test('zoeken is hoofdletter-ongevoelig en werkt op een deel van de naam', () => {
    expect(zoekLanden('NETHER')).toContain('Netherlands');
    expect(zoekLanden('kingdom')).toContain('United Kingdom');
  });

  test('alleen landen uit de vaste lijst zijn geldig (FR-28c)', () => {
    expect(isGeldigLand('Netherlands')).toBe(true);
    expect(isGeldigLand('netherlands')).toBe(true);
    expect(isGeldigLand('Verzonnenland')).toBe(false);
    expect(isGeldigLand('')).toBe(false);
  });

  test('ISO-code wordt vertaald naar de canonieke naam', () => {
    expect(landVoorCode('GB')).toBe('United Kingdom');
    expect(landVoorCode('nl')).toBe('Netherlands');
    expect(landVoorCode('US')).toBe('United States');
    expect(landVoorCode('XX')).toBeNull();
  });
});
