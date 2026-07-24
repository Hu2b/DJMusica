const { InMemoryTokenStore, TOKEN_TYPES, hashRawToken } = require('./tokenStore');
const { createFakeClock } = require('./testSupport');

// Unit tests voor de eenmalige e-maillinks/tokens (FR-34, FR-55).

describe('InMemoryTokenStore', () => {
  test('een uitgegeven token is minimaal 128 bits (32 hex-tekens) en wordt niet leesbaar bewaard', () => {
    const store = new InMemoryTokenStore({ now: createFakeClock() });
    const { rawToken } = store.issue('user-1', TOKEN_TYPES.EMAIL_VERIFICATIE);
    expect(rawToken).toHaveLength(32); // 16 bytes => 32 hex-tekens => 128 bits
    // In de opslag zit alleen de hash, niet het rauwe token.
    expect(store._byHash.has(rawToken)).toBe(false);
    expect(store._byHash.has(hashRawToken(rawToken))).toBe(true);
  });

  test('een geldig token kan één keer worden ingewisseld en geeft het juiste account terug', () => {
    const store = new InMemoryTokenStore({ now: createFakeClock() });
    const { rawToken } = store.issue('user-1', TOKEN_TYPES.EMAIL_VERIFICATIE);

    const eerste = store.consume(rawToken, TOKEN_TYPES.EMAIL_VERIFICATIE);
    expect(eerste).toEqual({ ok: true, userId: 'user-1' });
  });

  test('een tweede inwisseling van hetzelfde token faalt (eenmalig)', () => {
    const store = new InMemoryTokenStore({ now: createFakeClock() });
    const { rawToken } = store.issue('user-1', TOKEN_TYPES.WACHTWOORD_RESET);

    store.consume(rawToken, TOKEN_TYPES.WACHTWOORD_RESET);
    const tweede = store.consume(rawToken, TOKEN_TYPES.WACHTWOORD_RESET);
    expect(tweede).toEqual({ ok: false, reden: 'AL_GEBRUIKT' });
  });

  test('een verlopen token faalt (wachtwoord-reset na 1 uur + 1 minuut)', () => {
    const clock = createFakeClock();
    const store = new InMemoryTokenStore({ now: clock });
    const { rawToken } = store.issue('user-1', TOKEN_TYPES.WACHTWOORD_RESET); // 1 uur geldig

    clock.advance(61 * 60 * 1000); // 61 minuten later
    const resultaat = store.consume(rawToken, TOKEN_TYPES.WACHTWOORD_RESET);
    expect(resultaat).toEqual({ ok: false, reden: 'VERLOPEN' });
  });

  test('een e-mailverificatietoken is 24 uur geldig, net binnen de tijd lukt het', () => {
    const clock = createFakeClock();
    const store = new InMemoryTokenStore({ now: clock });
    const { rawToken } = store.issue('user-1', TOKEN_TYPES.EMAIL_VERIFICATIE);

    clock.advance(23 * 60 * 60 * 1000); // 23 uur later
    expect(store.consume(rawToken, TOKEN_TYPES.EMAIL_VERIFICATIE).ok).toBe(true);
  });

  test('een token van het verkeerde type wordt niet geaccepteerd', () => {
    const store = new InMemoryTokenStore({ now: createFakeClock() });
    const { rawToken } = store.issue('user-1', TOKEN_TYPES.EMAIL_VERIFICATIE);
    expect(store.consume(rawToken, TOKEN_TYPES.WACHTWOORD_RESET).ok).toBe(false);
  });

  test('een onzin-token wordt afgewezen zonder te crashen', () => {
    const store = new InMemoryTokenStore({ now: createFakeClock() });
    expect(store.consume('bestaat-niet', TOKEN_TYPES.EMAIL_VERIFICATIE).ok).toBe(false);
    expect(store.consume('', TOKEN_TYPES.EMAIL_VERIFICATIE).ok).toBe(false);
  });

  test('invalidateAllForUser trekt openstaande tokens van een type in', () => {
    const store = new InMemoryTokenStore({ now: createFakeClock() });
    const { rawToken } = store.issue('user-1', TOKEN_TYPES.WACHTWOORD_RESET);
    store.invalidateAllForUser('user-1', TOKEN_TYPES.WACHTWOORD_RESET);
    expect(store.consume(rawToken, TOKEN_TYPES.WACHTWOORD_RESET).reden).toBe('AL_GEBRUIKT');
  });
});
