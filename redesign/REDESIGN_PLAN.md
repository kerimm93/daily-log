# REDESIGN_PLAN.md — Etappenplan DailyLog Redesign

Jede Etappe ist ein eigenständiger, testbarer Patch. Keine Etappe setzt eine spätere voraus.

---

## Etappe 0 — Vorbereitung (Einmaliger Setup)

**Ziel:** Sicherstellen, dass der Coding-Agent die richtigen Rahmenbedingungen hat.

- Aktuelle index.html sichern (Backup, z. B. `index.v1.html`)
- Alle CSS-Variablen und Theme-Klassen erfassen
- Alle bestehenden Tab-IDs und Panel-IDs dokumentieren
- SCREEN_FIDELITY_CHECKLIST.md als Abgleich-Referenz bereithalten

**Verboten:** Keine funktionalen Änderungen.

---

## Etappe 1 — Lesbarkeits- und Theme-Pass

**Ziel:** Verbesserte Kontraste, klarere Texthierarchie, ruhigere E-Ink-Darstellung.

**Erlaubte Änderungen:**
- CSS-Variablen für Dark/Light/E-Ink aktualisieren (neue Token-Werte aus DESIGN.md)
- `--ink` im Dark Mode auf `#efece1` anheben (war `#e6e4dc`)
- `--ink-mid` auf `#b3afa2` (war `#9a9890`)
- E-Ink: `box-shadow: none`, `transition: none`, `animation: none` global erzwingen
- `font-size` für Body auf `0.9rem–0.95rem` anpassen wo nötig
- Mindestkontrast 4.5:1 für alle Body-Texte sicherstellen
- `text-wrap: pretty` für alle Fließtexte ergänzen

**Verboten:** Keine Struktur-, Layout- oder Funktionsänderungen.

**Akzeptanzkriterien:**
- Dark Mode: alle Body-Texte WCAG AA konform
- Light Mode: alle Body-Texte WCAG AA konform
- E-Ink: keine farbigen Hintergründe sichtbar
- Kein visueller Regressionstest auf bestehende Layouts

**Risiken:** Gering. Rein CSS.

---

## Etappe 2 — App-Shell und Navigation

**Ziel:** Neue Navigationsstruktur einführen. Desktop-Sidebar, Mobile-Bottom-Bar, Tabs bleiben fallback.

**Erlaubte Änderungen:**
- Desktop: Linke Sidebar (218px) mit drei Gruppen (Täglich / Woche / Werkzeuge) einführen
- Mobile: Bottom-Bar mit 5 Kern-Zielen einführen
- Bestehende Tab-Leiste auf Desktop in die Sidebar überführen (alle Tabs bleiben navigierbar)
- Auf Mobile: Hamburger-Menü durch Bottom-Bar + „Mehr"-Drawer ersetzen
- App-Layout auf Desktop auf `display: flex` mit Sidebar + Content umstellen
- `max-width: 860px` Beschränkung auf Sidebar-Layout anpassen (Hauptinhalt bekommt mehr Breite)
- Alle bestehenden Tab-IDs bleiben erhalten (nur Trigger ändert sich)

**Verboten:** Keine Panel-Inhalte ändern, keine Datenstruktur, keine localStorage-Zugriffe.

**Akzeptanzkriterien:**
- Alle 11 bisherigen Tabs sind über Sidebar/Drawer erreichbar
- Mobile: 5 Kern-Ziele in Bottom-Bar, Rest in Drawer
- Desktop: Sidebar auf `position: sticky; height: 100vh` ohne Reflow
- Bestehende Tab-Shortcut-Logik (falls vorhanden) weiterhin funktionsfähig

**Risiken:** Mittel. Layout-Reflow kann unerwartete Konsequenzen haben. Screenshot-Abgleich vor + nach.

---

## Etappe 3 — Tagescockpit / Sammeln-Pass

**Ziel:** Tagescockpit auf Desktop zweispaltig, Eingabebereich klarer, Status sichtbar.

