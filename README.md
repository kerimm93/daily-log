# Daily Log

Ein persönliches Bullet-Journal als Single-File-HTML-App — lokal, offline-fähig, optional mit verschlüsseltem GitHub-Gist-Sync, Rohkarten-Backup und strukturiertem ZIP-Backup.

---

## Features

### Tagesablauf

* **Sammeln** — Karten erfassen (`Log`, `Voice-Memo-Transkript`, `E-Mail`, `Freitext`)
* **Objekte** — strukturierte Einträge: Aufgaben, Ereignisse, Notizen, Ideen, Zitate, SOPs, Beobachtungen
* **Plan** — Tagesplanung mit Intentionen, Stundenplan, Ort, Aufstehzeit und Aufgabenliste
* **Review** — Morgen-Review + Abend-Migration offener Aufgaben
* **Abschluss** — mehrstufige Tagesabschluss-Pipeline:

  * Aufgaben-Extraktion
  * forensischer Scanner
  * Daily Note
  * BuJo-Fassung
  * Zettelkasten-Export
* **Future Log** — Aufgaben und Termine auf spätere Tage / Monate legen
* **Verlauf** — archivierte Tage mit Status (`offen / reviewt / abgeschlossen`)

### Wissensarbeit

* **Kontexte** — Objekte nach `@kontext` gefiltert, über alle Tage hinweg
* **Zettel** — Zettelkasten-Notizen erstellen, behalten, exportieren oder verwerfen
* **Kollektionen** — thematische Sammelräume für Objekte

  * Objekte können direkt aus dem Objekt-Flow Kollektionen zugeordnet werden
  * Kollektion-Zuweisung mit Suche
  * neue Kollektionen direkt aus dem Zuweisungs-Modal anlegbar
* **Feed** — Readwise-Highlights, Reader-Inhalte und Raindrop-Bookmarks laden und verarbeiten
* **Suche** — Volltextsuche über Karten, Objekte und Zettel

### Extraktion & Verarbeitung

* KI-gestützter Extraktionsprompt mit Typregeln für:

  * `aufgabe`
  * `ereignis`
  * `notiz`
  * `idee`
  * `zitat`
  * `sop`
  * `beobachtung`
* Direktextraktion über OpenAI API (`gpt-4o-mini`)
* Quellenanzeige pro Objekt (`sourceQuote`, `confidence`, `needsReview`)
* Globaler Rückstand: alle unextrahierten Karten vergangener Tage auf einen Blick
* Objektauswahl für zusätzliche Prompt-Exports / Spezialauswertungen

### Sync, Recovery & Backup

* Verschlüsselter GitHub-Gist-Sync (AES-GCM + PBKDF2)
* Konfliktbewusster bidirektionaler Sync statt blindem Überschreiben
* Sync-Diagnostik mit:

  * Gerätekennung
  * letztem Remote-Zeitstempel
  * lokalem `_lastExported`
  * Event-Log
* Konflikt-Modal mit Bulk-Vorauswahl:

  * **Alle auf lokal**
  * **Alle auf remote**
* Separates Raw-Backup-Gist für Rohkarten
* ZIP-Backup-Export mit strukturierter Archivform
* ZIP-Import mit Dry-Run / Vorschau vor destruktivem Overwrite
* Papierkorb mit Wiederherstellung
* Tombstone-basierte Lösch-Synchronisation (kein Resurrection-Bug)

### UI

* Dark / Light / E-Ink Theme
* Mobile-first
* installierbar als PWA
* Hamburger-Navigation auf kleinen Bildschirmen
* Datumsnavigation mit vergangenheitsfähiger Tagesansicht

---

## Roadmap

### Zuletzt umgesetzt

* [x] Bidirektionalen, konfliktbewussten Gist-Sync stabilisiert und im Alltag getestet
* [x] Bulk-Vorauswahl im Sync-Konflikt-Modal ergänzt (`Alle auf lokal` / `Alle auf remote`)
* [x] Kollektion-Zuweisung aus dem Objekt-Flow verbessert: Suche + neue Kollektion direkt im Assign-Modal

