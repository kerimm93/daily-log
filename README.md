# DailyLog

DailyLog ist eine persönliche Bullet-Journal-App als lokal-first Single-File-HTML-PWA.

Die App sammelt rohe Tagesnotizen, Voice-Memo-Transkripte, E-Mails und Freitextkarten, extrahiert daraus strukturierte Objekte und führt sie durch Review-, Reflexions- und Export-Workflows. Ziel ist nicht nur Datensammlung, sondern ein alltagstaugliches System für Tageserfassung, Rückstandsabbau, Journaling, Wissensarbeit und persönliche Orientierung.

DailyLog läuft lokal im Browser, ist weitgehend offline nutzbar und kann optional über einen verschlüsselten GitHub-Gist synchronisiert werden.

---

## Kernidee

DailyLog verbindet drei Arbeitsweisen:

1. **Bullet Journal**
   Schnelle Erfassung, Aufgabenstatus, Migration, Future Log, Tagesabschluss.

2. **Review & Reflexion**
   Tagesplanung, Morning Briefing, Review, Daily Note, BuJo-Fassung, forensischer Scanner und mehrtägige Analyseprompts.

3. **Wissenssystem**
   Zettelkasten-Export, Kollektionen, Kontexte, Feed-Import, Volltextsuche und KI-gestützte Strukturierung.

---

## Features

### Tageserfassung

DailyLog erfasst rohe Tageskarten in vier Typen:

* `Log`
* `Voice`
* `E-Mail`
* `Freitext`

Diese Karten dienen als Rohmaterial für spätere Extraktion, Review und Reflexion.

Unterstützt werden unter anderem:

* schnelle manuelle Einträge
* Voice-Memo-Transkripte
* E-Mail- oder Nachrichtentexte
* längere Freitexte
* lokaler Import von Markdown- und Voice-Memo-Dateien
* robuster Mehrdateien-Import ins Kartenfeld

Mehrere importierte Dateien werden nacheinander in einem lesbaren Textformat eingefügt, ohne verschachtelte Codeblocks zu erzeugen.

---

### Strukturierte Objekte

Aus Rohkarten entstehen strukturierte Objekte:

| Typ           | Bedeutung                                            |
| ------------- | ---------------------------------------------------- |
| `aufgabe`     | Aufgabe oder offene Handlung                         |
| `ereignis`    | Termin, Ereignis oder Tagesgeschehen                 |
| `notiz`       | Gedanke, Beobachtung oder Information                |
| `idee`        | Einfall, Projektidee oder möglicher nächster Schritt |
| `zitat`       | Zitat oder relevante Textstelle                      |
| `sop`         | wiederholbarer Ablauf / Standardprozess              |
| `beobachtung` | Muster, Systembeobachtung oder Reflexionssignal      |

Objekte können manuell angelegt oder per KI aus Karten extrahiert werden.

---

### Aufgabenstatus

DailyLog unterstützt Bullet-Journal-nahe Aufgabenstatus:

| Code   | Bedeutung  |
| ------ | ---------- |
| `open` | offen      |
| `x`    | erledigt   |
| `>`    | migriert   |
| `<`    | terminiert |
| `xx`   | gestrichen |

Importierte Aufgabenstatus werden korrekt übernommen. Bereits erledigt importierte Aufgaben können technisch markiert werden, damit sichtbar bleibt, dass sie nicht erst in der App erledigt wurden.

---

### Tagesplanung

Der Plan-Bereich unterstützt:

* Tagesintentionen
* Dinge, die vermieden werden sollen
* Ort
* Aufstehzeit
* Stundenplan / Tagesrahmen
* Aufgabenliste

Migrierte Aufgaben sind standardmäßig nicht vorausgewählt. Dadurch liegt der Fokus auf bewusster Auswahl statt auf bloßer Abwahl.

Statusänderungen in der Planung wirken direkt auf die zugrunde liegenden Objekte. Erledigte oder gestrichene Aufgaben verschwinden aus der offenen Liste.

