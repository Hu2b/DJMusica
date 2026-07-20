# Requirements Document – DJMusica

## 1. Inleiding

Een real-time multiplayer muziekquiz waarbij een spelleider een Spotify-afspeellijst kiest en deelnemers via hun telefoon vragen beantwoorden over het nummer dat gespeeld wordt (jaar, decennium, jaar ±3, artiest). Deelnemers doen mee via een webbrowser na een uitnodiging per WhatsApp.

## 2. Rollen

Rollen zijn niet langer gebonden aan een apart soort gebruiker, maar aan wat een **account** doet: elk account heeft een e-mailadres en wachtwoord, en kan één of meerdere van onderstaande rollen tegelijk vervullen (zie FR-36).

- **Beheerder**: voegt afspeellijsten toe aan de app die spelleiders kunnen gebruiken (curatie).
- **Spelleider**: nodigt uit, koppelt een eigen Spotify-app, kiest een afspeellijst uit het aanbod van de beheerder, stelt instellingen in en bedient Spotify-afspelen.
- **Deelnemer/speler**: logt in en beantwoordt vragen op eigen device. Kan bij het ene spel meedoen als speler bij spelleider A, en bij een volgend spel bij een geheel andere spelleider B, met hetzelfde account.

## 3. Functionele requirements

### 3.0 Accounts, inloggen & rollen
- FR-33: Om mee te doen (als speler) of een spel te leiden (als spelleider) maakt iemand één account aan met e-mailadres en wachtwoord. Registreren en inloggen kan direct vanaf een join-link (FR-1/FR-2), zodat een nieuwe speler niet apart hoeft te zoeken waar dat moet.
- FR-34: "Wachtwoord vergeten"-functie: een resetlink wordt naar het opgegeven e-mailadres gestuurd, tijdelijk geldig.
- FR-35: Na 5 achtereenvolgende mislukte inlogpogingen geldt een oplopende wachttijd voordat een volgende poging mag: 1 minuut na de 5e mislukte poging, daarna verdubbelend bij elke volgende mislukte poging (2, 4, 8, 16 minuten, enz.).
- FR-36: Eén account kan meerdere rollen combineren — speler, spelleider en/of beheerder zijn niet elkaar uitsluitend. Iemand kan bij het ene spel speler zijn bij spelleider A, en later zelf spelleider zijn van een eigen spel, of speler bij een heel andere spelleider B — allemaal met hetzelfde account en dezelfde opgebouwde statistieken (FR-27).
- FR-37: Om de spelleider-rol te activeren, koppelt een account zijn/haar eigen Spotify Developer-app (eigen Spotify Client ID/Secret) via een geleide wizard: directe link naar het Spotify Developer Dashboard, een kopieerbare vaste redirect-URI, invoervelden voor Client ID en Client Secret, en een directe validatietest (testcall) die meteen bevestigt of de koppeling werkt.
- FR-38: Meerdere spelleiders kunnen volledig onafhankelijk van elkaar, gelijktijdig, een eigen spel hosten — elk met hun eigen gekoppelde Spotify-app. De eerder beschreven limiet van 5 gelijktijdige Spotify-accounts (NFR-10) geldt hierdoor **per spelleider** (op diens eigen Spotify-app), niet gedeeld over de hele applicatie.

### 3.0a Account verwijderen
- FR-44: Een ingelogde speler/spelleider/beheerder kan een verzoek indienen om het eigen account, inclusief alle persoonsgegevens, te laten verwijderen.
- FR-45: Na het verzoek wordt een bevestigingsmail gestuurd naar het geregistreerde e-mailadres met een unieke, tijdelijke bevestigingslink (geldig 24 uur, eenmalig bruikbaar). Pas na het klikken op deze link wordt de verwijdering daadwerkelijk in gang gezet — een verwijderverzoek alleen (zonder mailbevestiging) heeft geen effect.
- FR-46: Na bevestiging via de link gaat een **grace period van 30 dagen** in: het account kan in deze periode niet meer gebruikt worden om mee te spelen of te hosten, maar de gebruiker kan door in te loggen de verwijdering binnen deze 30 dagen zelf ongedaan maken (annuleren), waarna het account weer normaal bruikbaar is.
- FR-47: 7 dagen voor het einde van de grace period ontvangt de gebruiker een herinneringsmail dat de verwijdering definitief wordt, met de mogelijkheid om alsnog te annuleren.
- FR-48: Na afloop van de 30 dagen zonder annulering worden alle persoonsgegevens (naam, e-mailadres, wachtwoord-hash, Spotify-app-koppeling) permanent gewist. Spel- en antwoordgegevens die ook deel uitmaken van de spelgeschiedenis van andere, nog actieve spelers, blijven **geanonimiseerd** bewaard (bv. getoond als "Verwijderde speler") zodat scoreborden en statistieken van anderen niet corrupt raken. *Aanname: dit is de gekozen aanpak voor gedeelde speldata; laat het weten als je liever alles hard verwijdert, ook uit andermans spelgeschiedenis.*
- FR-49: Beveiliging van het verwijderproces: de bevestigingslink is cryptografisch willekeurig (minimaal 128 bits), eenmalig bruikbaar en vervalt na 24 uur; hij wordt uitsluitend naar het al geregistreerde e-mailadres verstuurd (nooit naar een op dat moment ingevoerd adres); het indienen van een verwijderverzoek vereist een actieve, ingelogde sessie (voorkomt dat iemand zonder accounttoegang alsnog verwijdering kan triggeren); het verwijderverzoek-endpoint is rate-limited tegen misbruik (zie ook NFR-13).

