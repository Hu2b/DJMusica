# Spelleider — Spotify-app koppelen (in gewone taal)

Dit mapje regelt dat een spelleider zijn **eigen Spotify-app** koppelt (FR-37).
Pas met zo'n koppeling kan iemand een spel hosten en muziek afspelen. Doordat
elke spelleider een eigen app koppelt, draaien meerdere spelleiders volledig
onafhankelijk naast elkaar (FR-38).

## Wat zit er in (per bestand)

| Bestand | Wat het doet, in gewone taal |
|---|---|
| `encryptie.js` | Versleutelt gevoelige gegevens (de Spotify Client Secret), zodat die nooit leesbaar in de database staan. De sleutel blijft buiten de database. (NFR-4) |
| `spotifyAppStore.js` | Bewaart per spelleider de gekoppelde Spotify-gegevens (Client ID + versleutelde Secret). |
| `spotifyAuthClient.js` | Doet de **validatietest**: klopt de ingevoerde Client ID/Secret echt? (via een testaanvraag bij Spotify) |
| `spotifyKoppelingService.js` | De dirigent: levert de vaste redirect-URI, valideert, slaat versleuteld op, en zet de spelleider-rol aan op het account. |
| `testSupport.js` | Nep-Spotify zodat tests draaien zonder echte aanroepen. |
| `*.test.js` | De automatische tests, o.a. op basis van `docs/testset.md` §0. |

## Hoe de wizard werkt (FR-37)

1. De spelleider opent het Spotify Developer Dashboard en maakt daar een app aan.
2. Onze app toont een **vaste redirect-URI** om te kopiëren (die plakt de
   spelleider in zijn Spotify-app-instellingen).
3. De spelleider vult zijn **Client ID** en **Client Secret** in.
4. Wij doen een **directe validatietest**; lukt die, dan is de koppeling klaar en
   krijgt het account de **spelleider-rol** erbij (naast bv. de speler-rol).

## Veilig met de geheimen (NFR-4)

- De **Client Secret** wordt alleen **versleuteld** opgeslagen en verlaat de
  server nooit richting andere clients. De statusfunctie geeft wel de Client ID
  en de koppeldatum terug, maar **nooit** het secret.
- De **encryptiesleutel** komt uit een omgevingsvariabele
  (`SPOTIFY_ENCRYPTION_KEY`), apart van de database bewaard.

## Nog niet in deze stap

Het volledige Spotify-inlogproces om daadwerkelijk **muziek af te spelen**
(OAuth-tokens op het account van de spelleider) hoort bij de kernspel-loop
(bouwstap 4), waar Spotify Connect gebruikt wordt.
