const { createSpelHarness } = require('./testSupport');
const { STATUS } = require('./sessieStore');
const { JOIN_CODE_GELDIG_MS } = require('./sessieService');

// Integratietests voor STAP 4a: sessie + lobby + join-codes.
// Gebaseerd op testset.md §1 (Sessie & aanmelden, Eén actieve sessie per account,
// Veilige join-codes) en §4 (Instellingen kiezen).

const SPELLEIDER = 'spelleider-1';

describe('SessieService - aanmaken en aanmelden (FR-1 t/m FR-4)', () => {
  test('spelleider maakt een sessie aan en krijgt een join-code; status is lobby', () => {
    const h = createSpelHarness();
    const r = h.service.maakSessie({ spelleiderUserId: SPELLEIDER, spelleiderNaam: 'Rik' });

    expect(r.ok).toBe(true);
    expect(r.joinCode).toMatch(/^[A-Z2-9]{6,}$/);
    expect(h.sessieStore.findById(r.sessieId).status).toBe(STATUS.LOBBY);
  });

  test('hosten kan alleen met een gekoppelde Spotify-app (FR-37)', () => {
    const h = createSpelHarness({ magHosten: () => false });
    const r = h.service.maakSessie({ spelleiderUserId: SPELLEIDER });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('GEEN_SPOTIFY_KOPPELING');
  });

  test('een speler meldt zich aan en verschijnt in de deelnemerslijst', () => {
    const h = createSpelHarness();
    const { sessieId, joinCode } = h.service.maakSessie({ spelleiderUserId: SPELLEIDER });

    const r = h.service.join({ joinCode, userId: 'speler-sanne', naam: 'Sanne', ip: '1.1.1.1' });
    expect(r.ok).toBe(true);

    const namen = h.service.deelnemers(sessieId).map((d) => d.naam);
    expect(namen).toContain('Sanne');
  });

  test('opnieuw joinen met hetzelfde account is idempotent (geen dubbele deelnemer)', () => {
    const h = createSpelHarness();
    const { sessieId, joinCode } = h.service.maakSessie({ spelleiderUserId: SPELLEIDER });
    h.service.join({ joinCode, userId: 'speler-sanne', naam: 'Sanne', ip: '1.1.1.1' });
    h.service.join({ joinCode, userId: 'speler-sanne', naam: 'Sanne', ip: '1.1.1.1' });
    expect(h.service.deelnemers(sessieId)).toHaveLength(1);
  });
});

describe('SessieService - veilige join-codes (FR-59)', () => {
  test('een onbekende code geeft een neutrale foutmelding', () => {
    const h = createSpelHarness();
    const r = h.service.join({ joinCode: 'ZZZZZZ', userId: 'x', naam: 'X', ip: '1.1.1.1' });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('ONGELDIGE_CODE');
  });

  test('de code vervalt zodra de sessie de lobby verlaat (aanmeldingen gesloten)', () => {
    const h = createSpelHarness();
    const { sessieId, joinCode } = h.service.maakSessie({ spelleiderUserId: SPELLEIDER });
    h.service.sluitAanmeldingen({ sessieId, spelleiderUserId: SPELLEIDER });

    const r = h.service.join({ joinCode, userId: 'laat', naam: 'Laat', ip: '1.1.1.1' });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('ONGELDIGE_CODE');
  });

  test('de code vervalt na 4 uur', () => {
    const h = createSpelHarness();
    const { joinCode } = h.service.maakSessie({ spelleiderUserId: SPELLEIDER });

    h.now.advance(JOIN_CODE_GELDIG_MS + 1000);
    const r = h.service.join({ joinCode, userId: 'laat', naam: 'Laat', ip: '1.1.1.1' });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('ONGELDIGE_CODE');
  });

  test('geautomatiseerd raden wordt afgeremd (rate-limiting), met dezelfde neutrale melding', () => {
    const h = createSpelHarness();
    let laatste;
    for (let i = 0; i < 12; i++) {
      laatste = h.service.join({ joinCode: 'RAADPOGING', userId: 'bot', naam: 'Bot', ip: '6.6.6.6' });
    }
    expect(laatste.reden).toBe('RATE_LIMIT');
  });
});

