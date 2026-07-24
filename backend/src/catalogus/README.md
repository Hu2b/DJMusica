# Catalogus — in gewone taal

Dit mapje regelt de **muziek-catalogus**: de afspeellijsten die de beheerder
toevoegt, de nummers erin, en de artiesten. Het is de basis waaruit het spel
straks nummers kiest.

## Wat zit er in (per bestand)

| Bestand | Wat het doet, in gewone taal |
|---|---|
| `spotifyUrl.js` | Leest een geplakte Spotify-link en haalt daar het "id" van de afspeellijst uit. (FR-5a) |
| `playlistStore.js` | Bewaart de toegevoegde afspeellijsten. |
| `trackStore.js` | Bewaart de nummers (één record per nummer, met titel/artiest/jaar/Spotify-link). (FR-30) |
| `artiestStore.js` | Bewaart de artiesten apart, zodat het land van herkomst later één keer per artiest bepaald wordt (niet per nummer). (FR-28) |
| `trackRegels.js` | Bepaalt of een nummer "compleet" is (titel + jaar + land bekend) en of het gekozen mag worden in een ronde. (FR-12a/12b) |
| `landen.js` | De vaste, canonieke lijst met landen ter wereld, met **Nederlandse** namen (bladeren/zoeken, en ISO-code → Nederlandse naam). (FR-28c/28d, NFR-8) |
| `musicBrainzClient.js` | Zoekt het land van een artiest op via de gratis MusicBrainz-dienst (geen account/sleutel nodig). (FR-28) |
| `verrijkingService.js` | Vult het land per artiest in: automatisch bij ≥95% zekerheid, anders handmatig (100%, nooit overschreven); land verwijderen kan opnieuw opzoeken. (FR-28a/28b) |
| `playlistImportService.js` | De dirigent: haalt via Spotify de nummers op en slaat ze op; kan een afspeellijst verwijderen en nummers handmatig uitsluiten. |
| `testSupport.js` | Een nep-Spotify én nep-MusicBrainz zodat tests draaien zonder echte externe aanroepen. |
| `*.test.js` | De automatische tests, gebaseerd op `docs/testset.md` §4. |

## Wat deze stap (2a) wél en (nog) niet doet

- **Wél:** een Spotify-afspeellijst inladen, de nummers + artiesten opslaan,
  bepalen welke nummers compleet/selecteerbaar zijn, nummers handmatig
  uitsluiten, en een afspeellijst verwijderen.
- **Nog niet:** het **land van herkomst per artiest opzoeken** (via MusicBrainz)
  — dat is stap 2b. Daarom zijn nieuw ingeladen nummers nog niet "compleet"
  zolang het land ontbreekt, en worden ze nog niet gekozen in een ronde. Dat is
  precies het gewenste gedrag (FR-12a).
- **Nog niet:** het **"ververs"-mechanisme** dat latere wijzigingen in de
  Spotify-playlist detecteert — dat is stap 2c.

## Waarom een "nep-Spotify" in de tests?

De echte Spotify-koppeling (met inloggen/OAuth) komt in een latere stap. Door de
Spotify-client "van buitenaf" mee te geven, kunnen we de hele inlaad-logica nu al
bouwen en testen zonder echte Spotify-aanroepen — snel en gratis.