### 3.1 Spel opzetten
- FR-1: Spelleider kan een spelsessie aanmaken en krijgt een deelbare link/join-code.
- FR-2: Spelleider deelt de link zelf via WhatsApp (`wa.me`-share of kopieer-link); geen directe WhatsApp API-integratie.
- FR-3: Spelers melden zich aan bij een sessie door in te loggen met hun account (FR-33); is de speler nog niet geregistreerd, dan kan dat direct vanaf de join-link. De naam die getoond wordt aan andere deelnemers komt uit het accountprofiel.
- FR-3a: Een account kan op elk moment slechts **actief betrokken zijn bij één lopende sessie** — ongeacht de rol (spelend als speler, of hostend als spelleider). Probeert een account een tweede, andere lopende sessie te joinen of te starten terwijl het al actief betrokken is bij een andere sessie, dan wordt dit geweigerd met een duidelijke melding ("je speelt al mee in een ander spel"). Zodra de eerste sessie eindigt (of het account die verlaat), is deelname aan een nieuwe sessie weer mogelijk. Dit staat los van meerdere spelleiders die **tegelijk, onafhankelijk van elkaar**, elk hun eigen sessie met eigen spelers kunnen hosten (FR-38) — de beperking geldt per account, niet voor de applicatie als geheel.
- FR-4: Spelleider ziet live wie zich heeft aangemeld.
- FR-4a: Spelleider kan bij het aanmaken van de sessie aangeven of hij/zij zelf ook als deelnemer meespeelt (aan/uit, default: uit). Indien aan, telt de spelleider mee als normale speler: beantwoordt vragen, bouwt punten op en kan winnen (zie FR-19, FR-23, FR-24).
- FR-4b: Ook als de spelleider meespeelt, blijft titel/artiest voor hem/haar verborgen tijdens de ronde (conform FR-13) — hij/zij heeft dus geen voordeel bij het beantwoorden.
- FR-4c: Het spelleider-scherm toont in dat geval zowel de besturing (start ronde, playlist kiezen, punten instellen) als het antwoordformulier voor zichzelf als speler.
- FR-4d: Het spelleider-scherm heeft altijd een knop "beëindig ronde nu", als extra mogelijkheid naast de automatische sluiting (wanneer alle deelnemers hebben aangegeven een antwoord ingevuld te hebben, of de ingestelde tijd is verstreken — zie FR-15).
- FR-5: Zodra spelleider de sessie sluit voor aanmeldingen, kiest hij/zij een afspeellijst uit de lijst met afspeellijsten die door een **beheerder** aan de app zijn toegevoegd (publieke Spotify-afspeellijsten, niet het eigen account van de spelleider).
- FR-5a: Beheerder voegt een afspeellijst toe door een Spotify-playlist-URL in te voeren; het systeem haalt de bijbehorende nummers op via de Spotify Web API. Beheerder kan afspeellijsten ook bewerken of verwijderen.
- FR-5b: Beheerder stelt per afspeellijst een standaard vraagtype-verdeling in (percentages per type, optellend tot max. 100%, zie FR-10c voor de types/percentages). Dit is de standaardwaarde die geldt zolang een spelleider deze zelf nog niet heeft aangepast voor die specifieke afspeellijst. Dit gebeurt via een knop "Instellingen" op het afspeellijst-overzicht, die naar een apart instellingenscherm per afspeellijst leidt.
- FR-5c: Naast de knop "Verversen" staat op het afspeellijst-overzicht een knop "Bewerken", die een overzicht toont van alle nummers in die afspeellijst, gesorteerd op artiestnaam. Artiesten waarvan het land ontbreekt of onzeker is (matchwaarschijnlijkheid < 95%, zie FR-28a) staan bovenaan de lijst (alfabetisch binnen die groep), gevolgd door de overige artiesten (eveneens alfabetisch), zodat de beheerder in één oogopslag ziet waar actie nodig is.
- FR-5d: In het bewerk-scherm toont elke artiest, indien een land bekend is, ook het percentage zekerheid ernaast (handmatige invoer toont altijd 100%, zie FR-28b).
- FR-6: Spelleider stelt puntenaantal voor winst in (default: 15).
- FR-7: Spelleider kiest moeilijkheidsgraad: **makkelijk** (multiple choice) of **moeilijk** (vrije invoer). Dit geldt voor het hele spel (niet per ronde instelbaar).
- FR-7a: Spelleider stelt vóór aanvang van het spel het maximum aantal seconden per ronde in om te antwoorden (default: 30 seconden). Dit geldt voor het hele spel, niet per ronde instelbaar.
- FR-8: Puntenaantal en instellingen worden getoond op het scherm van alle deelnemers.