describe('SessieService - één actieve sessie per account (FR-3a)', () => {
  test('een speler kan niet aan twee sessies tegelijk deelnemen', () => {
    const h = createSpelHarness();
    const a = h.service.maakSessie({ spelleiderUserId: 'gm-a' });
    const b = h.service.maakSessie({ spelleiderUserId: 'gm-b' });

    expect(h.service.join({ joinCode: a.joinCode, userId: 'tom', naam: 'Tom', ip: '1.1.1.1' }).ok).toBe(true);
    const tweede = h.service.join({ joinCode: b.joinCode, userId: 'tom', naam: 'Tom', ip: '1.1.1.1' });
    expect(tweede.ok).toBe(false);
    expect(tweede.reden).toBe('AL_IN_SPEL');
  });

  test('een spelleider die al host kan niet elders meespelen', () => {
    const h = createSpelHarness();
    h.service.maakSessie({ spelleiderUserId: 'rik' });
    const ander = h.service.maakSessie({ spelleiderUserId: 'gm-b' });

    const r = h.service.join({ joinCode: ander.joinCode, userId: 'rik', naam: 'Rik', ip: '1.1.1.1' });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('AL_IN_SPEL');
  });

  test('een account kan niet twee sessies tegelijk hosten', () => {
    const h = createSpelHarness();
    expect(h.service.maakSessie({ spelleiderUserId: 'rik' }).ok).toBe(true);
    const tweede = h.service.maakSessie({ spelleiderUserId: 'rik' });
    expect(tweede.ok).toBe(false);
    expect(tweede.reden).toBe('AL_IN_SPEL');
  });

  test('na afloop van een sessie kan een account weer een nieuwe joinen', () => {
    const h = createSpelHarness();
    const a = h.service.maakSessie({ spelleiderUserId: 'gm-a' });
    h.service.join({ joinCode: a.joinCode, userId: 'tom', naam: 'Tom', ip: '1.1.1.1' });
    h.sessieStore.update(a.sessieId, { status: STATUS.AFGEROND });

    const b = h.service.maakSessie({ spelleiderUserId: 'gm-b' });
    expect(h.service.join({ joinCode: b.joinCode, userId: 'tom', naam: 'Tom', ip: '1.1.1.1' }).ok).toBe(true);
  });
});

describe('SessieService - instellingen kiezen (FR-5 t/m FR-8, FR-4a)', () => {
  function sessieMetGeslotenLobby() {
    const h = createSpelHarness();
    const { sessieId, joinCode } = h.service.maakSessie({ spelleiderUserId: SPELLEIDER, spelleiderNaam: 'Rik' });
    h.service.join({ joinCode, userId: 'sanne', naam: 'Sanne', ip: '1.1.1.1' });
    h.service.sluitAanmeldingen({ sessieId, spelleiderUserId: SPELLEIDER });
    return { h, sessieId };
  }

  test('standaardinstellingen: 15 winstpunten en 30 seconden', () => {
    const h = createSpelHarness();
    const { sessieId } = h.service.maakSessie({ spelleiderUserId: SPELLEIDER });
    const s = h.sessieStore.findById(sessieId);
    expect(s.targetScore).toBe(15);
    expect(s.maxAntwoordSeconden).toBe(30);
  });

  test('spelleider kiest afspeellijst + instellingen; status wordt "klaar"', () => {
    const { h, sessieId } = sessieMetGeslotenLobby();
    const r = h.service.kiesInstellingen({
      sessieId,
      spelleiderUserId: SPELLEIDER,
      playlistId: 'pl-1',
      targetScore: 10,
      difficulty: 'moeilijk',
      maxAntwoordSeconden: 45,
    });
    expect(r.ok).toBe(true);
    expect(r.sessie.status).toBe(STATUS.KLAAR);
    expect(r.sessie.targetScore).toBe(10);
    expect(r.sessie.difficulty).toBe('moeilijk');
    expect(r.sessie.maxAntwoordSeconden).toBe(45);
  });

  test('een onbekende afspeellijst wordt geweigerd (FR-5)', () => {
    const { h, sessieId } = sessieMetGeslotenLobby();
    const service = h.service;
    service.playlistBestaat = () => false;
    const r = service.kiesInstellingen({ sessieId, spelleiderUserId: SPELLEIDER, playlistId: 'bestaat-niet' });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('ONGELDIGE_PLAYLIST');
  });

  test('als de spelleider zelf meespeelt, verschijnt hij als deelnemer (FR-4a)', () => {
    const { h, sessieId } = sessieMetGeslotenLobby();
    h.service.kiesInstellingen({ sessieId, spelleiderUserId: SPELLEIDER, playlistId: 'pl-1', spelleiderSpeeltMee: true });

    const deelnemers = h.service.deelnemers(sessieId);
    const spelleider = deelnemers.find((d) => d.userId === SPELLEIDER);
    expect(spelleider).toBeDefined();
    expect(spelleider.isSpelleider).toBe(true);
  });

  test('alleen de eigen spelleider mag instellingen wijzigen', () => {
    const { h, sessieId } = sessieMetGeslotenLobby();
    const r = h.service.kiesInstellingen({ sessieId, spelleiderUserId: 'iemand-anders', playlistId: 'pl-1' });
    expect(r.ok).toBe(false);
    expect(r.reden).toBe('GEEN_SPELLEIDER');
  });
});
