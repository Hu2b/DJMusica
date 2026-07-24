/**
 * Sessie-opslag (spelsessies) — FR-1 t/m FR-8, FR-3a
 * --------------------------------------------------
 * Bewaart de lopende spelsessies met hun deelnemers. Let op: dit is de
 * SPEL-sessie (één spelletje), niet de login-sessie uit de Auth Service.
 *
 * Voorlopig in-memory (lopende state hoeft niet persistent, zie architectuur);
 * later te vervangen door Redis zonder de rest te wijzigen.
 */

const crypto = require('crypto');

// Statussen volgens de sessie-state-machine (architectuur.md §2).
const STATUS = {
  LOBBY: 'lobby', // aanmeldingen open; join-code geldig
  PLAYLIST_KIEZEN: 'playlistKiezen', // aanmeldingen gesloten, playlist/instellingen kiezen
  KLAAR: 'klaar', // playlist + instellingen gekozen, klaar om te starten
  BEZIG: 'bezig', // spel loopt
  AFGEROND: 'afgerond', // einde
};

const FABRIEKS_INSTELLINGEN = {
  targetScore: 15, // FR-6
  difficulty: null, // 'makkelijk' | 'moeilijk' (FR-7)
  maxAntwoordSeconden: 30, // FR-7a
  spelleiderSpeeltMee: false, // FR-4a
  playlistId: null,
  vraagtypeVerdeling: null,
};

class InMemorySessieStore {
  constructor({ now = Date.now, generateId = () => crypto.randomUUID() } = {}) {
    this._now = now;
    this._generateId = generateId;
    this._byId = new Map();
  }

  create({ spelleiderUserId, joinCode }) {
    const sessie = {
      id: this._generateId(),
      spelleiderUserId,
      joinCode,
      status: STATUS.LOBBY,
      ...FABRIEKS_INSTELLINGEN,
      deelnemers: [], // { userId, naam, isSpelleider, score }
      aangemaaktOp: this._now(),
      gestartOp: null,
    };
    this._byId.set(sessie.id, sessie);
    return this._kopie(sessie);
  }

  _kopie(s) {
    return { ...s, deelnemers: s.deelnemers.map((d) => ({ ...d })) };
  }

  findById(id) {
    const s = this._byId.get(id);
    return s ? this._kopie(s) : null;
  }

  findByJoinCode(joinCode) {
    const gevonden = [...this._byId.values()].find((s) => s.joinCode === joinCode);
    return gevonden ? this._kopie(gevonden) : null;
  }

  update(id, changes) {
    const s = this._byId.get(id);
    if (!s) throw new Error('InMemorySessieStore: onbekende sessie');
    Object.assign(s, changes);
    return this._kopie(s);
  }

  addDeelnemer(id, deelnemer) {
    const s = this._byId.get(id);
    if (!s) throw new Error('InMemorySessieStore: onbekende sessie');
    s.deelnemers.push({ score: 0, isSpelleider: false, ...deelnemer });
    return this._kopie(s);
  }

  /**
   * Is dit account op dit moment actief betrokken bij een (niet-afgeronde)
   * sessie — als spelleider of als speler? (FR-3a)
   * @param {string} userId
   * @param {string|null} [behalveSessieId] - deze sessie niet meetellen
   */
  isAccountActief(userId, behalveSessieId = null) {
    for (const s of this._byId.values()) {
      if (s.id === behalveSessieId) continue;
      if (s.status === STATUS.AFGEROND) continue;
      if (s.spelleiderUserId === userId) return true;
      if (s.deelnemers.some((d) => d.userId === userId)) return true;
    }
    return false;
  }
}

module.exports = {
  InMemorySessieStore,
  STATUS,
  FABRIEKS_INSTELLINGEN,
};