### 3.2 Ronde-verloop
- FR-9: Spelleider start het spel/de ronde.
- FR-10: Systeem kiest een vraagtype: **jaartal**, **jaar ± 3**, **decennium**, **titel**, **artiest**, of **land van herkomst artiest**. De keuze is willekeurig, gewogen naar de door de spelleider ingestelde verdeling (zie FR-10c), met geen herhaling van hetzelfde type twee rondes op rij (tenzij slechts één type een percentage > 0% heeft).
- FR-10a: Bij vraagtype "land van herkomst artiest" volgt de antwoordvorm de normale moeilijkheidsgraad-instelling (makkelijk = multiple choice landen, moeilijk = vrije tekstinvoer met fuzzy matching zoals FR-17).
- FR-10b: Vraagtypes "titel" en "artiest" gebruiken beide de fuzzy-matching regel uit FR-17 in de moeilijke stand.
- FR-10c: Spelleider kan vóór aanvang van het spel de verdeling van vraagtypes instellen als percentages die optellen tot maximaal 100% (eenvoudige bediening, bv. sliders per type). Fabrieksstandaard bij een nieuwe afspeellijst zonder eigen instelling van de beheerder: jaartal 10%, jaar ± 3 20%, decennium 20%, titel 20%, artiest 20%, land van herkomst 10%. Een knop "zet terug naar standaard" herstelt de standaard van die afspeellijst (FR-5b), of anders de fabrieksstandaard.
- FR-10e: De vraagtype-verdeling die getoond wordt bij het kiezen van een afspeellijst, volgt deze volgorde:
  1. Als deze spelleider deze specifieke afspeellijst al eerder heeft gebruikt en de verdeling toen heeft aangepast: die laatst gebruikte verdeling (voor déze afspeellijst) wordt vooraf ingevuld.
  2. Anders: de standaardverdeling die de beheerder voor deze afspeellijst heeft ingesteld (FR-5b), of de fabrieksstandaard als de beheerder niets heeft ingesteld.
  Een door de spelleider aangepaste verdeling blijft dus alleen bewaard **gekoppeld aan die ene afspeellijst** — kiest dezelfde spelleider een andere afspeellijst, dan geldt daarvoor weer de (fabrieks/beheerder-)standaard van díe afspeellijst, niet de laatst gebruikte verdeling van een andere afspeellijst.
- FR-11: Vraagtype verschijnt op scherm van deelnemers vóórdat het nummer start.
- FR-12: Systeem kiest random een nummer uit de gekozen afspeellijst dat nog niet is afgespeeld sinds de laatste keer dat alle nummers uit die afspeellijst aan de beurt zijn geweest (zie FR-25/26, afspeel-cyclus over alle spellen heen).
- FR-12a: Een nummer wordt alleen geselecteerd als het **compleet** is: titel, artiest en jaar zijn ingevuld, én het land van de bijbehorende artiest is bekend (FR-28). Ontbreekt één van deze gegevens, dan wordt het nummer standaard geblokkeerd voor gebruik in het spel, totdat de beheerder de ontbrekende gegevens heeft aangevuld.
- FR-12b: Beheerder kan een nummer daarnaast handmatig uitsluiten door het te markeren (los van compleetheid); dit is altijd omkeerbaar door de markering ongedaan te maken.
- FR-13: Titel/artiest van het nummer worden nergens getoond, ook niet bij de spelleider, totdat de ronde is afgerond.
- FR-14: Nummer wordt afgespeeld via Spotify Connect op het apparaat van de spelleider (spelleider heeft Spotify Premium nodig, gekoppeld via de eigen Spotify-app-koppeling van FR-37).
- FR-15: Deelnemers hebben max. het ingestelde aantal seconden (FR-7a, default 30) om te antwoorden; ronde sluit zodra alle deelnemers hebben geantwoord óf na de ingestelde tijd (of eerder, via FR-4d).
- FR-15a: 10 seconden voor het verstrijken van de tijd klinkt een geluidssignaal (piepje) op alle deelnemersschermen en het spelleider-scherm, als waarschuwing dat de tijd bijna om is.
- FR-16: Antwoordvorm hangt af van moeilijkheidsgraad en vraagtype:
  - Makkelijk → multiple choice (bv. 4 opties).
  - Moeilijk → vrije tekstinvoer.