---

### Review und Tagesabschluss

DailyLog enthält eine mehrstufige Abschluss-Pipeline:

1. **Forensischer Scanner**
2. **optionale Aufgaben-Extraktion**
3. **Daily Note**
4. **BuJo-Fassung**
5. **Zettelkasten-Export**

Der forensische Scanner ist der wichtigste Einstieg für tiefere Verarbeitung. Er sucht nicht nur Aufgaben, sondern auch Kandidaten für Wissensarbeit, Routinen, Systembeobachtungen und Reflexion.

Scanner-Kategorien:

* Proto-Atomic Note
* SOP-Kandidat
* Systembeobachtung
* Heuristik / implizite Regel
* Poetry / Prosa Freewriting
* Zitat / Textstelle

---

### Prompt- und Extraktionslogik

Die Extraktionslogik ist bewusst konservativ geschärft:

* abgeschlossene Handlungen werden als erledigte Aufgaben erkannt
* offene Handlungen werden als offene Aufgaben erkannt
* Termine ohne Handlungscharakter werden als Ereignisse behandelt
* SOPs werden nur erkannt, wenn Trigger, konkrete Schritte und Wiederholungsanspruch sichtbar sind
* unklare SOP-Potenziale werden eher als Idee oder Beobachtung behandelt

Dadurch soll die App weniger falsche Prozessobjekte erzeugen und besser zwischen Handlung, Ereignis, Idee, Beobachtung und echter Routine unterscheiden.

---

### Zeitraum- und Mehrtagesanalyse

DailyLog kann mehrere Tage als Analysezeitraum verwenden.

Für Zeitraumsprompts können unterschiedliche Datenarten ausgewählt werden:

* Objekte
* Rohkarten
* Feed
* Plan / Review
* Zettel
* Future-Log-Bezüge

Dadurch lassen sich Rückstände, mehrtägige Muster und größere Reflexionsabschnitte gezielter auswerten.

---

### Objektansicht und Mini-Review

Die Objektansicht unterstützt Filter und Auswahl für Review-Arbeit.

Vorhanden sind unter anderem:

* Filter nach Kontexten
* Filter nach Kollektionen
* Filterwerte nur aus aktuell sichtbaren Objekten
* Auswahlmodus für sichtbare/gefilterte Objekte
* Auswahl von Objekten für Folgeprompts

Die Auswahl „Alle“ bezieht sich auf die aktuell sichtbaren/gefilterten Objekte, nicht blind auf den gesamten Datenbestand.

---

### Kontexte

Kontexte bündeln Objekte über Tagesgrenzen hinweg.

Sie dienen unter anderem für:

* thematische Filterung
* Review nach Lebensbereich oder Projekt
* spätere Weiterverarbeitung
* Verbindung zwischen Tagesnotizen und langfristigen Themen

---

### Kollektionen

Kollektionen sind thematische Sammelräume für Objekte.

Sie unterstützen:

* direkte Zuweisung aus der Objektansicht
* Suche im Assign-Modal
* neue Kollektionen direkt beim Zuweisen
* Bearbeitung von Name, Beschreibung und Summary
* KI-gestützten Kollektionsabgleich
* Prüfung und Übernahme von JSON-Vorschlägen

Der KI-gestützte Kollektionsflow folgt diesem Muster:

1. Objekte auswählen
2. Prompt erzeugen
3. JSON-Vorschläge einfügen
4. Vorschläge prüfen
5. einzeln übernehmen oder ablehnen

Unterstützte Vorschlagstypen:

* `assign_existing`
* `create_new`
* `skip`

Der Flow ist defensiv gehärtet:

* doppelte `objectIds` im Vorschlags-JSON werden abgefangen
* `create_new` löst auf bestehende Kollektionen auf, wenn der Name bereits existiert
* `skip` und `reject` bleiben transient
* doppelte normalisierte Kollektionsnamen werden blockiert

---

### Zettel und Zettelkasten-Export

