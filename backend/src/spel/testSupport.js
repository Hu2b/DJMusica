/**
 * Test-hulpmiddelen voor de spel-sessies. Bevat geen tests zelf.
 */

const { InMemorySessieStore } = require('./sessieStore');
const { InMemoryJoinThrottle } = require('./joinThrottle');
const { SessieService } = require('./sessieService');

function createFakeClock(startMs = 1_700_000_000_000) {
  let current = startMs;
  const now = () => current;
  now.advance = (ms) => {
    current += ms;
    return current;
  };
  return now;
}

/**
 * @param {object} [opts]
 * @param {(userId:string)=>boolean} [opts.magHosten] - standaard: iedereen mag hosten
 * @param {(playlistId:string)=>boolean} [opts.playlistBestaat] - standaard: elke playlist bestaat
 */
function createSpelHarness({ magHosten, playlistBestaat, now = createFakeClock() } = {}) {
  const sessieStore = new InMemorySessieStore({ now });
  const joinThrottle = new InMemoryJoinThrottle({ now });
  const service = new SessieService({
    sessieStore,
    joinThrottle,
    magHosten,
    playlistBestaat,
    now,
  });
  return { service, sessieStore, joinThrottle, now };
}

module.exports = {
  createFakeClock,
  createSpelHarness,
};