- FR-17: Bij vraagtype titel/artiest wordt fuzzy matching toegepast: antwoord telt als goed bij een Levenshtein-afstand van maximaal 3 tekens t.o.v. het juiste antwoord (hoofdlettergevoeligheid genegeerd).
- FR-18: Bij "jaar ± 3" telt een antwoord als goed als het binnen 3 jaar van het juiste jaartal zit.
- FR-19: Correct antwoord = 1 punt. Reactietijd van elk antwoord wordt vastgelegd (nodig voor tie-break, zie FR-24).

### 3.3 Resultaten & voortgang
- FR-20: Na sluiten van de ronde tonen alle schermen: het juiste antwoord (incl. titel/artiest/jaar), of eigen antwoord goed/fout was, en hoe andere spelers het deden.
- FR-21: Bijgewerkte standenlijst wordt getoond na elke ronde.
- FR-22: Spelleider start de volgende ronde handmatig (geen automatische start), zodat er ruimte is voor een pauze tussen rondes.
- FR-23: Spel eindigt zodra een speler het ingestelde puntenaantal (default 15) bereikt. Het eindscherm (winnaar + eindstand/ranking, bv. als podium) wordt getoond op **alle** schermen — zowel bij elke speler als bij de spelleider — in dezelfde vorm, niet alleen bij de spelleider.
- FR-24: Bij gelijktijdig bereiken van de winnende score in dezelfde ronde: de speler met de **snelste correcte reactietijd** in die ronde wint (gebruikmakend van de reactietijd uit FR-19).
- FR-25: Per afgespeeld nummer wordt bijgehouden hoe vaak en wanneer het is afgespeeld (over alle sessies/spellen heen, niet alleen binnen één spel).
- FR-26: Zodra alle nummers uit een afspeellijst minstens één keer zijn afgespeeld, begint de cyclus opnieuw en kunnen alle nummers weer random gekozen worden.
- FR-27: Antwoorden en resultaten van spelers worden opgeslagen over rondes en spellen heen, zodat er statistieken (bv. gemiddeld % goed, snelste reactietijd, meest gespeelde afspeellijst) beschikbaar zijn.
- FR-28: Het land van herkomst wordt bepaald **per artiest** (niet per nummer) via **MusicBrainz** (opgehaald op basis van de Spotify-artiestnaam, met voorkeur voor een match via een gekoppelde Spotify-ID in MusicBrainz indien beschikbaar). Zodra het land van een artiest bekend is, geldt dit automatisch voor **alle** nummers van die artiest in alle afspeellijsten — eenmalig bepalen (automatisch of handmatig) is voldoende.
- FR-28a: Een MusicBrainz-match wordt automatisch geaccepteerd en opgeslagen als de matchwaarschijnlijkheid ≥ 95% is. Bij een waarschijnlijkheid < 95% (of geen match) blijft het land van die artiest leeg en moet de beheerder het zelf invullen. Deze 95%-grens bepaalt ook welke artiesten bovenaan de bewerk-lijst komen te staan (zie FR-5c).
- FR-28b: Het land van een artiest kan te allen tijde door de beheerder handmatig gewijzigd worden. Een handmatige invoer krijgt altijd 100% zekerheid en wordt **nooit** overschreven door een latere sync/verversing (FR-31). Wil de beheerder een handmatig ingevuld land toch laten vervangen door een nieuwe MusicBrainz-opzoeking, dan moet het land eerst verwijderd worden — pas dan wordt het bij de eerstvolgende verversing opnieuw via MusicBrainz opgezocht.
- FR-28c: Land wordt altijd gekozen uit een vaste, canonieke lijst van landen ter wereld (geen vrije tekstinvoer) — dit voorkomt tikfouten en inconsistente landnamen (bv. "Nederland" vs. "The Netherlands"). Dezelfde lijst wordt gebruikt voor de multiple-choice-opties bij het vraagtype "land van herkomst artiest" (FR-10a), zodat opgeslagen landen en getoonde antwoordopties altijd consistent zijn.
- FR-28d: Bij het kiezen van een land kan de beheerder alfabetisch door de lijst bladeren, of zoeken: bij elk ingetikt teken wordt de lijst live gefilterd op landen die de ingevoerde letter(s) ergens in de naam bevatten (niet alleen landen die ermee beginnen).
- FR-30: Alle gegevens van een nummer (titel, artiest, jaar, Spotify-URI vanuit Spotify Web API; land vanuit MusicBrainz of handmatige invoer) worden in de database opgeslagen als één record per nummer, zodat de app tijdens het spelen geen live API-calls naar meerdere bronnen hoeft te doen.
- FR-31: Wanneer de beheerder een afspeellijst "ververst" (handmatige actie, geen automatische achtergrond-sync), synchroniseert het systeem met Spotify:
  - Nieuwe nummers in de Spotify-afspeellijst worden toegevoegd; titel/artiest/jaar worden opgehaald via Spotify Web API.
  - Voor een nieuw nummer van een **al bekende artiest** (land al vastgelegd, automatisch of handmatig) wordt dat land automatisch overgenomen — geen nieuwe MusicBrainz-aanroep nodig.
  - Voor een nieuw nummer van een **nog onbekende artiest** wordt het land opgezocht via MusicBrainz (FR-28/28a).
  - Nummers die uit de Spotify-afspeellijst zijn verwijderd, worden in de app op "inactief" gezet (niet definitief verwijderd), zodat afspeelhistorie/statistieken (FR-25/27) intact blijven en ze niet meer gekozen worden in nieuwe rondes.
  - Artiesten met een **handmatig ingevuld land** (100% zekerheid, FR-28b) worden nooit opnieuw bevraagd bij MusicBrainz, ook niet bij verversen — alleen als de beheerder het land expliciet verwijdert.
  - Artiesten met een automatisch bepaald land (welke zekerheid dan ook) worden bij verversen ook niet opnieuw bevraagd, om rate limits te sparen, tenzij de beheerder dit expliciet forceert.
