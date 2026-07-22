# Auth Service — in gewone taal

Dit mapje regelt alles rond **accounts**: registreren, je e-mailadres bevestigen,
inloggen, wachtwoord vergeten en hoe lang je ingelogd blijft. Het is bewust
opgebouwd uit kleine, losse onderdelen die elk één ding doen — makkelijker te
begrijpen, te testen en later te vervangen.

## Wat zit er in (per bestand)

| Bestand | Wat het doet, in gewone taal |
|---|---|
| `passwordPolicy.js` | Controleert of een gekozen wachtwoord mag: minstens 8 tekens én niet voorkomend in bekende datalekken. (FR-56) |
| `pwnedPasswords.js` | De gratis check "staat dit wachtwoord in een bekend lek?". Slim gebouwd: je wachtwoord verlaat nooit onze server. (FR-56) |
| `passwordHasher.js` | Zet een wachtwoord om in een onomkeerbare code ("hash"). We bewaren nooit het leesbare wachtwoord. (NFR-11) |
| `tokenStore.js` | Maakt en controleert de eenmalige links die we mailen (bevestig-link, reset-link): willekeurig, één keer bruikbaar, met vervaltijd. (FR-34/55) |
| `userStore.js` | Bewaart de accounts. Nu nog in het werkgeheugen; later een echte database, zonder dat de rest hoeft te veranderen. |
| `securityLog.js` | De "rookmelder": legt beveiligingsgebeurtenissen vast (mislukte login, reset, …) — nooit met wachtwoorden of tokens erin. (NFR-14) |
| `authService.js` | De dirigent: rijgt bovenstaande onderdelen aan elkaar tot de echte handelingen (registreren, verifiëren, …). |
| `testSupport.js` | Nep-versies van de buitenwereld (mail, klok, lek-check) zodat tests snel draaien zonder internet of database. |
| `*.test.js` | De automatische tests die bewijzen dat het werkt, gebaseerd op de scenario's in `docs/testset.md`. |

## Waarom in-memory en niet meteen een database?

Zo kunnen we de logica compleet bouwen en testen zonder dat er al een database
of e-mailserver klaarstaat. Alle opslag zit achter dezelfde "vorm" (`findByEmail`,
`create`, …) als een database later zou hebben, dus we hoeven straks alleen de
binnenkant te vervangen — niet de rest.

## Belangrijke keuzes voor de veiligheid

- **Wachtwoorden**: nooit leesbaar opgeslagen, alleen gehasht (scrypt), elk met
  eigen willekeur ("salt"). (NFR-11)
- **E-maillinks**: we bewaren nooit de link zelf, alleen een hash ervan; elke
  link is één keer bruikbaar en verloopt (verificatie 24 uur, reset 1 uur).
- **Neutrale meldingen**: bij registreren zie je altijd dezelfde tekst, of het
  e-mailadres nu nieuw is of al bestaat — zo lekt niet welke adressen bekend
  zijn. (FR-55)
- **Geen wachtwoorden/tokens in de logs**: het log weigert zulke velden actief.
  (NFR-14)
