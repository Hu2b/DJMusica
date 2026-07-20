# Architectuur – DJMusica

## 1. High-level componenten

```mermaid
flowchart TB
    subgraph Clients
        AD["Beheerder-client<br/>(playlist-beheer)"]
        GM1["Spelleider-client 1<br/>(browser, groot scherm;<br/>eigen Spotify-app)"]
        GM2["Spelleider-client 2<br/>(andere spelleider,<br/>eigen Spotify-app)"]
        P1["Speler-client 1<br/>(mobiel, ingelogd account)"]
        P2["Speler-client N<br/>(mobiel, ingelogd account)"]
    end

    subgraph Backend
        Auth["Auth Service<br/>(registratie, login,<br/>wachtwoord-reset, lockout)"]
        WS["Realtime Game Server<br/>(WebSocket / Socket.io)"]
        API["REST API<br/>(sessies, auth, playlists, admin, stats)"]
        GameEngine["Game Engine<br/>(state machine per sessie)"]
        Matcher["Answer Matcher<br/>(fuzzy match ≤3 tekens / jaar-tolerantie)"]
        TrackPicker["Track Picker<br/>(houdt afspeelcyclus bij per playlist)"]
        SyncService["Playlist Sync Service<br/>(combineert Spotify + MusicBrainz,<br/>detecteert wijzigingen)"]
        SpotifyProxy["Spotify Integratie<br/>(per-spelleider eigen Client ID/Secret,<br/>OAuth + Connect + Playback API)"]
        StatsService["Statistics Service<br/>(spel/speler/spelleider/marketing,<br/>marketing-aggregaten via nachtelijke job)"]
    end

    subgraph External
        Spotify1["Spotify Client ID<br/>spelleider 1"]
        Spotify2["Spotify Client ID<br/>spelleider 2"]
        MusicBrainz["MusicBrainz API<br/>(land van herkomst artiest)"]
    end

    subgraph Storage
        SessionStore["Session Store<br/>(in-memory / Redis, lopende sessies)"]
        DB["Persistente DB<br/>(users, rollen, playlists, tracks (incl. land),<br/>play-count, speler-antwoorden, statistieken)"]
    end

    AD -->|HTTPS: playlist toevoegen/verversen| API
    GM1 -->|login/registratie| Auth
    GM2 -->|login/registratie| Auth
    P1 -->|login/registratie| Auth
    P2 -->|login/registratie| Auth
    Auth --> DB
    GM1 <-->|WebSocket| WS
    GM2 <-->|WebSocket| WS
    P1 <-->|WebSocket| WS
    P2 <-->|WebSocket| WS
    GM1 -->|HTTPS| API
    GM2 -->|HTTPS| API

    WS --> GameEngine
    API --> GameEngine
    API --> SyncService
    API --> StatsService
    StatsService --> DB
    GameEngine --> Matcher
    GameEngine --> TrackPicker
    GameEngine --> SessionStore
    GameEngine --> SpotifyProxy
    TrackPicker --> DB
    GameEngine -->|antwoorden + resultaten, gekoppeld aan user-account| DB
    SpotifyProxy <-->|sessie 1: eigen OAuth + playback| Spotify1
    SpotifyProxy <-->|sessie 2: andere eigen OAuth + playback| Spotify2
    SyncService <-->|track-metadata ophalen| Spotify1
    SyncService <-->|land opzoeken per artiest| MusicBrainz
    SyncService -->|nummers/artiesten toevoegen, land bijwerken| DB
