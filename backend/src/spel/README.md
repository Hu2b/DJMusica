# Spel — sessie & lobby (in gewone taal)

Dit mapje is het begin van de **kernspel-loop** (bouwstap 4). Deze eerste
deelstap (4a) regelt het **opzetten** van een spel: een sessie aanmaken, spelers
laten meedoen, en de instellingen kiezen. Het ronde-verloop en scoren volgen in
de volgende deelstappen.

## Wat zit er in (per bestand)

| Bestand | Wat het doet, in gewone taal |
|---|---|
| `joinCode.js` | Maakt de deelcode voor spelers: minstens 6 tekens, zonder verwarrende tekens (geen 0/O of 1/I). (FR-59) |
| `joinThrottle.js` | Remt het geautomatiseerd raden van codes af (te veel pogingen per afzender = tijdelijk geweigerd). (FR-59) |
| `sessieStore.js` | Bewaart de lopende spelsessies met hun deelnemers en instellingen. |
| `sessieService.js` | De dirigent: sessie aanmaken, spelers laten joinen, aanmeldingen sluiten, afspeellijst + instellingen kiezen. |
| `testSupport.js` | Hulpstukken zodat tests los draaien (o.a. een verstelbare klok). |
| `*.test.js` | De automatische tests, op basis van `docs/testset.md` §1 en §4. |

## Belangrijke regels die hier al kloppen

- **Eén spel tegelijk per account** (FR-3a): je kunt niet in twee spellen tegelijk
  zitten — of je nu speelt of host.
- **Alleen hosten met een gekoppelde Spotify-app** (FR-37).
- **Veilige codes** (FR-59): minstens 6 tekens, geen verwarrende tekens, vervalt
  zodra het spel start én na 4 uur, met een neutrale foutmelding en rate-limiting.
- **Standaardinstellingen** (FR-6/7a): 15 winstpunten, 30 seconden per ronde.
- **Spelleider kan zelf meespelen** (FR-4a): dan verschijnt hij ook als deelnemer.

## Losgekoppeld en testbaar

"Mag dit account hosten?" (Spotify-koppeling) en "bestaat deze afspeellijst?"
worden van buitenaf ingeprikt, zodat deze logica los te testen is en later aan de
echte Spotify-koppeling en de catalogus gekoppeld wordt.
