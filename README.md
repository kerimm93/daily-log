# Daily Log

Ein persönliches Bullet-Journal als Single-File-HTML-App — lokal-first und weitgehend offline nutzbar (KI-Features benötigen derzeit noch Internet), optional mit verschlüsseltem GitHub-Gist-Sync, Rohkarten-Backup und strukturiertem ZIP-Backup.

---

## Features

### Tagesablauf

* **Sammeln** — Karten erfassen (`Log`, `Voice-Memo-Transkript`, `E-Mail`, `Freitext`)

* **Objekte** — strukturierte Einträge: Aufgaben, Ereignisse, Notizen, Ideen, Zitate, SOPs, Beobachtungen

* **Plan** — Tagesplanung mit Intentionen, Stundenplan, Ort, Aufstehzeit und Aufgabenliste

  * migrierte Aufgaben sind standardmäßig NICHT vorausgewählt
  * Fokus auf bewusste Auswahl statt Abwahl
  * Statusänderungen wirken direkt auf zugrunde liegende Objekte
  * erledigte / gestrichene Aufgaben verschwinden aus der offenen Liste

* **Review** — Morgen-Review + Abend-Migration offener Aufgaben

* **Abschluss** — mehrstufige Tagesabschluss-Pipeline:

  * forensischer Scanner (primärer Einstieg)
  * optionale Aufgaben-Extraktion (Legacy-Workflow)
  * Daily Note
  * BuJo-Fassung
  * Zettelkasten-Export

* **Future Log** — Aufgaben und Termine auf spätere Tage / Monate legen

* **Verlauf** — archivierte Tage mit Status (`offen / reviewt / abgeschlossen`)

---

### Wissensarbeit

* **Kontexte** — Objekte nach `@kontext` gefiltert, über alle Tage hinweg

* **Zettel** — Zettelkasten-Notizen erstellen, behalten, exportieren oder verwerfen

* **Kollektionen** — thematische Sammelräume für Objekte

  * direkte Zuweisung aus der Objektansicht
  * Suche im Assign-Modal
  * neue Kollektionen direkt beim Zuweisen anlegbar
  * Grundlage für erweiterte Filterlogik in der Objektansicht

* **Feed** — Readwise, Reader, Raindrop

* **Suche** — Volltext über Karten, Objekte und Zettel

---

### Extraktion & Verarbeitung

* KI-gestützte Objektextraktion
* Direktextraktion via OpenAI (`gpt-4o-mini`)
* Quellenanzeige (`sourceQuote`, `confidence`, `needsReview`)
* Auswahl von Objekten für weitere Prompts

**Neu:**

* Importierter Aufgabenstatus wird korrekt übernommen (`open`, `x`, `>`, `xx`)
* Bereits erledigt importierte Aufgaben werden technisch markiert (`completionOrigin: 'import'`)
* Dezentes UI-Badge für importierte erledigte Aufgaben

---

### Sync, Recovery & Backup

* Verschlüsselter GitHub-Gist-Sync (AES-GCM + PBKDF2)
* Konfliktbewusster bidirektionaler Sync
* Sync-Diagnostik + Event-Log

**Neu:**

* Granulare Config-Sync-Konflikte (inkl. Prompt-Overrides)
* Feldweiser Config-Merge statt pauschalem Überschreiben
* Priorisierte Darstellung von Config-Konflikten im Modal

Weitere Features:

* Bulk-Konfliktauflösung (lokal / remote)
* Raw-Backup-Gist
* ZIP-Backup mit Vorschau (Dry-Run)
* Papierkorb + Tombstone-Sync

---

### UI

* Dark / Light / E-Ink Theme
* Mobile-first
* PWA installierbar
* Hamburger-Menü
* Datumsnavigation

---

## Roadmap

### Als Nächstes

* [ ] Objekt-Filter erweitern (Kontexte + Kollektionen pro Tag)
* [ ] Prompt-Input-Scope steuerbar machen (Objekte vs. kompletter Tag inkl. Rohkarten)
* [ ] Prompts zentral zugänglich machen (Basis für Prompt-Studio)

### Später

* [ ] Prompt-Studio (eigene Prompts, Scope, Zieldefinition)
* [ ] Mehrtages-/Zeitraum-Prompts
* [ ] Kontext-System verbessern (Zusammenführen, Strukturieren)
* [ ] Kontext → Kollektion überführen
* [ ] Prompt-Backup / Export

---

## Schnellstart

```bash
open index.html
```

Keine Installation nötig.

---

## Lokale Datenhaltung

* Primär: IndexedDB
* Fallback: localStorage
* Vollständig offline nutzbar

---

## Optionaler Gist-Sync

* Token + Gist-ID in Einstellungen
* optionale Passphrase für Verschlüsselung
* Sync-Modi: Push / Pull / Merge

---

## Verschlüsselung

* AES-GCM (256 Bit)
* PBKDF2 (SHA-256, 250k Iterationen)
* pro Sync neuer Salt + IV

---

## Objekt-Typen

| Typ         | Bedeutung |
| ----------- | --------- |
| aufgabe     | Aufgabe   |
| ereignis    | Termin    |
| notiz       | Gedanke   |
| idee        | Einfall   |
| zitat       | Zitat     |
| sop         | Prozess   |
| beobachtung | Muster    |

### Aufgaben-Status

| Code | Bedeutung  |
| ---- | ---------- |
| open | offen      |
| x    | erledigt   |
| >    | migriert   |
| <    | terminiert |
| xx   | gestrichen |

---

## Architektur

* Single-File-App (`index.html`)
* kein Build-Step
* kein Backend
* lokal-first, Gist optional

---

## Philosophie

* lokale Kontrolle
* transparente Daten
* konfliktbewusster Sync
* minimale Abhängigkeiten
* schnelle Iteration
