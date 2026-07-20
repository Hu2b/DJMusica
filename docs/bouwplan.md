# Bouwplan – DJMusica: automatisch bouwen & testen

Dit is het concrete stappenplan om van de documenten (requirements, architectuur, testset, schermontwerpen, logo) naar een werkende app te gaan, met geautomatiseerd bouwen en testen vanaf dag 1.

## Fase 0 — Accounts & tools regelen (eenmalig, voordat er code geschreven wordt)

**Uitgangspunt: permanent gratis, geen "gratis proefperiode" die later kosten kan gaan maken.**

| # | Wat | Waarom | Kosten |
|---|---|---|---|
| 1 | GitHub-account + nieuwe (privé) repository | Code-opslag, versiebeheer, CI/CD-basis | Gratis, permanent |
| 2 | Node.js (LTS-versie) lokaal installeren | Nodig om de app lokaal te draaien/bouwen | Gratis |
| 3 | Docker Desktop lokaal installeren | Lokaal database/Redis draaien zonder gedoe | Gratis |
| 4 | Eén "Always Free"-VM, bv. bij **Oracle Cloud Free Tier** | Draait PostgreSQL + Redis + backend zelf via Docker Compose — geen tijdslimiet, geen creditcard-verrassing achteraf, in tegenstelling tot de meeste "gratis tier" hostingpartijen die na verloop van tijd gaan factureren | Permanent €0, geen tijdslimiet |
| 5 | E-mailservice: **Brevo** of **Resend**, gratis laag | Wachtwoord-resetlinks versturen (FR-34) — het gratis volume (honderden mails/dag) is voor deze schaal nooit een probleem | Permanent gratis binnen dat volume |
| 6 | Frontend-hosting: **GitHub Pages** of **Cloudflare Pages** | Statische React-build hosten | Permanent gratis |
| 7 | Spotify Developer-account (al besproken) | Eigen Spotify-app per spelleider | Gratis |

Je hoeft dit niet allemaal tegelijk te doen — begin met 1, 2 en 3, de rest (4 t/m 6) volgt in Fase 3.

**Waarom zelf hosten op één VM in plaats van managed-diensten (bv. Railway/Render/Supabase)?** Die partijen zijn prima, maar hun gratis lagen zijn vaak tijdelijk, beperkt qua uren/maand, of vereisen op een gegeven moment een creditcard. Eén Always Free-VM met Docker Compose (Postgres + Redis + backend erop) kost je wat meer eigen beheer (updates, backups zelf regelen), maar blijft écht op €0 staan, wat aansluit bij het uitgangspunt "gratis software gebruiken" (NFR-12).

## Fase 1 — Repository en CI-skelet opzetten (dag 1)

1. Maak de repository-structuur aan:
   - `/frontend` — React-app (spelleider- en spelerschermen)
   - `/backend` — Node.js API + WebSocket-server (Game Engine, Auth Service, etc.)
   - `/shared` — gedeelde types tussen frontend/backend (optioneel maar handig)
2. Voeg in beide mappen een `package.json` toe met minimaal deze scripts: `build`, `test`, `lint`, `dev`.
3. Maak `.github/workflows/ci.yml` aan — dit is het bestand dat GitHub vertelt wat er automatisch moet gebeuren bij elke commit. Minimale eerste versie:
   - Installeer dependencies (`npm install`)
   - Draai de linter
   - Draai de (nog lege) testcommando's
4. Zet **branch protection** aan op `main` in GitHub: een pull request mag pas gemerged worden als de CI-check groen is. Dit is de kern van "automatisch getest" — niemand (ook jij niet) kan per ongeluk kapotte code mergen.

Resultaat van deze fase: elke keer dat je iets pusht naar GitHub, draait er automatisch een check, ook al doet die nog bijna niets.

## Fase 2 — Automatisch testen inrichten (bouwt voort op testset.md §9)

