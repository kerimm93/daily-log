# Daily Log

Ein persönliches Bullet-Journal als Single-File-HTML-App — lokal, offline-fähig, optional mit verschlüsseltem GitHub-Gist-Sync.

---

## Features

### Tagesablauf
- **Sammeln** — Karten erfassen (Log, Voice-Memo-Transkript, E-Mail, Freitext)
- **Objekte** — strukturierte Einträge: Aufgaben, Ereignisse, Notizen, Ideen, Zitate, SOPs, Beobachtungen
- **Plan** — Tagesplan mit Intentionen, Stundenplan und Aufgabenliste
- **Review** — Abend-Migration: offene Aufgaben entscheiden (`erledigt / migrieren / terminieren / canceln`)
- **Abschluss** — Pipeline für Tagesabschluss inkl. Co-Pilot-Prompt, Morning-Briefing, Zettelkasten-Export
- **Future Log** — Aufgaben und Termine auf spätere Tage / Monate legen
- **Verlauf** — alle archivierten Tage mit Tagesstatus (`offen / reviewt / abgeschlossen`)

### Wissensarbeit
- **Kontexte** — alle Objekte nach `@kontext` gefiltert, über alle Tage hinweg
- **Zettel** — Zettelkasten-Notizen aus Highlights erstellen, behalten oder verwerfen
- **Feed** — Readwise-Highlights und Raindrop-Bookmarks laden und verarbeiten
- **Suche** — Volltextsuche über Karten, Objekte und Zettel (`Cmd/Ctrl+K`)

### Extraktion
- KI-gestützter Extraktionsprompt (Bullet-Journal-Regeln, klare Typ-Trennung)
- Direktextraktion über OpenAI API (GPT-4o-mini)
- Quellenanzeige pro Objekt (`sourceQuote`, `confidence`, `needsReview`)
- Globaler Rückstand: alle unextrahierten Karten aller Tage auf einen Blick

### Sync & Backup
- Verschlüsselter GitHub-Gist-Sync (AES-GCM, PBKDF2)
- Separates Raw-Backup-Gist für Rohkarten
- Lokaler JSON-Export (Klartext) und Datei-Merge/-Overwrite
- Papierkorb mit Wiederherstellung
- Tombstone-basierte Lösch-Synchronisation (kein Resurrection-Bug)

### UI
- Dark / Light / E-Ink Theme
- Mobile-first, PWA-fähig (installierbar)
- Hamburger-Navigation auf kleinen Bildschirmen

---

## Schnellstart

```bash
# Keine Installation nötig. Datei einfach im Browser öffnen:
open daily-log.html
```

Die App läuft vollständig lokal. Alle Daten bleiben im `localStorage` des Browsers.

---

## Optionaler Gist-Sync einrichten

### 1. GitHub Personal Access Token erstellen

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Berechtigungen: **Gist** (read + write)
3. Token kopieren

### 2. Gist-IDs anlegen

Zwei separate Gists anlegen (können leer sein):

| Gist | Inhalt |
|---|---|
| Haupt-Gist | Gesamter App-State (`dailylog_v2_data.json`) |
| Raw-Backup-Gist | Rohkarten-Backup (`dailylog_raw_cards.json`) |

Jeweils die Gist-ID aus der URL kopieren (z.B. `https://gist.github.com/user/abc123def456` → `abc123def456`).

### 3. In der App konfigurieren

Einstellungen öffnen (⚙-Button) und eintragen:

- **GitHub Gist Token** — dein Personal Access Token
- **Gist ID** — ID des Haupt-Gists
- **Raw Backup Gist Token** — gleicher oder separater Token
- **Raw Backup Gist ID** — ID des Raw-Backup-Gists
- **Sync-Passphrase** — beliebige Passphrase (verschlüsselt alle Daten auf GitHub)
  - Optional: „Passphrase auf diesem Gerät merken" aktivieren

### 4. Erster Sync

„☁ Jetzt speichern" klicken. Danach synchronisiert die App automatisch alle 30 Sekunden nach Änderungen.

> **Hinweis:** Ohne Passphrase wird nichts ins Gist geschrieben. Die Passphrase verlässt das Gerät nie — GitHub speichert nur den verschlüsselten Ciphertext.

---

## Verschlüsselung

Alle Daten auf GitHub sind clientseitig verschlüsselt:

