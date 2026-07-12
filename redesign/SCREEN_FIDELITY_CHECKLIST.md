# SCREEN_FIDELITY_CHECKLIST.md
# DailyLog Redesign — Soll-Zustand pro Screen

---

## 1. Tagescockpit / Sammeln — Desktop

### Soll-Zustand
- Zwei-Spalten-Layout: Hauptinhalt (ca. 60%) + rechte Statusspalte (260px)
- Datumsheader prominent (Lora 1.55rem, Wochentag ausgeschrieben)
- Card-Type: segmentierter Button-Cluster (LOG / VOICE / MAIL / TEXT), nicht Dropdown
- Textarea: großzügig, Mindesthöhe 120px, Wort-/Zeilenzähler
- Primäre Aktion: „+ Karte speichern" als .btn-primary, Tastaturkürzel ⌘↵ sichtbar
- Rechte Spalte: Status-Panel (Karten/unverarbeitet/Objekte/Abschluss), Morning Briefing Card, Co-Pilot Card
- Karten-Liste: Zeit + Typ-Badge + gekürzter Text + Obj.-Anzahl, Hover zeigt „›"

### Wichtige Details
- Typ-Badge farbkodiert: LOG=blau, VOICE=grün, FILE=lila, MAIL=orange
- Unverarbeitete Karten: oranger `!`-Marker
- Rückstand: orange Statuszeile in der rechten Spalte

### Akzeptable Abweichungen
- Exakte Breite der rechten Spalte ±20px
- Morning Briefing und Co-Pilot können als eine kombinierte Section erscheinen

### Nicht akzeptable Abweichungen
- Card-Type als Dropdown (muss Buttons sein)
- Keine rechte Statusspalte auf Desktop
- Morning Briefing oder Co-Pilot nicht erreichbar

---

## 2. Tagescockpit / Sammeln — Mobile

### Soll-Zustand
- Volle Breite, max 400px zentriert
- Datum mit kompakten Status-Dots darunter (Karten · unverarbeitet)
- Card-Type: Button-Cluster (scrollbar bei Bedarf)
- Textarea: volle Breite, min. 120px
- Morning Briefing + Co-Pilot: kompakte Cards unter der Kartenliste
- Keine Sidebar, keine rechte Spalte

### Wichtige Details
- Bottom-Bar: 5 Ziele, Sammeln aktiv hervorgehoben
- Touch-Targets: alle Buttons ≥ 44px Höhe

### Nicht akzeptable Abweichungen
- Horizontales Scrollen auf 375px
- Bottom-Bar fehlt
- Card-Type-Selector nicht bedienbar per Touch

---

## 3. Objekte / Mini-Review — Desktop

### Soll-Zustand
- Filter-Chips: Alle / Aufgabe / SOP / Idee / Notiz (mit Anzahl), aktiver Chip accent-farbig
- Objektliste: Typ-Tag + Quellenzeit + Titel, Quick-Actions on-hover (L / Edit / Move / Delete)
- Tags/Labels: als runde Pills under dem Titel
- Karten-zur-Extraktion-Sektion: eigene Card mit Count-Badge
- Rückstand: akkordion-kollabiert, orange Header mit Anzahl

### Wichtige Details
- Objekte sind klickbar/checkboxbar für Batch-Aktionen
- Sort-Control rechts, dezent
- Karten zeigen Extrahieren / Neu-Extrahieren-Button

### Akzeptable Abweichungen
- Exakte Reihenfolge der Filter-Chips kann variieren

### Nicht akzeptable Abweichungen
- Quick-Actions permanent sichtbar (darf nur on-hover sein)
- Rückstand-Sektion prominent im Hauptflow (muss kollabierbar sein)
- Filter-Dropdown statt Chips

---

## 4. Objekte / Mini-Review — Mobile

### Soll-Zustand
- Filter-Chips horizontal scrollbar
- Objektzeilen kompakt, Touch-freundlich
- Quick-Actions: Tap auf Zeile öffnet kompaktes Aktions-Sheet oder Inline-Buttons

### Nicht akzeptable Abweichungen
- Hover-only Quick-Actions ohne Touch-Fallback
- Filter-Chips nicht erreichbar

---

## 5. Future Log — Desktop

### Soll-Zustand
- Horizontale Sektor-Tabs: Inbox / Diese Woche / Nächste Woche / Dieser Monat / Nächster Monat / Langfristig
- Aktiver Tab: accent-farbige Unterlinie, fettes Label, Anzahl-Badge
- „Diese Woche": Kapazitäts-Indikator (7 Quadrate, gefüllt/leer, bei ≥7 rot)
- Jedes Item: Drag-Handle (Hover) + Text + Datum (Hover) + Quick-Actions (Hover): ✓ — → ✕
- „→ Woche"-Quick-Chip auf Items in Nächste Woche / Monat / Langfristig
- „→ Alle nach Diese Woche"-Button auf Nächste-Woche-Tab wenn Items vorhanden
- Übersichts-Grid unten (6 Kacheln mit Sektor-Name + Anzahl)
- Inbox: Zuordnung zu Sektoren möglich

### Wichtige Details
- Items mit `priority:true` haben `·` Marker und fette Schrift
- Sektoren sind interaktiv wechselbar ohne Seitenreload
- Leerer Sektor zeigt Leerstate + „+ hinzufügen"-Link

### ⚠ Hinweis: Was ist Redesign vs. Feature-Arbeit

