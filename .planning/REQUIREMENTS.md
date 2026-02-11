# Requirements: Kniff — Deutsche Spieleseite

**Defined:** 2026-02-11
**Core Value:** Spieler können in Echtzeit gemeinsam klassische deutsche Spiele spielen — wie an einem echten Stammtisch, nur online.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentifizierung & Nutzerverwaltung

- [ ] **AUTH-01**: Erster Nutzer kann Admin-Account erstellen beim ersten Seitenaufruf
- [ ] **AUTH-02**: Admin kann Nutzer per E-Mail einladen (kryptografisch sichere Einladungstokens)
- [ ] **AUTH-03**: Eingeladener Nutzer kann sich über Einladungslink registrieren
- [ ] **AUTH-04**: Nutzer kann sich mit E-Mail und Passwort einloggen
- [ ] **AUTH-05**: Nutzer-Session bleibt über Browser-Refresh bestehen
- [ ] **AUTH-06**: Admin kann Nutzer sperren und entbannen

### Virtuelles Guthaben

- [ ] **GUTH-01**: Neuer Nutzer erhält Startguthaben von 1000 (Admin kann bei Einladung überschreiben)
- [ ] **GUTH-02**: Aktuelles Guthaben ist auf jeder Seite sichtbar
- [ ] **GUTH-03**: Admin kann Guthaben von Nutzern hinzufügen oder entfernen
- [ ] **GUTH-04**: Alle Guthaben-Änderungen werden in Transaktions-Log festgehalten
- [ ] **GUTH-05**: Raum-Ersteller kann optionalen Einsatz festlegen (0 = kein Einsatz)
- [ ] **GUTH-06**: Bei hohen Einsätzen wird Bestätigung angezeigt bevor Einsatz platziert wird

### Spielräume & Lobby

- [ ] **RAUM-01**: Nutzer kann Spielraum erstellen (Spieltyp, max. Spieler, Einsatz wählen)
- [ ] **RAUM-02**: Nutzer kann offenen Spielräumen beitreten
- [ ] **RAUM-03**: Lobby zeigt Übersicht aller Räume (Spieltyp, Spieleranzahl, Einsatzhöhe)
- [ ] **RAUM-04**: Inaktive Spieler werden nach Timeout automatisch aus Raum entfernt
- [ ] **RAUM-05**: Leere Räume werden automatisch aufgeräumt

### Spiele

- [ ] **SPIEL-01**: Nutzer kann Kniffel (Würfelspiel) mit anderen Spielern in Echtzeit spielen
- [ ] **SPIEL-02**: Nutzer kann Blackjack solo gegen das Haus spielen
- [ ] **SPIEL-03**: Nutzer kann Blackjack mit anderen Spielern am Tisch spielen
- [ ] **SPIEL-04**: Nutzer kann Texas Hold'em Poker mit anderen Spielern spielen
- [ ] **SPIEL-05**: Nutzer kann Roulette solo gegen das Haus spielen
- [ ] **SPIEL-06**: Nutzer kann Roulette mit anderen Spielern am Tisch spielen
- [ ] **SPIEL-07**: Alle Spielergebnisse werden server-seitig mit kryptografischem RNG berechnet
- [ ] **SPIEL-08**: Jeder Spielzug hat eine Zeitbegrenzung (Auto-Play bei Ablauf)

### Echtzeit & Verbindung

- [ ] **ECHT-01**: Spielstatus wird in Echtzeit per WebSocket an alle Spieler im Raum übertragen
- [ ] **ECHT-02**: Bei Verbindungsabbruch kann Spieler sich innerhalb von 60s wieder verbinden ohne Spielstand zu verlieren
- [ ] **ECHT-03**: Nutzer kann während des Spiels Text-Nachrichten an andere Spieler im Raum senden

### UI & Personalisierung

- [ ] **UI-01**: Gesamte Oberfläche ist auf Deutsch (Labels, Meldungen, Spielbegriffe)
- [ ] **UI-02**: Seite ist responsive und Mobile-First gestaltet
- [ ] **UI-03**: Nutzer kann zwischen verschiedenen visuellen Themes wechseln
- [ ] **UI-04**: Nutzer hat Profilseite mit Spielstatistiken (Spiele gespielt, gewonnen, Guthaben-Verlauf)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Weitere Spiele

- **SPIEL-V2-01**: Nutzer kann Watten (bayerisches Kartenspiel) spielen
- **SPIEL-V2-02**: Nutzer kann Uno spielen
- **SPIEL-V2-03**: Nutzer kann Schach spielen
- **SPIEL-V2-04**: Nutzer kann Schiffe Versenken spielen

### Erweiterte Features

- **EXT-01**: Turniermodus mit mehreren Runden
- **EXT-02**: Achievement-System (Badges, Freischaltungen)
- **EXT-03**: Freundesliste
- **EXT-04**: PWA-Features (Offline-Support, Install-Prompt)
- **EXT-05**: Zuschauer-Modus für laufende Spiele
- **EXT-06**: Chat-Moderation (Stummschalten, Blockieren, Melden)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Echtes Geld / Glücksspiel | Kein reales Geld — nur virtuelle Spielwährung. Vermeidet Glücksspiel-Regulierung |
| Voice Chat | Schwer zu moderieren, hohe Bandbreite, verstärkt Toxizität |
| Blockchain/Crypto | Regulatorischer Alptraum, bricht Spielökonomie |
| KI-Gegner für Multiplayer | Widerspricht sozialem Zweck der Plattform |
| ELO/Ranking-System | 20-100 Nutzer zu klein für aussagekräftige Rankings |
| Mikrotransaktionen | Rechtliches Minenfeld, Pay-to-Win Dynamik |
| Native Mobile Apps | 3x Entwicklungskosten, Responsive Web reicht |
| Öffentliche Registrierung | Nur Einladung durch Admin — Community-Charakter |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| AUTH-06 | — | Pending |
| GUTH-01 | — | Pending |
| GUTH-02 | — | Pending |
| GUTH-03 | — | Pending |
| GUTH-04 | — | Pending |
| GUTH-05 | — | Pending |
| GUTH-06 | — | Pending |
| RAUM-01 | — | Pending |
| RAUM-02 | — | Pending |
| RAUM-03 | — | Pending |
| RAUM-04 | — | Pending |
| RAUM-05 | — | Pending |
| SPIEL-01 | — | Pending |
| SPIEL-02 | — | Pending |
| SPIEL-03 | — | Pending |
| SPIEL-04 | — | Pending |
| SPIEL-05 | — | Pending |
| SPIEL-06 | — | Pending |
| SPIEL-07 | — | Pending |
| SPIEL-08 | — | Pending |
| ECHT-01 | — | Pending |
| ECHT-02 | — | Pending |
| ECHT-03 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |
| UI-04 | — | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 0
- Unmapped: 32 ⚠️

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