DailyLog kann aus Tagesmaterial Zettel erzeugen.

Zettel können:

* behalten
* verworfen
* exportiert
* als Grundlage für spätere Wissensarbeit genutzt werden

Der Zettelkasten-Export hilft dabei, aus flüchtigem Tagesmaterial dauerhafte Notizen zu machen.

---

### Feed

DailyLog unterstützt Feed-Importe aus:

* Readwise
* Readwise Reader
* Raindrop

Feed-Items können in Tageskontext, Review und weitere Verarbeitung einbezogen werden.

---

### Suche

Die Volltextsuche durchsucht:

* Karten
* Objekte
* Zettel
* relevante Tagesdaten

Sie dient als schneller Zugriff auf vergangene Einträge und als Einstieg in Rückstandsarbeit.

---

### Future Log

Das Future Log ermöglicht:

* Aufgaben auf spätere Tage zu legen
* Termine oder Ereignisse vorzumerken
* Monats- oder Datumsbezüge zu speichern
* offene Aufgaben aus dem Tagesabschluss zu migrieren

---

### Verlauf

Die Verlaufsansicht zeigt archivierte Tage mit Status:

* offen
* reviewt
* abgeschlossen

Sie ist die zentrale Grundlage für Rückstandsabbau, alte Tagesreviews und spätere Reflexionsarbeit.

---

## Sync, Backup und Recovery

DailyLog ist lokal-first. Die Daten liegen primär im Browser und können optional synchronisiert oder exportiert werden.

### Lokale Datenhaltung

* primär lokal im Browser
* offline-first
* keine Serverpflicht
* API-Tokens bleiben gerätespezifisch und werden nicht in Exporte oder Gists geschrieben

---

### Verschlüsselter GitHub-Gist-Sync

DailyLog unterstützt optionalen GitHub-Gist-Sync mit clientseitiger Verschlüsselung.

Eigenschaften:

* AES-GCM
* PBKDF2 mit SHA-256
* 250.000 Iterationen
* pro Sync neuer Salt und neue IV
* GitHub speichert nur den verschlüsselten Payload
* Passphrase bleibt lokal bzw. sessionbezogen

Der Sync ist konfliktbewusst und bidirektional. Er ist nicht als blinder Last-Write-Wins-Mechanismus gedacht, sondern als sicherer Abgleich zwischen lokalen Browserständen.

---

### Sync-Schutzmechanismen

Vorhanden sind unter anderem:

* Konflikterkennung
* Konfliktmodal
* Bulk-Vorauswahl für Konflikte: lokal / remote
* Tombstones für sync-stabile Löschungen
* Papierkorb
* Sync-Diagnostik
* Event-Log
* Device-Metadaten
* Schutz vor Resurrection-Bugs
* defensiver Umgang mit Gist-Fehlern

Konfigurationskonflikte werden granularer behandelt, unter anderem bei Prompt-Overrides. Dadurch müssen Config-Daten nicht pauschal überschrieben werden.

---

### Backup

DailyLog unterstützt mehrere Recovery-Pfade:

* manueller JSON-Export
* Raw-Backup-Gist
* strukturiertes ZIP-Backup
* ZIP-Import mit Vorschau / Dry-Run
* Papierkorb und Tombstone-Logik

ZIP-Backups sind besonders wichtig, weil sie eine lokale Wiederherstellung unabhängig vom Gist ermöglichen.

---

## UI und Nutzung

DailyLog ist mobile-first gebaut und als PWA installierbar.

Vorhanden sind:

* Dark Theme
* Light Theme
* E-Ink Theme
* Hamburger-Menü
* Datumsnavigation
* mobile Nutzung
* Desktop-Nutzung
* installierbare PWA

---

## Technische Architektur

DailyLog folgt dem Single-File-App-Prinzip:

* eine zentrale `index.html`
* Vanilla JavaScript
* kein Build-Step
* kein Backend
* keine Framework-Pflicht
* hostbar über GitHub Pages
* lokale Persistenz im Browser
* optionaler GitHub-Gist-Sync