**Erlaubte Änderungen:**
- Desktop: `#panel-sammeln` auf CSS-Grid `1fr 260px` umstellen
- Rechte Spalte: Status-Panel (Karten/Objekte/Abschluss), Morning-Briefing-Card, Co-Pilot-Card
- Card-Type-Selector: Dropdown → segmentierter Button-Cluster (LOG/VOICE/MAIL/TEXT)
- „Neue Karte hinzufügen"-Sektion: visuell beruhigen, Kontext-Info hinzufügen (Wörter/Zeilen)
- Morning Briefing + Co-Pilot: kompaktere Card-Form statt großer Section
- Mobile: Status-Dots kompakt unter dem Datumstitel

**Verboten:** Keine Änderung an der Speicher-Logik, localStorage, Kartenstruktur, Extraktion.

**Akzeptanzkriterien:**
- Desktop: Hauptinhalt + rechte Sidebar sichtbar ohne horizontal zu scrollen
- Card-Type-Auswahl funktioniert identisch zur bisherigen Dropdown-Auswahl
- Morning Briefing und Co-Pilot generieren identische Prompts wie bisher

**Risiken:** Gering. Styling-only mit Layout-Umbau.

---

## Etappe 4 — Objekte / Mini-Review-Pass

**Ziel:** Filter klarer, Objektzeilen scannbarer, Rückstand kollabierbar.

**Erlaubte Änderungen:**
- Filter-Buttons: Dropdown → Chip-Reihe (Alle / Aufgabe / SOP / ...)
- Sort-Control: kompakter, weniger prominent
- Objektzeilen: Quick-Actions (Löschen, Bearbeiten, Kollektionen, Legacy) nur on-hover anzeigen
- Rückstand-Sektion: als akkordion-kollabierter Bereich am Ende des Panels
- Extraktion-Sektion: visuell klarer von extrahierten Objekten trennen

**Verboten:** Keine Änderung an Extraktion-Logik, Filter-Logik, Objekt-Datenstruktur.

**Akzeptanzkriterien:**
- Alle bisherigen Filter-Optionen weiterhin verfügbar
- Quick-Actions weiterhin vollständig funktionsfähig
- Rückstand-Karten weiterhin extrahierbar

**Risiken:** Gering–Mittel. Hover-only-Actions können auf Touch-Geräten Probleme machen → Fallback nötig.

---

## Etappe 5 — Future Log Triage-Pass

**Ziel:** 1847+ Items durch 6 Zeitsektoren handhabbar machen.

**Erlaubte Änderungen (reines Redesign — kein Datenmodell nötig):**
- Horizontale Sektor-Tabs (Inbox / Diese Woche / Nächste Woche / Dieser Monat / Nächster Monat / Langfristig)
- Items gefiltert per Sektor basierend auf einem bestehenden Datumsfeld oder manueller Zuordnung
- Quick-Actions per Item: ✓ erledigt, — streichen, → verschieben (Dropdown), ✕ löschen
- „→ Diese Woche"-Quick-Chip auf Nächste-Woche-Items
- Kapazitäts-Indikator „Diese Woche" (max. 7 Items empfohlen)
- Übersichts-Grid aller Sektoren unten (Desktop)

**⚠ Feature-Arbeit (separater Sprint nötig):**
- Datumsfeld `sectorDate` oder `sector` pro Future-Log-Item einführen → erfordert Datenmigration
- Drag & Drop zwischen Sektoren → erfordert separate Feature-Implementierung
- Persistente Sektor-Zuordnung → erfordert localStorage-Anpassung

**Akzeptanzkriterien (Redesign-Teil):**
- Bestehende Items weiterhin lesbar und bearbeitbar
- Bestehende Übernehmen-Funktion weiterhin funktionsfähig
- Keine localStorage-Datenverluste

**Risiken:** Hoch. Future Log hat komplexe Logik. Sektor-Zuordnung ist Feature-Arbeit.

---

## Etappe 6 — Verlauf / Multi-Day-Prompt-Pass

**Ziel:** Multi-Day-Selektion klarer, Prompt-Typen sichtbar, Status-Pills aussagekräftiger.