### Als Nächstes geplant

* [ ] Filter, um Objekte auszublenden, die bereits einer Kollektion zugeordnet sind
* [ ] Custom Prompts in den Einstellungen mit Defaults + Reset-Möglichkeit
* [ ] Prompt-Input-Scope steuerbar machen (z. B. nur Objekte vs. vollständiger Tag inkl. Rohkarten)

### Später / Backlog

* [ ] Forensischen Scanner standardmäßig mit vollständigem Tageskontext inklusive Rohkarten speisen
* [ ] Zeitraum / mehrere vollständige Tage in Prompt-Exports einbetten können
* [ ] Weitere Verarbeitungs- und Auswertungs-Prompts als gezielte Berichtsfunktionen ergänzen

---

## Schnellstart

```bash
# Keine Installation nötig. Datei einfach im Browser öffnen:
open index.html
```

Die App läuft vollständig lokal im Browser.

---

## Lokale Datenhaltung

Die App speichert lokal primär in **IndexedDB**.
Falls IndexedDB nicht verfügbar ist oder fehlschlägt, wird auf **localStorage als Fallback** zurückgegriffen.

Das bedeutet:

* normale Nutzung ist offline möglich
* lokale Daten bleiben auch ohne Gist-Sync erhalten
* ältere `localStorage`-Stände werden bei Bedarf nach IndexedDB migriert

---

## Optionaler Gist-Sync

### 1. GitHub Personal Access Token erstellen

1. GitHub → Settings → Developer settings → Personal access tokens
2. Berechtigung: **Gist** (`read + write`)
3. Token kopieren

### 2. Gists anlegen

Du kannst zwei getrennte Gists nutzen:

| Gist            | Zweck                                          |
| --------------- | ---------------------------------------------- |
| Haupt-Gist      | kompletter App-State (`dailylog_v2_data.json`) |
| Raw-Backup-Gist | Rohkarten-Backup (`dailylog_raw_cards.json`)   |

### 3. In der App konfigurieren

In **Einstellungen** eintragen:

* **GitHub Gist Token**
* **Gist ID**
* **Raw Backup Gist Token** (optional)
* **Raw Backup Gist ID** (optional)
* **Sync-Passphrase**

  * optional mit „Passphrase auf diesem Gerät merken“

### 4. Sync verwenden

Verfügbare Sync-Aktionen in den Einstellungen:

* `↔ Jetzt synchronisieren`
* `☁ In Gist schreiben`
* `↓ Nur von Gist laden`
* `⚠ Gist überschreibt lokal`

> Ohne gesetzte Passphrase wird der verschlüsselte Haupt-Gist nicht beschrieben.

---

## Verschlüsselung

Alle Daten im Haupt-Gist werden clientseitig verschlüsselt:

* **Algorithmus:** AES-GCM 256 Bit
* **Key Derivation:** PBKDF2 mit SHA-256
* **Iterationen:** 250.000
* **pro Schreibvorgang neuer Salt + neue IV**
* **Format:** JSON-Envelope (`dailylog-encrypted-v1`)

Nicht verschlüsselt sind:

* lokale Browser-Daten
* manuelle JSON-Exporte
* ZIP-Backups

---

## Objekt-Typen

| Typ           | Symbol | Bedeutung                                               |
| ------------- | ------ | ------------------------------------------------------- |
| `aufgabe`     | ☐      | aktiv zu erledigende Aufgabe, möglichst mit Aktionsverb |
| `ereignis`    | ◯      | zeitgebundenes Ereignis / Termin                        |
| `notiz`       | −      | Information, Gedanke, Beobachtung                       |
| `idee`        | !      | neuer Einfall / Proto-Gedanke                           |
| `zitat`       | "      | zitierbarer Satz                                        |
| `sop`         | ⟳      | wiederholbarer Prozess                                  |
| `beobachtung` | ~      | Muster-, Energie- oder Verhaltensbeobachtung            |

### Aufgaben-Status

