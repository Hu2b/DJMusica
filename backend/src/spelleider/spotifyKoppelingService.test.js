const { createSpelleiderHarness, TEST_SLEUTEL } = require('./testSupport');
const { ontsleutel } = require('./encryptie');

// Integratietests voor STAP 3: eigen Spotify-app koppelen (FR-37, FR-38, FR-36, NFR-4).
// Gebaseerd op testset.md §0 "Eigen Spotify-app koppelen als spelleider" en
// "Eén account, meerdere rollen".

describe('SpotifyKoppelingService (FR-37, FR-38, FR-36, NFR-4)', () => {
  test('de wizard toont een vaste, kopieerbare redirect-URI (FR-37)', () => {
    const h = createSpelleiderHarness();
    expect(h.service.getRedirectUri()).toBe('https://djmusica.fun/spelleider/spotify/callback');
  });

  test('geldige Client ID/Secret koppelen: gevalideerd, opgeslagen, en account kan hosten', async () => {
    const h = createSpelleiderHarness({ authOpts: { geldig: true } });
    const user = h.maakSpelerAccount();

    const r = await h.service.koppelSpotifyApp({
      userId: user.id,
      clientId: 'client-123',
      clientSecret: 'secret-xyz',
    });

    expect(r.ok).toBe(true);
    expect(h.service.kanHosten(user.id)).toBe(true);
  });

  test('de spelleider-rol wordt geactiveerd, naast de bestaande speler-rol (FR-36)', async () => {
    const h = createSpelleiderHarness();
    const user = h.maakSpelerAccount();
    expect(user.rollen).toEqual(['speler']);

    await h.service.koppelSpotifyApp({ userId: user.id, clientId: 'c', clientSecret: 's' });

    const na = h.userStore.findById(user.id);
    expect(na.rollen).toContain('speler');
    expect(na.rollen).toContain('spelleider');
  });

  test('de Client Secret wordt alleen versleuteld opgeslagen en nooit teruggegeven (NFR-4)', async () => {
    const h = createSpelleiderHarness();
    const user = h.maakSpelerAccount();
    await h.service.koppelSpotifyApp({ userId: user.id, clientId: 'client-123', clientSecret: 'supergeheim' });

    // In de opslag staat geen leesbaar secret...
    const opgeslagen = h.spotifyAppStore.findByUserId(user.id);
    expect(opgeslagen.spotifyClientSecretEncrypted).not.toContain('supergeheim');
    // ...maar het is met de sleutel wél weer te ontsleutelen (voor gebruik met Spotify).
    expect(ontsleutel(opgeslagen.spotifyClientSecretEncrypted, TEST_SLEUTEL)).toBe('supergeheim');

    // De status-functie geeft nooit het secret terug.
    const status = h.service.getKoppelingStatus(user.id);
    expect(status.gekoppeld).toBe(true);
    expect(status.spotifyClientId).toBe('client-123');
    expect(JSON.stringify(status)).not.toContain('supergeheim');
  });

  test('ongeldige credentials worden geweigerd: geen koppeling, geen spelleider-rol', async () => {
    const h = createSpelleiderHarness({ authOpts: { geldig: false } });
    const user = h.maakSpelerAccount();

    const r = await h.service.koppelSpotifyApp({ userId: user.id, clientId: 'c', clientSecret: 'fout' });

    expect(r.ok).toBe(false);
    expect(r.reden).toBe('ONGELDIGE_CREDENTIALS');
    expect(h.service.kanHosten(user.id)).toBe(false);
    expect(h.userStore.findById(user.id).rollen).not.toContain('spelleider');
  });

  test('ontbrekende invoer wordt netjes geweigerd', async () => {
    const h = createSpelleiderHarness();
    const user = h.maakSpelerAccount();
    const r = await h.service.koppelSpotifyApp({ userId: user.id, clientId: '', clientSecret: '' });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('ONTBREEKT');
  });

  test('meerdere spelleiders koppelen onafhankelijk hun eigen app (FR-38)', async () => {
    const h = createSpelleiderHarness({
      authOpts: {
        geldigeParen: [
          { clientId: 'anna-id', clientSecret: 'anna-secret' },
          { clientId: 'bram-id', clientSecret: 'bram-secret' },
        ],
      },
    });
    const anna = h.userStore.create({ email: 'anna@example.com', wachtwoordHash: 'x', rollen: ['speler'] });
    const bram = h.userStore.create({ email: 'bram@example.com', wachtwoordHash: 'x', rollen: ['speler'] });

    expect((await h.service.koppelSpotifyApp({ userId: anna.id, clientId: 'anna-id', clientSecret: 'anna-secret' })).ok).toBe(true);
    expect((await h.service.koppelSpotifyApp({ userId: bram.id, clientId: 'bram-id', clientSecret: 'bram-secret' })).ok).toBe(true);

    // Elk heeft zijn eigen, losse koppeling.
    expect(h.service.getKoppelingStatus(anna.id).spotifyClientId).toBe('anna-id');
    expect(h.service.getKoppelingStatus(bram.id).spotifyClientId).toBe('bram-id');
  });
});