- **Algorithmus:** AES-GCM 256-Bit
- **Key Derivation:** PBKDF2 mit SHA-256, 250.000 Iterationen
- **Salt + IV:** zufällig neu pro Schreibvorgang
- **Format im Gist:** JSON-Envelope mit `format: "dailylog-encrypted-v1"`

Lokale `localStorage`-Daten und manuell heruntergeladene JSON-Exporte sind **nicht** verschlüsselt.

---

## Objekt-Typen

| Typ | Symbol | Bedeutung |
|---|---|---|
| `aufgabe` | ☐ | Aktiv zu erledigende Aufgabe — immer mit Aktionsverb |
| `ereignis` | ◯ | Zeitgebundenes Ereignis / Termin |
| `notiz` | − | Information, Gedanke, Beobachtung |
| `idee` | ! | Neuer Einfall oder Proto-Gedanke |
| `zitat` | " | Zitierbarer Satz (eigen oder fremd) |
| `sop` | ⟳ | Wiederholbarer Prozess |
| `beobachtung` | ~ | Systembeobachtung zu Energie, Verhalten, Mustern |

### Aufgaben-Status

| Status | Bedeutung |
|---|---|
| `open` | offen |
| `x` | erledigt |
| `>` | migriert (nächster Tag / Migration Puffer) |
| `<` | terminiert (Future Log) |
| `xx` | gestrichen / gecancelt |

---

## Integrationen

| Integration | Zweck | Token |
|---|---|---|
| OpenAI API | Direktextraktion (GPT-4o-mini) | `sk-...` |
| Readwise | Highlights und Reader-Artikel laden | Token aus readwise.io/access-token |
| Raindrop.io | Bookmarks laden | Token aus app.raindrop.io → Integrations |

Alle Tokens werden nur im `localStorage` des Browsers gespeichert.

---

## Tagesstatus

| Status | Feld | Gesetzt durch |
|---|---|---|
| offen | *(kein Flag)* | automatischer Tageswechsel |
| reviewt | `reviewDone: true` | „Migration abschließen" im Review-Tab |
| abgeschlossen | `closedAt: ISO-Timestamp` | „Tag abschließen & speichern" im Abschluss-Tab |

Im Verlauf und in der Datumsnavigation wird der Status als Badge angezeigt.

---

## Datenstruktur (localStorage)

```
localStorage["dailylog_v2"] = {
  S: {
    days: [{ date, cards, objects, reviewDone, closedAt, plan, feedItems }],
    futurelog: [...],
    migrationPuffer: [...],
    zettels: [...],
    trash: { cards: [...], objects: [...] },
    deletedIds: { id: ISO-Timestamp },   // Tombstones
    config: { name, context, contexts },
    _lastExported: ISO-Timestamp
  },
  TODAY: { date, cards, objects, feedItems, reviewDone, plan }
}
```

Alle Daten liegen lokal vor. Gist-Sync ist optional und addiert nur einen verschlüsselten Cloud-Spiegel.

---

## Export / Import

| Aktion | Format | Verschlüsselt |
|---|---|---|
| ↓ Vollständiger Export | `.json` (Klartext) | ❌ |
| ↑ Datei mergen | `.json` (Klartext lesen) | ❌ |
| ⚠ Datei überschreiben | `.json` (Klartext lesen) | ❌ |
| ☁ Gist Push | Encrypted Envelope | ✅ |
| 🗃 Rohkarten sichern | Encrypted Envelope | ✅ |

---

## Architektur

```
daily-log.html          — komplette App in einer Datei
manifest.json           — PWA-Manifest (optional)
sw.js                   — Service Worker für Offline-Support (optional)
```

Die App hat kein Backend, keinen Build-Step, keine npm-Abhängigkeiten. Sie läuft in jedem modernen Browser direkt als `file://`.

---

## Bekannte Limitierungen

- **localStorage-Limit:** ~5 MB. Bei großen Datenmengen empfiehlt sich das regelmäßige Komprimieren alter Tage (Einstellungen → „Alte Tage komprimieren").
- **Passphrase nach Reload:** Ohne aktiviertes „Passphrase merken" muss die Sync-Passphrase nach jedem Reload erneut eingegeben werden.
- **Kein Multiuser:** Die App ist für eine einzelne Person ausgelegt.
