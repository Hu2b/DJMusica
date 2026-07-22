const { InMemorySessionStore } = require('./sessionStore');
const { createFakeClock } = require('./testSupport');

// Unit tests voor de sessie-opslag.

describe('InMemorySessionStore', () => {
  test('een nieuwe sessie krijgt een id en is actief', () => {
    const store = new InMemorySessionStore({ now: createFakeClock() });
    const s = store.create('user-1');
    expect(s.id).toBeDefined();
    expect(store.isActive(s.id)).toBe(true);
  });

  test('destroy beëindigt één sessie', () => {
    const store = new InMemorySessionStore({ now: createFakeClock() });
    const s = store.create('user-1');
    store.destroy(s.id);
    expect(store.isActive(s.id)).toBe(false);
  });

  test('destroyAllForUser beëindigt alle sessies van een account (FR-34)', () => {
    const store = new InMemorySessionStore({ now: createFakeClock() });
    const s1 = store.create('user-1');
    const s2 = store.create('user-1');
    const anders = store.create('user-2');

    const aantal = store.destroyAllForUser('user-1');
    expect(aantal).toBe(2);
    expect(store.isActive(s1.id)).toBe(false);
    expect(store.isActive(s2.id)).toBe(false);
    // Sessies van een ander account blijven ongemoeid.
    expect(store.isActive(anders.id)).toBe(true);
  });
});