**Erlaubte Änderungen:**
- Tages-Liste: Status-Pill (offen/teilweise/abgeschlossen) pro Zeile
- Checkbox-Selektion: visuell deutlicher (accent-Border um selektierte Zeile)
- Prompt-Typ-Selector: Radio-Chips (Review / Musteranalyse / Projekt-Handoff / Frei)
- Generierter Prompt: Vorschau in-page anzeigen (bisher nur kopiert)
- Import-Section: als separate kompakte Card

**Verboten:** Keine Änderung an Prompt-Generierungs-Logik, Datums-Selektion.

**Akzeptanzkriterien:**
- Multi-Day-Selektion weiterhin funktionsfähig
- Alle bisherigen Prompt-Typen erreichbar
- Import-JSON-Funktion weiterhin nutzbar

**Risiken:** Gering.

---

## Etappe 7 — Abschluss / Daily Note + BuJo-Pass

**Ziel:** Abschluss-Workflow klarer geführt, Legacy-Werkzeuge versteckt.

**Erlaubte Änderungen:**
- Step-Tabs: 1 · Daily Note → 2 · BuJo (bisherige Reihenfolge beibehalten)
- Daily Note: prominenter primärer CTA
- BuJo: sichtbarer zweiter Ausgang
- Legacy-Werkzeuge (Scanner, Zettelkasten-Export, Alle generieren, Legacy-Extraktion): in akkordion-kollabiertem „Erweiterte Werkzeuge"-Bereich
- Abschlussstatus (offen/abgeschlossen) sichtbar im Header

**Verboten:** Keine Änderung an Prompt-Generierung, BuJo-Logik, Scanner, Zettelkasten.

**Akzeptanzkriterien:**
- Alle bisherigen Abschluss-Aktionen weiterhin erreichbar
- Legacy-Werkzeuge in max. 1 Klick erreichbar (Akkordion öffnen)

**Risiken:** Gering.

---

## Etappe 8 — Mobile Polish

**Ziel:** Mobile-Erfahrung eigenständig und nicht nur geschrumpfte Desktop-Version.

**Erlaubte Änderungen:**
- Touch-Targets: alle interaktiven Elemente ≥ 44px Höhe
- Bottom-Bar: sauberer Safe-Area-Inset-Support (iOS)
- Sammeln: Card-Type als Swipe-Chips statt Dropdown
- Future Log Mobile: Sektor-Tabs horizontal scrollbar, Item-Quick-Actions als Swipe-Aktionen (optional)
- Verlauf Mobile: Tag-Zeilen kompakt, Selektion gut per Touch bedienbar
- Typografie auf Mobile: Mindestgröße 0.85rem für Body

**Verboten:** Keine Desktop-Änderungen als Nebeneffekt.

**Akzeptanzkriterien:**
- Alle Screens auf iPhone 14 (390px) ohne horizontales Scrollen nutzbar
- Alle Touch-Targets ≥ 44px

**Risiken:** Gering–Mittel. Touch-Events können unerwartete Konflikte haben.

---

## Etappe 9 — QA / Screenshot-Abgleich

**Ziel:** Abschluss-Validierung aller Änderungen gegen SCREEN_FIDELITY_CHECKLIST.md.

- Screenshot jedes Screens in Dark / Light / E-Ink
- Abgleich mit Checklist
- Regressionstest: alle bestehenden Funktionen per manuellem Test durchgehen
- Patch-Notizen für den Produk-Code erstellen

---

## Empfehlung: Reihenfolge für ersten Sprint

**Sprint 1 (sofort umsetzbar, geringes Risiko):**
Etappe 1 (Lesbarkeit) + Etappe 2 (Navigation) + Etappe 3 (Tagescockpit)

**Sprint 2:**
Etappe 4 (Objekte) + Etappe 7 (Abschluss)

**Sprint 3:**
Etappe 6 (Verlauf) + Etappe 8 (Mobile Polish)

**Sprint 4 (Feature-Arbeit nötig):**
Etappe 5 (Future Log Triage) — erfordert Datenmodell-Entscheidung