Die App ist bewusst so gebaut, dass sie schnell iterierbar bleibt und kleine, minimal-invasive Patches möglich sind.

---

## Schnellstart

Repository klonen oder herunterladen und die App lokal öffnen:

```bash
open index.html
```

Alternativ kann die App über GitHub Pages gehostet und als PWA installiert werden.

---

## Optionaler Gist-Sync

Für den Sync werden benötigt:

1. GitHub-Token mit Gist-Berechtigung
2. Gist-ID
3. optionale Sync-Passphrase

Die Einstellungen werden lokal im Browser gespeichert. Tokens, API-Keys und Passphrasen werden nicht in den normalen Datenexport geschrieben.

---

## Aktueller Projektfokus

DailyLog ist inzwischen kein roher Prototyp mehr, sondern ein starkes persönliches Arbeitswerkzeug für:

* tägliche Erfassung
* Review
* Rückstandsabbau
* KI-gestützte Strukturierung
* Kollektionspflege
* Mehrtagesanalyse
* Journaling
* Wissensarbeit

Der aktuelle Fokus liegt auf Stabilisierung und Alltagsnutzen:

* Rückstand unverarbeiteter Tage abbauen
* bestehende Review-Flows leichter nutzbar machen
* Kollektionsarbeit vereinfachen
* Reflexion und Journaling besser integrieren
* neue Features nur bauen, wenn sie echte Reibung reduzieren

---

## Roadmap

### Nächste sinnvolle Schritte

* [ ] Typfilter für KI-Kollektionsabgleich
  Zum Beispiel nur Notizen, nur Ereignisse, Notizen + Ereignisse oder alles außer Aufgaben in den Kollektionsabgleich geben.

* [ ] JSON-Zielformat für Kollektions-Zusammenfassungen glätten
  KI-Ausgaben sollen direkter in den bestehenden Kollektionsupdate-Flow passen.

* [ ] Reflexions- und Journaling-Abschnitt vorbereiten
  Tages- und Zeitraumsmaterial stärker zu Mustern, Signalen, offenen Schleifen und nächsten Schritten verdichten.

* [ ] Random-alter-Tag-Feature
  Einen zufälligen alten Tag wieder vorlegen, um biografische Verbindung und Wiederentdeckung zu fördern.

* [ ] Future-Log-Anzeige für migrierte Objekte prüfen/reparieren
  Falls dieser Punkt den Rückstandsabbau im Alltag blockiert, sollte er als Bugfix vorgezogen werden.

---

### Später

* [ ] OpenAI-API für Daily Note mit einem Klick
* [ ] Wochenmodul mit Wochenplan-Import
* [ ] Batch-Upload von Voice Memos
* [ ] Threading zwischen Objekten
* [ ] untergeordnete Bullets / Indentation
* [ ] Prompt-Studio
* [ ] Kontext-System weiter strukturieren
* [ ] Kontext → Kollektion überführen
* [ ] erweiterte verlinkte Daily-Notes-Logik
* [ ] größeres UI-Redesign nach separater Prüfung

---

## Designprinzipien

DailyLog soll:

* lokal kontrollierbar bleiben
* Daten transparent halten
* KI als Verarbeitungshilfe nutzen, nicht als Black Box
* Rückstände beherrschbar machen
* tägliche Nutzung erleichtern
* Review und Reflexion stärken
* keine unnötigen Abhängigkeiten einführen
* kleine, testbare Verbesserungen bevorzugen

---

## Philosophie

DailyLog ist kein reines Tagebuch und keine reine Aufgabenliste.

Es ist ein persönliches Betriebssystem für Tagesmaterial:

* Was ist passiert?
* Was ist offen?
* Was wiederholt sich?
* Was soll bewahrt werden?
* Was gehört in mein Wissenssystem?
* Was muss ich morgen wirklich sehen?

Die App soll nicht mehr Dinge erzeugen, sondern vorhandenes Material besser durch den Alltag tragen.