1. **Unit tests**: installeer Jest of Vitest in `/backend`. Schrijf de eerste unit test voor de Answer Matcher (fuzzy-matching, FR-17) — dit is de simpelste, meest geïsoleerde logica en een goede eerste test.
2. **Integratietests**: zet een aparte test-database op (in CI: een tijdelijke Postgres-container naast je testrun). Test de Game Engine en Track Picker tegen deze database, met Spotify/MusicBrainz gemockt (geen echte API-calls in tests).
3. **E2E/BDD-tests**: installeer Playwright + Cucumber. Neem 3-5 scenario's uit testset.md (bijvoorbeeld "Speler meldt zich aan" en "Ronde sluit zodra iedereen heeft geantwoord") en zet die om in werkende teststappen.
4. **Testrapportage**: laat CI een testrapport en coverage-percentage genereren, en upload dat als CI-artefact (zie testset.md §9.4 voor de bewaarstrategie).
5. Voeg deze teststappen toe aan `ci.yml`, ná de build-stap.

Resultaat: elke pull request laat nu zien of de tests slagen, met een concreet rapport erbij.

## Fase 3 — Automatisch bouwen & deployen (CD)

1. **Build-stap**: TypeScript compileren (indien gebruikt) en de frontend bundelen (bv. met Vite).
2. **Docker Compose-bestand**: één `docker-compose.yml` dat backend + PostgreSQL + Redis samen definieert — dit is wat er straks op de gratis VM draait. Lokaal test je hiermee ook al (Fase 0, stap 3).
3. **Database-migraties automatiseren**: gebruik een migratietool (bv. Prisma Migrate of Knex) zodat schema-wijzigingen automatisch en gecontroleerd worden toegepast bij een deploy — nooit handmatig in de productie-database sleutelen.
4. **Secrets**: zet alle geheime waarden (database-wachtwoord, Spotify-koppeling-encryptiesleutel, e-mailservice-API-key) in GitHub Secrets — nooit in de code zelf.
5. **Deploy-stap naar de gratis VM**: GitHub Actions verbindt via SSH met de Always Free-VM en draait `docker compose pull && docker compose up -d` — dit kan volledig geautomatiseerd bij elke merge naar `main`, of met een handmatige goedkeuringsstap als je liever niet elke wijziging direct live wilt hebben.
6. **Frontend-deploy**: de React-build wordt automatisch gepubliceerd naar GitHub Pages/Cloudflare Pages bij dezelfde merge.

Resultaat: een commit op `main` leidt automatisch tot een bijgewerkte, geteste omgeving, volledig op gratis infrastructuur, zonder dat jij iets handmatig hoeft te uploaden.

## Fase 4 — Bouwvolgorde van de functionaliteit zelf

Niet alles tegelijk bouwen. Logische volgorde, elke stap bovenop de vorige, telkens met bijbehorende tests uit testset.md:

1. **Accounts & inloggen** (FR-33 t/m 35) — de basis waar alles op leunt.
2. **Beheerder: playlist toevoegen + verrijking** (FR-5a, FR-28) — zonder mooie UI, gewoon werkend krijgen dat een Spotify-URL nummers + landen (per artiest) oplevert.
3. **Spelleider: Spotify-app koppelen** (FR-37) — nodig voordat er iets afgespeeld kan worden.
4. **Kernspel-loop**: sessie aanmaken, lobby, ronde starten, antwoorden, scoren, eindscherm — inclusief de één-sessie-tegelijk-check (FR-1 t/m 24, FR-3a). Dit is het hart van de app — pas hierna is er een "speelbaar" MVP.
5. **Beheerder-UI verfijnen**: Bewerken-scherm (artiest-sortering, land-koppeling), Instellingen-scherm, landenkiezer (FR-5b t/m 5d, FR-28b t/m 28d).
6. **Statistieken** (FR-39 t/m 43) — bouwt voort op data die al verzameld wordt door stap 4.
7. **Account verwijderen** (FR-44 t/m 49) — bevestigingsmail, grace period, geanonimiseerde permanente verwijdering.
8. **Berichten & feedback** (FR-50 t/m 53) — spelleider ↔ beheerder.
9. **PWA-installeerbaarheid** (FR-54) — manifest.json, iconen, "Voeg toe aan beginscherm".
10. **Polish**: responsive spelleiderscherm zonder layout-shift (NFR-2), geluid/animaties, foutafhandeling, edge cases.

