/**
 * Verrijkingsservice — land van herkomst per artiest (FR-28, FR-28a, FR-28b)
 * --------------------------------------------------------------------------
 * Bepaalt en beheert het land van herkomst per artiest:
 *  - automatisch opzoeken via MusicBrainz, en alleen overnemen bij een
 *    matchzekerheid van minstens 95% (FR-28a); anders blijft het land leeg en
 *    vult de beheerder het handmatig in;
 *  - handmatig invullen krijgt 100% zekerheid en wordt nooit door een latere
 *    sync overschreven (FR-28b);
 *  - een land verwijderen zet de artiest terug op "onbekend", zodat het bij een
 *    volgende opzoeking opnieuw via MusicBrainz bepaald kan worden (FR-28b).
 *
 * Omdat het land op de ARTIEST staat, geldt het automatisch voor álle nummers
 * van die artiest, ook nummers die later worden toegevoegd (FR-28/FR-31).
 */

const { isGeldigLand } = require('./landen');

const AUTO_DREMPEL = 95; // matchzekerheid vanaf welke we automatisch overnemen (FR-28a)

class VerrijkingService {
  /**
   * @param {object} deps
   * @param {object} deps.musicBrainzClient - { lookupArtistCountry({ naam }) => { land, zekerheid } }
   * @param {object} deps.artiestStore
   * @param {() => number} [deps.now]
   */
  constructor({ musicBrainzClient, artiestStore, now = Date.now }) {
    this.musicBrainzClient = musicBrainzClient;
    this.artiestStore = artiestStore;
    this.now = now;
  }

  _nu() {
    return new Date(this.now()).toISOString();
  }

  /**
   * Zoekt (indien nodig) het land van één artiest op via MusicBrainz.
   * Slaat over als de artiest al een land heeft (automatisch of handmatig) —
   * dat wordt niet opnieuw bevraagd, om rate limits te sparen (FR-31).
   * @returns {Promise<{ status: string, land?: string, zekerheid?: number }>}
   *   status: AUTO_INGEVULD | ONZEKER | AL_BEKEND | ONBEKEND
   */
  async verrijkArtiest(artiestId) {
    const artiest = this.artiestStore.findById(artiestId);
    if (!artiest) return { status: 'ONBEKEND' };
    if (artiest.land) return { status: 'AL_BEKEND', land: artiest.land };

    const resultaat = await this.musicBrainzClient.lookupArtistCountry({
      naam: artiest.naam,
      spotifyArtistId: artiest.spotifyArtistId,
    });
    const land = resultaat && resultaat.land;
    const zekerheid = (resultaat && resultaat.zekerheid) || 0;

    // Alleen automatisch overnemen bij voldoende zekerheid (FR-28a).
    if (land && zekerheid >= AUTO_DREMPEL) {
      this.artiestStore.update(artiest.id, {
        land,
        landMatchZekerheid: zekerheid,
        landHandmatigIngevuld: false,
        landBijgewerktOp: this._nu(),
      });
      return { status: 'AUTO_INGEVULD', land, zekerheid };
    }

    // Onzeker of geen match: land blijft leeg, beheerder vult zelf in (FR-28a).
    return { status: 'ONZEKER', zekerheid };
  }

  /**
   * Zoekt het land op voor alle artiesten die er nog geen hebben.
   * @returns {Promise<Array<{ artiestId, naam, status, land?, zekerheid? }>>}
   */
  async verrijkAlleOnbekende() {
    const resultaten = [];
    for (const artiest of this.artiestStore.all()) {
      if (!artiest.land) {
        const r = await this.verrijkArtiest(artiest.id);
        resultaten.push({ artiestId: artiest.id, naam: artiest.naam, ...r });
      }
    }
    return resultaten;
  }

  /**
   * Beheerder vult het land handmatig in (FR-28b/28c): altijd 100% zekerheid,
   * alleen uit de canonieke lijst, en nooit overschrijfbaar door een sync.
   */
  zetLandHandmatig(artiestId, land) {
    if (!isGeldigLand(land)) {
      const err = new Error(
        `"${land}" staat niet in de landenlijst. Kies een land uit de vaste lijst.`
      );
      err.code = 'ONGELDIG_LAND';
      throw err;
    }
    return this.artiestStore.update(artiestId, {
      land,
      landMatchZekerheid: 100,
      landHandmatigIngevuld: true,
      landBijgewerktOp: this._nu(),
    });
  }

  /**
   * Beheerder verwijdert het land (FR-28b): de artiest staat weer op "onbekend",
   * zodat het bij een volgende verrijking/verversing opnieuw wordt opgezocht.
   */
  verwijderLand(artiestId) {
    return this.artiestStore.update(artiestId, {
      land: null,
      landMatchZekerheid: null,
      landHandmatigIngevuld: false,
      landBijgewerktOp: this._nu(),
    });
  }
}

module.exports = {
  VerrijkingService,
  AUTO_DREMPEL,
};
