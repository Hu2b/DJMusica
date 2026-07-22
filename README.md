# DJMusica

Real-time multiplayer muziekquiz op basis van Spotify-afspeellijsten. Zie `/docs` voor het volledige ontwerp.

## Documenten (`/docs`)

- **requirements.md** — functionele en non-functionele requirements (FR/NFR), inclusief alle bevestigde beslissingen.
- **architectuur.md** — componenten, datamodel, sequence diagrams, technologiekeuzes.
- **testset.md** — Gherkin-testscenario's per requirement, plus de teststrategie (CI/CD, testbewijs bewaren).
- **bouwplan.md** — concreet stappenplan: accounts/tools regelen, repo opzetten, automatisch testen/bouwen, bouwvolgorde van de features.
- **djmusica-schermontwerpen.html** / **djmusica-logo.html** — visuele schermontwerpen en logo (open in een browser).

## Projectstructuur

```
djmusica/
├── backend/            Node.js: Game Engine, Auth Service, Answer Matcher, Track Picker, etc.
│   └── src/
│       └── matcher/     Answer Matcher (FR-17, FR-18) - eerste werkende onderdeel
├── frontend/           (nog te bouwen) React-app voor speler-/spelleiderschermen
├── docs/                alle ontwerpdocumenten
└── .github/workflows/   CI: lint + test bij elke push/PR
```

## Status

- ✅ Answer Matcher (fuzzy tekstmatching + jaar-tolerantie) — werkend, 18 unit tests, 100% van de functies gedekt.
- ✅ CI-pipeline (lint + test + coverage-artefact) opgezet.
- ✅ Auth Service (Fase 4, stap 1) — gebouwd in vier aparte pull requests, elk met tests:
  - ✅ **Stap 1a: Registreren met e-mailverificatie** (FR-33, FR-55, FR-56) — wachtwoordeisen, gelekte-wachtwoorden-check, gehashte opslag, verificatielink, neutrale melding. Zie `backend/src/auth/`.
  - ✅ **Stap 1b: Inloggen + oplopende wachttijd** na 5 mislukte pogingen, per account+IP (FR-35).
  - ✅ **Stap 1c: Wachtwoord vergeten / reset** (resetlink 1 uur, eenmalig, alle sessies uitloggen na reset) (FR-34).
  - ✅ **Stap 1d: Sessieduur** — 2 uur inactiviteit buiten een spel geeft een 60-seconden-aftelwaarschuwing met "blijf ingelogd"; nooit uitloggen tijdens een actief spel (FR-57).
  - Doorlopend: beveiligingslogging zonder wachtwoorden/tokens (NFR-14) en gehashte opslag (NFR-11).
- ⬜ Frontend, Game Engine, Spotify-integratie, beheerder-tools, statistieken, berichten, PWA — zie bouwplan voor de volledige volgorde.

## Aan de slag

```
cd backend
npm install
npm test
npm run lint
```

## Volgende stappen (zie docs/bouwplan.md, Fase 0 en 4)

1. Regel de Fase 0-accounts: Oracle Cloud Free Tier-VM, e-mailservice (Brevo/Resend), Spotify Developer-account.
2. Zet branch protection aan op `main` zodat de CI-check verplicht is vóór mergen.
3. Ga verder met stap 1 uit Fase 4: Accounts & inloggen (FR-33 t/m 35).