## Fase 4a — Beveiliging inrichten (parallel aan Fase 3, NFR-13)

Dit hoort niet aan het eind, maar vanaf het begin van de infrastructuur-opzet:
- Firewall op de VM: alleen poort 443 open, SSH uitsluitend met sleutel.
- Database/Redis alleen bereikbaar binnen het interne Docker-netwerk, nooit direct vanaf internet.
- Database-gebruiker van de app met minimale rechten (least privilege), niet als beheerder van de database.
- Dependabot (of vergelijkbaar) inschakelen in GitHub voor automatische kwetsbaarheden-scans.
- Versleutelde, van de live-server gescheiden back-ups instellen zodra er productiedata is.
- Privacyverklaring opstellen zodra het account-/verwijderproces (stap 7) werkt.

## Fase 5 — Werkritme

Voor elke nieuwe feature (bv. "vraagtype-verdeling instellen"):
1. Zoek het bijbehorende scenario in testset.md op (of schrijf het erbij als het ontbreekt).
2. Zet dat scenario om in een falende test (nog geen implementatie).
3. Bouw de functionaliteit tot de test slaagt.
4. Commit + push → CI draait alles automatisch → pull request → merge zodra groen.

Dit is de kern van "automatisch bouwen en testen": niet iets wat je één keer instelt en dan vergeet, maar het werkritme voor de rest van het project.

## Fase 6 — Feedback geven in gewone taal, na het bouwen

Zodra er een werkende (staging-)versie draait, verloopt elke ronde feedback zo:

1. **Jij speelt/bekijkt de app** en geeft feedback in gewone taal — bijvoorbeeld: *"de timer voelt te kort aan bij moeilijke vragen"* of *"ik wil dat de beheerder ook kan zien hoeveel spellen een spelleider heeft gehost deze maand"*.
2. **Vertalen naar een concrete wijziging**: die feedback wordt eerst omgezet naar een aanpassing in **requirements.md** (een nieuwe of gewijzigde FR/NFR) — precies zoals we in dit gesprek steeds gedaan hebben. Bij twijfel over wat je precies bedoelt, volgen er eerst verduidelijkende vragen, niet meteen code.
3. **Testset bijwerken**: het bijbehorende Gherkin-scenario in **testset.md** wordt toegevoegd of aangepast, zodat er een concrete, controleerbare beschrijving is van het gewenste gedrag.
4. **Code aanpassen**: de daadwerkelijke implementatie wordt gewijzigd (bv. met Claude Code, dat rechtstreeks in je repository kan werken — code lezen, aanpassen, en de tests draaien).
5. **Automatisch testen** (Fase 2/CI): zodra de wijziging gepusht wordt, draait de volledige testset automatisch. Pas als alles slaagt, wordt de wijziging gemerged en (via Fase 3) automatisch uitgerold.
6. **Terugkoppeling naar jou**: een korte samenvatting van wat er is aangepast in requirements, tests en gedrag van de app — zodat de documenten en de werkelijke app altijd synchroon blijven lopen.

Praktisch gezien kun je dit op twee manieren aanpakken:
- **Via deze chat**: je beschrijft de gewenste wijziging hier, de documenten worden bijgewerkt (zoals nu), en je (of een ontwikkelaar) voert de codewijziging apart door.
- **Via Claude Code**: rechtstreeks gekoppeld aan je GitHub-repository, waarbij dezelfde vertaalslag (feedback → requirement → test → code → CI) in één werkstroom gebeurt, zonder dat je zelf tussen twee tools hoeft te schakelen.

Zo blijft elke wijziging traceerbaar: je kunt altijd teruglezen in requirements.md *waarom* iets zo werkt, en in testset.md *hoe* dat gecontroleerd wordt.