- FR-32: Alle instellingen die een spelleider kiest bij het opzetten van een spel (moeilijkheidsgraad, puntenaantal, maximum antwoordtijd, wel/niet zelf meespelen) worden opgeslagen gekoppeld aan het Spotify-account van die spelleider, en gebruikt als vooraf ingevulde standaardwaarden bij het aanmaken van een volgend spel door dezelfde spelleider, **ongeacht welke afspeellijst** gekozen wordt (de spelleider kan deze altijd nog aanpassen per nieuw spel). De vraagtype-verdeling is hierop een uitzondering: die wordt per afspeellijst bewaard, zie FR-10e.

### 3.4 Statistieken
- FR-39: **Spelstatistieken** per afgerond spel: aantal rondes, gemiddelde speelduur, percentage goed beantwoord per vraagtype, gemiddelde reactietijd, gebruikte afspeellijst. Zichtbaar voor de spelleider van dat spel en de beheerder.
- FR-40: **Spelerstatistieken** per account, opgebouwd over alle spellen heen (ongeacht bij welke spelleider): totaal gespeelde spellen/rondes, win-percentage, percentage goed per vraagtype, gemiddelde en snelste reactietijd, langste win-streak, vaakst gespeelde afspeellijst. Zichtbaar voor de speler zelf en de beheerder.
- FR-41: **Spelleiderstatistieken** per account met de spelleider-rol: aantal gehoste spellen, gemiddeld aantal spelers per sessie, populairste afspeellijst bij die spelleider, gemiddelde spelduur. Zichtbaar voor de spelleider zelf en de beheerder.
- FR-42: **Marketing-/groeistatistieken**, alleen zichtbaar voor de beheerder: aantal actieve accounts (nieuw vs. terugkerend, per week/maand), aantal gespeelde sessies per periode, retentie (percentage spelers dat een tweede keer meespeelt, ook bij een andere spelleider), populairste afspeellijsten, aantal actieve spelleiders met een gekoppelde Spotify-app (relevant i.v.m. NFR-10).
- FR-43: Spelerstatistieken (FR-40) tonen ook een vergelijking ten opzichte van het gemiddelde van alle spelers (bv. "sneller dan gemiddeld", "bovengemiddeld percentage goed"), niet alleen de eigen cijfers.

### 3.5 Berichten & feedback tussen spelleider en beheerder
- FR-50: Een spelleider kan vanuit het spelleider-scherm een feedbackbericht (vrije tekst) sturen naar de beheerder.
- FR-51: Beheerder ziet binnenkomende feedbackberichten van spelleiders in een overzicht, en kan per bericht direct reageren; die reactie is voor de betreffende spelleider zichtbaar als antwoord op dat bericht (eenvoudige berichten-thread, geen volledige chat).
- FR-52: Beheerder kan ook zelf het initiatief nemen: een bericht sturen naar **één specifieke spelleider**, of een bericht **broadcasten naar alle spelleiders tegelijk** (bv. een algemene mededeling).
- FR-53: Spelleider ziet ontvangen berichten (reacties van de beheerder op eigen feedback, plus mededelingen/broadcasts) in een overzicht met een ongelezen-indicatie.

### 3.6 Installeerbaarheid (PWA)
- FR-54: De app toont op relevante momenten (bv. na het eerste bezoek, of via een knop in het menu) een "Voeg toe aan beginscherm"-optie. Eenmaal toegevoegd verschijnt het DJMusica-logo (zie logo-ontwerp) als app-icoon op het beginscherm van de gebruiker, en opent de app in een eigen venster zonder browserbalk (standaard PWA-gedrag), zowel op iOS als Android.

## 4. Non-functionele requirements