**Redesign (sofort umsetzbar):**
- Visuelle Sektor-Tabs
- Quick-Actions (erledigt/streichen/löschen) sofern Daten vorhanden
- Kapazitäts-Indikator (rein visuell)

**Feature-Sprint nötig:**
- Persistente Sektor-Zuordnung pro Item (neues Datenfeld)
- „→ Diese Woche" verschiebt dauerhaft (braucht Storage-Anpassung)
- Drag & Drop zwischen Sektoren (neues Interaction-Pattern)

### Nicht akzeptable Abweichungen
- Alle 1847 Items in einer flachen Liste (Future-Log-Hauptschmerz)
- Kein Kapazitäts-Indikator für Diese Woche

---

## 6. Future Log — Mobile

### Soll-Zustand
- Sektor-Tabs horizontal scrollbar
- Item-Liste vollflächig
- Quick-Actions: Swipe-Right = erledigt, Swipe-Left = löschen (oder Tap → Inline-Buttons)

### Akzeptable Abweichungen
- Kein Drag & Drop auf Mobile
- Übersichts-Grid kann ausgeblendet sein

---

## 7. Verlauf

### Soll-Zustand
- Prompt-Builder oben: Sektion mit Tages-Chips, Prompt-Typ-Selector, „Auswahl als Prompt"-Button
- Tages-Liste: Wochentag + Datum + Karten/Objekte-Zähler + Status-Pill
- Selektion: accent-Border + accent-bg auf selektierten Zeilen
- Status-Pills: offen (grau), teilweise (orange mit Anzahl), abgeschlossen (grün)
- Generierter Prompt: in-page Vorschau nach Klick

### Wichtige Details
- Multi-Day-Selektion muss intuitiv sein (Checkbox + ganze Zeile klickbar)
- Prompt-Typen: Review / Musteranalyse / Projekt-Handoff / Freie Verarbeitung

### Nicht akzeptable Abweichungen
- Import-Funktion nicht erreichbar
- Status-Pill fehlt (wichtige Information)

---

## 8. Abschluss

### Soll-Zustand
- Zwei Step-Tabs: „1 · Daily Note" (aktiv) und „2 · BuJo"
- Daily Note: prominenter .btn-primary-lg, sekundäre Aktionen (importieren, Vorschau)
- BuJo: erreichbar über Tab oder „Weiter zu BuJo →"-Button
- „Erweiterte Werkzeuge": akkordion-kollabiert, enthält Scanner / Zettelkasten-Export / Legacy-Extraktion / Alle generieren
- Abschlussstatus im Header sichtbar

### Wichtige Details
- Legacy-Werkzeuge in max. 1 Klick erreichbar (Akkordion öffnen)
- Daily Note und BuJo müssen identische Funktionalität wie bisher haben

### Nicht akzeptable Abweichungen
- Legacy-Werkzeuge komplett entfernt oder nicht mehr erreichbar
- Daily Note nicht als erste und prominenteste Aktion
- Kein Weg zu BuJo

---

## 9. Settings / Advanced

### Soll-Zustand
- Eigener Screen/Drawer, nicht im Tages-Workflow
- Vier Gruppen: Sync & Backup / Feed & Scanner / Zettel & Plan / App-Einstellungen
- Alle bestehenden technischen Funktionen erreichbar
- Keine prominente Platzierung im täglichen Workflow

### Akzeptable Abweichungen
- Exakte Gruppierung kann leicht variieren
- Kann als Modal oder separate Seite erscheinen

### Nicht akzeptable Abweichungen
- Sync/Backup/Import/Export nicht erreichbar
- Datenverlust durch UI-Änderungen

---

## 10. Dark Mode

### Soll-Zustand
- Hintergrund: #100f0d (tiefstes Schwarz, warm)
- Primärer Text: #efece1 (WCAG AA oder besser)
- Sekundärer Text: #b3afa2
- Akzent: #cdbb8f (Gold/Sand)
- Kein weißer Flash beim Laden
- Alle Objekt-Farben sichtbar und unterscheidbar

### Nicht akzeptable Abweichungen
- Text-Kontrast unter 4.5:1
- Farbige Hintergründe leuchten zu stark

---

## 11. Light Mode

### Soll-Zustand
- Hintergrund: #efece3 (warmes Off-White, kein reines Weiß)
- Primärer Text: #1d1b14 (fast schwarz)
- Akzent: #7c6a3e (dunkles Gold)
- Alle Objekt-Farben für Light Mode angepasst (dunklere Töne)

### Nicht akzeptable Abweichungen
- Reines Weiß als Hintergrund
- Objekt-Farben zu blass/unlesbar

---

## 12. E-Ink Mode

### Soll-Zustand
- Ausschließlich Schwarz (#000) und Weiß (#fff)
- Keine farbigen Hintergründe (auch nicht als bg-Farbe)
- Keine box-shadow, keine text-shadow
- Keine CSS-Transitions oder Animations
- Alle Typ-Tags: schwarze Border, weißer Hintergrund, schwarzer Text
- Buttons: schwarze Border, aktiv = invertiert (schwarz auf weiß)
- Tab/Nav aktiv: Unterlinie schwarz (3px), fetter Text

### Nicht akzeptable Abweichungen
- Irgendwelche farbigen Backgrounds sichtbar
- box-shadow sichtbar auf E-Ink-Display
- Transitionseffekte beim Tab-Wechsel
