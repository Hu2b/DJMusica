/**
 * Sessieduur-berekening (FR-57)
 * -----------------------------
 * Zuivere rekenlogica (zonder opslag of neveneffecten) die bepaalt in welke
 * "toestand" een ingelogde sessie zich bevindt, gegeven:
 *  - wanneer voor het laatst is ingelogd of verlengd (`lastExtendedAt`);
 *  - hoe laat het nu is (`now`);
 *  - of de gebruiker op dit moment in een actief spel zit (`inActiveGame`).
 *
 * De regels (FR-57), buiten een actief spel:
 *  - tot 2 uur na inloggen/verlengen: gewoon ACTIEF;
 *  - vanaf 2 uur: een WAARSCHUWING met een afteller van 60 seconden;
 *  - reageert de gebruiker niet binnen die 60 seconden: VERLOPEN (uitloggen).
 *
 * Tijdens een actief spel wordt NOOIT gewaarschuwd of uitgelogd — dan is de
 * toestand altijd ACTIEF, hoe lang het spel ook duurt.
 */

const INACTIVITEIT_MS = 2 * 60 * 60 * 1000; // 2 uur tot de waarschuwing
const AFTELLER_MS = 60 * 1000; // 60 seconden aftellen daarna

const SESSIE_TOESTAND = {
  ACTIEF: 'ACTIEF',
  WAARSCHUWING: 'WAARSCHUWING',
  VERLOPEN: 'VERLOPEN',
};

/**
 * @param {object} input
 * @param {number} input.lastExtendedAt - tijdstip (ms) van inloggen of laatste verlenging
 * @param {number} input.now - huidig tijdstip (ms)
 * @param {boolean} [input.inActiveGame=false] - zit de gebruiker in een lopend spel?
 * @returns {{ state: string, inSpel: boolean, secondsRemaining: number, warningAt: number, expireAt: number }}
 */
function berekenSessieStatus({ lastExtendedAt, now, inActiveGame = false }) {
  const warningAt = lastExtendedAt + INACTIVITEIT_MS;
  const expireAt = warningAt + AFTELLER_MS;

  // Tijdens een actief spel nooit waarschuwen of uitloggen (FR-57).
  if (inActiveGame) {
    return { state: SESSIE_TOESTAND.ACTIEF, inSpel: true, secondsRemaining: 0, warningAt, expireAt };
  }

  if (now >= expireAt) {
    return { state: SESSIE_TOESTAND.VERLOPEN, inSpel: false, secondsRemaining: 0, warningAt, expireAt };
  }
  if (now >= warningAt) {
    return {
      state: SESSIE_TOESTAND.WAARSCHUWING,
      inSpel: false,
      secondsRemaining: Math.ceil((expireAt - now) / 1000),
      warningAt,
      expireAt,
    };
  }
  return { state: SESSIE_TOESTAND.ACTIEF, inSpel: false, secondsRemaining: 0, warningAt, expireAt };
}

module.exports = {
  berekenSessieStatus,
  SESSIE_TOESTAND,
  INACTIVITEIT_MS,
  AFTELLER_MS,
};