- NFR-1: **Real-time sync** – alle deelnemersschermen moeten binnen ~1 seconde synchroon lopen (vraagtype, timer, resultaten) via WebSocket-verbinding.
- NFR-2: **Platform** – responsive webapp. Spelleider-scherm is primair ontworpen voor TV/laptop/groot scherm, maar moet ook goed leesbaar en bruikbaar blijven op een telefoonformaat (bv. iPhone) — een spelleider kan zowel een iPad als een iPhone gebruiken. Deelnemersscherm is primair voor mobiel. Schermafmetingen worden afgestemd op de daadwerkelijke viewport van het apparaat (iPhone, iPad, Android-telefoons in verschillende formaten) via correcte viewport-instellingen en `safe-area`-marges (voor notch/dynamic island); de layout mag tijdens gebruik niet onverwacht van breedte/hoogte verspringen (geen "layout shift") — vaste of gereserveerde ruimtes voor elementen die asynchroon laden (bv. avatars, live-antwoordenlijst).
- NFR-3: **Schaalbaarheid** – de app moet van meet af aan meerdere spelleiders, elk met hun eigen gekoppelde Spotify-app, volledig onafhankelijk en gelijktijdig laten hosten (zie FR-38). Dit is niet langer "later toe te voegen": het multi-tenant sessiemodel is een kernvereiste vanaf de eerste versie.
- NFR-4: **Beveiliging** – Spotify OAuth-tokens en -app-credentials (per spelleider) veilig opgeslagen (server-side, versleuteld, nooit naar andere clients gestuurd); wachtwoorden van accounts worden gehasht opgeslagen (nooit leesbaar), zie ook NFR-11.
- NFR-5: **Beschikbaarheid** – sessie moet hersteld kunnen worden bij korte verbindingsonderbreking van een deelnemer (reconnect zonder puntenverlies).
- NFR-6: **Bruikbaarheid** – geen installatie nodig om mee te spelen; werkt in gangbare mobiele browsers (Chrome, Safari). De app is wél installeerbaar als PWA ("Voeg toe aan beginscherm") voor wie dat wil: eenmaal toegevoegd verschijnt het DJMusica-logo als app-icoon op het beginscherm, net als een reguliere app (FR-54).
- NFR-7: **Data** – persistente opslag is vanaf de MVP verplicht (niet later toe te voegen): afspeellijsten, per-nummer afspeelhistorie/telling, en speler-antwoorden/statistieken moeten blijvend bewaard worden, ook na afloop van een sessie en over meerdere spellen heen. Dit omvat ook de onderliggende data voor spel-, speler-, spelleider- en marketingstatistieken (FR-39 t/m FR-43).
- NFR-8: **Taal** – interface in het Nederlands.
- NFR-9: **Afhankelijkheid Spotify Premium** – alleen spelleiders hebben Premium nodig (elk voor hun eigen gekoppelde Spotify-app); spelers hebben geen Spotify-account nodig, wel een account voor deze app (zie FR-33).
- NFR-10: **Spotify Development Mode-limiet** – zolang de app in Spotify's "Development Mode" draait (het te verwachten scenario voor dit project, zie §6), mogen maximaal 5 Spotify-accounts tegelijk geautoriseerd zijn voor een gekoppelde Spotify Client ID. Omdat elke spelleider zijn/haar eigen Spotify-app koppelt (FR-37/38), geldt deze limiet per spelleider, niet gedeeld over de hele applicatie. Wisselen van geautoriseerde accounts binnen die 5 kan, maar alleen handmatig via het Spotify Developer Dashboard door de accounteigenaar. Extended Quota Mode (geen limiet) is voor dit project niet haalbaar: dit vereist een geregistreerd bedrijf met minimaal 250.000 maandelijks actieve gebruikers.
- NFR-11: **Accountbeveiliging** – wachtwoorden worden gehasht opgeslagen (bv. bcrypt/argon2, nooit plaintext of omkeerbaar versleuteld); wachtwoord-resetlinks zijn tijdelijk geldig en eenmalig bruikbaar; na 5 mislukte inlogpogingen geldt een oplopende wachttijd (FR-35) om brute-force-pogingen af te remmen.
- NFR-12: **Kosten** – de volledige stack (hosting, database, e-mail, CI/CD) moet permanent gratis kunnen draaien op dit projectschaal (geen betaalde abonnementen nodig): zelf gehoste PostgreSQL/Redis op een permanent gratis VM (bv. Oracle Cloud Free Tier) in plaats van betaalde managed-database-diensten, gratis e-mail-tier (Brevo/Resend) ruim binnen het gratis volume, en GitHub Actions/Pages binnen de gratis grenzen.
- NFR-13: **Beveiliging (verdediging in lagen)** – zodat een gehackte laag niet meteen alle persoonsgegevens blootlegt:
  - **Onderweg**: al het verkeer verplicht via HTTPS/TLS (gratis via Let's Encrypt).
  - **Opgeslagen data**: wachtwoorden alleen gehasht (NFR-11); Spotify-credentials versleuteld met een encryptiesleutel die apart van de database bewaard wordt (NFR-4); schijfversleuteling op de server.
  - **Infrastructuur**: firewall met alleen poort 443 open naar buiten; SSH uitsluitend met sleutel, geen wachtwoord-login; database/Redis niet rechtstreeks vanaf internet bereikbaar (alleen intern netwerk); de applicatie logt in op de database met minimale rechten (least privilege), niet als beheerder.
  - **Applicatie**: prepared statements/ORM tegen SQL-injectie, output-escaping tegen XSS, CSRF-bescherming op formulieren, rate-limiting op login (NFR-11) én op de API in het algemeen tegen misbruik.
  - **Dependencies**: automatische kwetsbaarheden-scan van gebruikte packages in de CI-pipeline (bv. Dependabot).
  - **Dataminimalisatie**: alleen strikt noodzakelijke persoonsgegevens opslaan (e-mailadres, weergavenaam) — geen overbodige gegevens die niet nodig zijn voor het spel.
  - **Back-ups**: automatisch, versleuteld, apart bewaard van de live-server.
  - **AVG**: recht op inzage/verwijdering van eigen account en data (zie FR-44 t/m FR-49), een privacyverklaring, en een meldproces richting de Autoriteit Persoonsgegevens binnen 72 uur bij een lek met risico voor gebruikers.

## 5. Bevestigde beslissingen (v2/v3)

1. Moeilijkheidsgraad (makkelijk/moeilijk) geldt voor het hele spel, niet per ronde.
2. Vraagtypes: 6 stuks (jaartal, jaar±3, decennium, titel, artiest, land van herkomst), gekozen via een door de spelleider instelbare gewogen verdeling (FR-10c), niet meer puur gelijke kans; geen herhaling van hetzelfde type twee rondes op rij.
3. Fuzzy-matching tolerantie: Levenshtein-afstand ≤ 3 tekens.
4. Volgende ronde start alleen handmatig door de spelleider (ruimte voor pauze).
5. Bij gelijktijdig bereiken van winnende score: speler met snelste correcte reactietijd in die ronde wint.
6. Afspeellijsten zijn publieke Spotify-afspeellijsten, toegevoegd via Spotify-URL door een aparte beheerder-rol; spelleider kiest uit dit aanbod. Nummer-afspeelhistorie en speler-statistieken worden persistent opgeslagen over sessies en spellen heen (zie FR-25 t/m FR-27, NFR-7).
7. Minimaal aantal deelnemers: 2.
8. Spelleider speelt standaard niet mee; moet expliciet aangezet worden per sessie (FR-4a).
9. MusicBrainz-matching op naam is voldoende (geen verplichte handmatige controle per match); alleen matches ≥95% waarschijnlijkheid worden automatisch geaccepteerd, land blijft altijd handmatig aanpasbaar door de beheerder (FR-28a/28b).
10. Sync van afspeellijsten gebeurt handmatig door de beheerder ("ververs"-knop), geen automatische achtergrond-sync (FR-31).
11. Spelleider heeft een eigen Spotify Premium-account nodig om af te spelen via Spotify Connect, ook al komt de playlist uit het beheerde aanbod (NFR-9).
12. Maximum aantal seconden per ronde is instelbaar door de spelleider vóór aanvang van het spel (default 30 sec), geldt voor het hele spel; 10 seconden voor het einde klinkt een waarschuwingspiepje (FR-7a, FR-15a).
13. Nummers met ontbrekende gegevens (titel/artiest/jaar/land) worden standaard geblokkeerd voor gebruik totdat de beheerder ze compleet maakt; beheerder kan nummers ook los daarvan handmatig (omkeerbaar) uitsluiten (FR-12a/12b).
14. Statistieken zijn nu wél in scope (herzien t.o.v. eerdere versie): spel-, speler-, spelleider- en marketingstatistieken (FR-39 t/m FR-43), met per categorie een eigen doelgroep — zie item 21.
15. Alle spelinstellingen van een spelleider, behalve de vraagtype-verdeling, worden bewaard als persoonlijke standaard voor het volgende spel van diezelfde spelleider, ongeacht de gekozen afspeellijst (FR-32). De vraagtype-verdeling wordt apart per afspeellijst bewaard: beheerder stelt een standaardverdeling per afspeellijst in (FR-5b), spelleider kan die per spel aanpassen, en die aanpassing blijft alleen staan zolang dezelfde spelleider dezelfde afspeellijst opnieuw kiest (FR-10e).
16. De app draait naar verwachting in Spotify's Development Mode: max. 5 gelijktijdig geautoriseerde Spotify-accounts, maar dit geldt nu **per spelleider** (elke spelleider koppelt een eigen Spotify-app, FR-37/38), niet gedeeld over de hele applicatie. Extended Quota Mode blijft voor dit project niet haalbaar — zie NFR-10.
17. Spelers en spelleiders loggen in met een echt account (e-mail + wachtwoord, met "wachtwoord vergeten" en oplopende wachttijd na 5 mislukte pogingen), in plaats van het eerdere anonieme naam-invullen. Dit vervangt FR-3 uit een eerdere versie.
18. Eén account kan meerdere rollen tegelijk hebben (speler, spelleider, beheerder) — geen gescheiden accounttypes. Zo kan iemand bij het ene spel speler zijn bij spelleider A en later spelleider zijn van een eigen spel, met dezelfde opgebouwde statistieken.
19. Doordat elke spelleider een eigen Spotify-app koppelt, kunnen meerdere spelleiders nu volledig onafhankelijk en gelijktijdig hosten — dit is vanaf de MVP een kernvereiste, niet iets voor later (herzien NFR-3).
20. Oplopende wachttijd na mislukte inlogpogingen (FR-35): 1 minuut na de 5e mislukte poging, daarna verdubbelend per volgende mislukte poging (2, 4, 8, 16 min, ...).
21. Statistieken zijn per categorie zichtbaar voor: spelstatistieken (FR-39) → spelleider van dat spel + beheerder; spelerstatistieken (FR-40) → de speler zelf + beheerder; spelleiderstatistieken (FR-41) → die spelleider zelf + beheerder; marketingstatistieken (FR-42) → alleen beheerder. Spelerstatistieken bevatten ook een vergelijking t.o.v. het gemiddelde van alle spelers (FR-43).
22. Land van herkomst wordt eenmalig per **artiest** bepaald (niet per nummer) en automatisch hergebruikt voor alle nummers van die artiest, ook nieuw toegevoegde. Handmatige invoer krijgt 100% zekerheid en wordt nooit overschreven bij verversen; alleen het verwijderen van het land triggert een nieuwe MusicBrainz-opzoeking (FR-28 t/m 28b).
23. Het afspeellijst-overzicht van de beheerder krijgt twee extra knoppen naast "Verversen": "Bewerken" (nummerlijst gesorteerd op artiest, onzekere/ontbrekende landen bovenaan) en "Instellingen" (standaard vraagtype-verdeling voor die afspeellijst) — FR-5b t/m 5d.
24. Spelleider-scherm moet ook op een telefoonformaat (iPhone) goed leesbaar en bruikbaar blijven, niet alleen op TV/laptop/iPad (herzien NFR-2).
25. Land van een artiest wordt gekozen uit een vaste lijst van landen ter wereld (geen vrije tekst), met alfabetisch bladeren of live zoeken (filtert op letters die ergens in de landnaam voorkomen) — FR-28c/28d. Dezelfde lijst voedt de multiple-choice-opties bij het vraagtype "land van herkomst artiest".
26. Het eindscherm (winnaar + ranking/podium) wordt op exact dezelfde manier getoond bij alle spelers én bij de spelleider, niet alleen op het grote scherm van de spelleider (herzien FR-23).
27. De volledige stack moet permanent gratis kunnen draaien (NFR-12): zelf gehoste PostgreSQL/Redis via Docker op één permanent gratis VM (bv. Oracle Cloud Free Tier) in plaats van betaalde managed-database-diensten, gratis e-mail-tier voor wachtwoord-resets, GitHub Actions/Pages voor CI/CD en frontend-hosting.
28. Uitgebreide beveiligingsmaatregelen vastgelegd als NFR-13: TLS overal, versleutelde opslag van gevoelige data, afgeschermde infrastructuur (firewall, geen directe database-toegang van buitenaf), applicatiebeveiliging (SQL-injectie/XSS/CSRF/rate-limiting), automatische dependency-scans, dataminimalisatie, versleutelde back-ups, en AVG-processen (inzage, verwijdering, meldplicht).
29. Account verwijderen (FR-44 t/m FR-49): vereist bevestiging via een beveiligde, tijdelijke e-maillink (eenmalig, 24 uur geldig); daarna 30 dagen grace period waarin de gebruiker het zelf ongedaan kan maken (met herinneringsmail 7 dagen voor het einde); pas daarna permanente verwijdering van persoonsgegevens. Spel-/antwoordgegevens die ook bij andere, nog actieve spelers horen, blijven geanonimiseerd bewaard zodat hun scoreborden/statistieken intact blijven.
30. Een account kan slechts actief betrokken zijn bij één lopende sessie tegelijk, ongeacht de rol (spelen óf hosten) — meerdere spelleiders kunnen wel volledig los van elkaar, gelijktijdig, hun eigen sessie met eigen spelers hosten (FR-3a, FR-38).
31. Spelleider en beheerder kunnen berichten uitwisselen: spelleider stuurt feedback naar de beheerder, beheerder kan daarop reageren of zelf een bericht sturen naar één spelleider of als broadcast naar alle spelleiders (FR-50 t/m FR-53).
32. De app is installeerbaar als PWA: via "Voeg toe aan beginscherm" verschijnt het DJMusica-logo als app-icoon, en opent de app als een losstaand venster zonder browserbalk (FR-54, herzien NFR-6).

## 6. Nog openstaande vragen

Geen op dit moment — alle eerder openstaande vragen zijn behandeld (zie sectie 5).