| Status | Bedeutung                          |
| ------ | ---------------------------------- |
| `open` | offen                              |
| `x`    | erledigt                           |
| `>`    | migriert                           |
| `<`    | terminiert / ins Future Log gelegt |
| `xx`   | gestrichen / gecancelt             |

---

## Integrationen

| Integration | Zweck                             |
| ----------- | --------------------------------- |
| OpenAI API  | Direktextraktion                  |
| Readwise    | Highlights / Reader-Inhalte laden |
| Raindrop.io | Bookmarks laden                   |

Alle Tokens werden nur lokal im Browser gespeichert und nicht in App-Exports oder Gists abgelegt.

---

## Tagesstatus

| Status        | Feld                      | Gesetzt durch                                   |
| ------------- | ------------------------- | ----------------------------------------------- |
| offen         | *(kein Flag)*             | automatischer Tageswechsel / noch nicht reviewt |
| reviewt       | `reviewDone: true`        | Review abgeschlossen                            |
| abgeschlossen | `closedAt: ISO-Timestamp` | expliziter Tagesabschluss                       |

---

## Export / Import

| Aktion                 | Format                          | Verschlüsselt |
| ---------------------- | ------------------------------- | ------------- |
| Vollständiger Export   | `.json`                         | ❌             |
| Datei mergen           | `.json` lesen                   | ❌             |
| Datei überschreiben    | `.json` lesen                   | ❌             |
| ZIP-Backup exportieren | `.zip`                          | ❌             |
| ZIP-Backup importieren | `.zip` mit Dry-Run              | ❌             |
| Gist Push              | verschlüsselter JSON-Envelope   | ✅             |
| Rohkarten sichern      | verschlüsselter Raw-Backup-Gist | ✅             |

---

## ZIP-Backup

Das ZIP-Backup ist ein strukturiertes Mehrdateien-Archiv.

Typische Inhalte:

```text
manifest.json
today.json
collections.json
config.json
deletedIds.json
trash.json
futurelog.json
migrationPuffer.json
zettels.json
feedMeta.json
days/YYYY-MM-DD.json
```

Der ZIP-Import läuft nicht blind:

* zuerst Analyse / Dry-Run
* dann Vorschau
* erst danach optional vollständiges lokales Überschreiben

---

## Datenmodell (vereinfacht)

```js
S = {
  days: [],
  futurelog: [],
  migrationPuffer: [],
  feedLastReadwise: '',
  feedLastRaindrop: '',
  feedLastHighlights: '',
  trash: { cards: [], objects: [] },
  zettels: [],
  collections: [],
  config: { name: '', context: '', contexts: [] },
  deletedIds: {},
  _lastExported: ''
};

TODAY = {
  date: '',
  cards: [],
  objects: [],
  feedItems: [],
  reviewDone: false,
  plan: {
    intentionen: '',
    vermeiden: '',
    aufstehzeit: '05:00',
    ort: '',
    stundenplan: '',
    tasks: []
  }
};
```

---

## Architektur

```text
index.html      — komplette App
manifest.json   — PWA-Manifest
sw.js           — Service Worker
```

Grundprinzipien:

* Single-File-App
* kein Build-Step
* kein Framework
* kein Backend
* lokal zuerst, Gist nur als optionaler Cloud-Spiegel

---

## Bekannte Grenzen

* Sehr große Datenmengen können lokale Browser-Speichergrenzen erreichen.
* Ohne gespeicherte Passphrase muss die Sync-Passphrase nach Reload erneut eingegeben werden.
* Die App ist auf persönliche Einzelbenutzung ausgelegt, nicht auf Multiuser-Kollaboration.
* Reihenfolgen von Karten/Objekten können nach Merge in Randfällen variieren, ohne dass Datenverlust vorliegt.

---

## Projektphilosophie

Die App priorisiert:

* lokale Kontrolle
* nachvollziehbare Datenhaltung
* konfliktbewussten Sync
* minimale externe Abhängigkeiten
* schnelle Iteration in einer einzigen HTML-Datei
