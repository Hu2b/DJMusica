const { alleLandennamen, zoekLanden, isGeldigLand, landVoorCode } = require('./landen');

// Unit tests voor de canonieke landenlijst (FR-28c/28d).

describe('landen', () => {
  test('de lijst wordt alfabetisch gesorteerd getoond en is Nederlandstalig (NFR-8)', () => {
    const namen = alleLandennamen();
    const gesorteerd = [...namen].sort((a, b) => a.localeCompare(b));
    expect(namen).toEqual(gesorteerd);
    expect(namen).toContain('Nederland');
    expect(namen).not.toContain('Netherlands'); // Engels hoort er niet meer in
  });

  // FR-28d: zoeken filtert op letters die ergens in de naam voorkomen (Nederlandse namen).
  test.each([
    ['land', 'Nederland'],
    ['land', 'Finland'],
    ['land', 'Ierland'],
    ['rijk', 'Verenigd Koninkrijk'],
  ])('zoeken op "%s" bevat "%s"', (term, verwacht) => {
    expect(zoekLanden(term)).toContain(verwacht);
  });

  test('zoeken is hoofdletter-ongevoelig en werkt op een deel van de naam', () => {
    expect(zoekLanden('NEDER')).toContain('Nederland');
    expect(zoekLanden('koninkrijk')).toContain('Verenigd Koninkrijk');
  });

  test('alleen landen uit de vaste lijst zijn geldig (FR-28c)', () => {
    expect(isGeldigLand('Nederland')).toBe(true);
    expect(isGeldigLand('nederland')).toBe(true);
    expect(isGeldigLand('Netherlands')).toBe(false); // Engelse naam telt niet
    expect(isGeldigLand('Verzonnenland')).toBe(false);
    expect(isGeldigLand('')).toBe(false);
  });

  test('ISO-code wordt vertaald naar de Nederlandse naam', () => {
    expect(landVoorCode('GB')).toBe('Verenigd Koninkrijk');
    expect(landVoorCode('nl')).toBe('Nederland');
    expect(landVoorCode('US')).toBe('Verenigde Staten');
    expect(landVoorCode('XX')).toBeNull();
  });
});
