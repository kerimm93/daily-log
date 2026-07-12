# DESIGN.md — DailyLog Redesign Design System

---

## 1. Designprinzipien

1. **Eine klare Hauptaktion pro Bereich.** Jeder Screen hat genau einen primären CTA. Alles andere ist sekundär oder in „Erweiterte Werkzeuge" versteckt.
2. **Täglich-Route zuerst.** Sammeln → Objekte → Future Log → Verlauf → Abschluss sind P0. Alles andere tritt zurück.
3. **Ruhig, nicht langweilig.** Kein Dashboard-Kitsch, keine aggressiven Verläufe. Tiefe durch Schrift und Abstände, nicht durch Farbe und Dekoration.
4. **Desktop und Mobile denken getrennt.** Desktop nutzt die Breite mit 2–3 Spalten. Mobile hat eigene Touch-Navigation und keine geschrumpfte Desktop-Version.
5. **Technische Werkzeuge bleiben erhalten, treten aber zurück.** Sync/Backup/Import/Export/Feed/Scanner sind vorhanden, aber nicht im Tages-Workflow.
6. **Leserlichkeit in allen drei Modes.** Dark, Light und E-Ink haben dedizierte Kontraste und kein visuelles Rauschen.

---

## 2. Visuelle Richtungen

Das System unterstützt drei Richtungen (via `data-dir` auf `<html>`). Alle drei teilen dieselben Farb-Tokens; nur Typografie, Dichte und Kanten-Behandlung ändern sich.

| Richtung    | Schrift              | Kartenform          | Dichte     | Charakter                      |
|-------------|----------------------|---------------------|------------|-------------------------------|
| `journal`   | Lora (Serif)         | Abgerundete Karten  | Normal     | Warm, journalartig             |
| `ledger`    | Newsreader (Serif)   | Liniengetrennt       | Luftig     | Zeitungsartig, typografisch    |
| `console`   | JetBrains Mono       | Eckige Kanten       | Dicht      | Terminal, keyboard-first       |

---

## 3. Farb-Tokens

### Dark (Standard)

```css
--bg:         #100f0d;   /* Tiefstes Schwarz */
--bg-mid:     #16150f;   /* Sidebar-Hintergrund */
--surface:    #1b1a16;   /* Karten-Hintergrund */
--surface-2:  #222019;   /* Hover-Hintergrund */
--surface-3:  #2a2820;   /* Sekundäre Fläche */
--border:     #302d25;
--border-mid: #423e33;
--border-str: #56503f;
--ink:        #efece1;   /* Primärer Text */
--ink-mid:    #b3afa2;   /* Sekundärer Text */
--ink-soft:   #807c70;   /* Labels, Eyebrows */
--ink-dim:    #5a5648;   /* Deaktive Elemente */
--accent:     #cdbb8f;   /* Gold/Sand */
--accent-2:   #d9c89c;
--accent-dim: #7d7050;
--accent-bg:  rgba(205,187,143,0.10);
```

### Light

```css
--bg:         #efece3;
--surface:    #fbfaf5;
--ink:        #1d1b14;
--accent:     #7c6a3e;
```

### E-Ink

```css
--bg:         #ffffff;
--surface:    #ffffff;
--ink:        #000000;
--accent:     #000000;
/* Kein box-shadow, kein text-shadow, keine Transitionen */
```

### Objekt-Farben (alle drei Themes)

| Token          | Dark           | Light          | E-Ink   |
|----------------|----------------|----------------|---------|
| `--blue`       | `#7d9fc0`      | `#355d82`      | `#000`  |
| `--green`      | `#84b07f`      | `#3f7344`      | `#000`  |
| `--orange`     | `#cf935a`      | `#8c531f`      | `#000`  |
| `--red`        | `#c2766b`      | `#9c4338`      | `#000`  |
| `--purple`     | `#9a86bc`      | `#5f4f86`      | `#000`  |

---

## 4. Typografie

### Token-Tabelle

| Token          | journal / ledger       | console              |
|----------------|------------------------|----------------------|
| `--font-body`  | Lora / Newsreader      | JetBrains Mono       |
| `--font-head`  | Lora / Newsreader      | JetBrains Mono       |
| `--font-mono`  | JetBrains Mono         | JetBrains Mono       |
| `--head-weight`| 600 / 500              | 600                  |

### Skala

| Rolle            | Größe        | Font         | Gewicht | Letter-Spacing |
|------------------|-------------|--------------|---------|----------------|
| Screen-H1        | 1.55rem     | font-head    | head-weight | -0.01em   |
| Section-Titel    | 1rem        | font-head    | head-weight | 0         |
| Body-Text        | 0.88–0.95rem| font-body    | 400     | 0              |
| Mono-Label       | 0.6–0.7rem  | font-mono    | 400–600 | 0.03–0.08em    |
| Eyebrow          | 0.56rem     | font-mono    | 400     | 0.12em, uppercase |
| Objekt-Tag       | 0.57rem     | font-mono    | 600     | 0.06em, uppercase |

**Minimum:** 0.52rem auf Mobile (= ~8.3px). Niemals darunter.

---

## 5. Layout-Regeln

### Desktop

```
┌── Sidebar (218px) ──┬── Hauptinhalt (flex-1, max ~900px) ──┬── optional: Rechts-Panel (260px) ──┐
```

- Sidebar: sticky, volle Höhe, eigenes Scroll
- Hauptinhalt: padding 32px 44px, scrollt unabhängig
- Rechts-Panel: nur auf Sammeln-Screen, für Status/Quick-Actions
- Kein `max-width` auf dem Hauptinhalt außer ~900px

### Mobile

```
┌── Mobile-Header (sticky) ──────────────────────────────────┐
├── Scroll-Content (padding 14px, pb 68px) ──────────────────┤
└── Bottom-Bar (fixed, 5 Ziele) ─────────────────────────────┘
```

- Max-Breite Container: 400px, zentriert
- Keine Sidebar auf Mobile
- Bottom Bar: 5 Kern-Ziele, immer sichtbar
- FAB-ähnliche Hauptaktion: „+ Karte speichern" jederzeit erreichbar

### Grid-System

- Basis: 8px-Raster
- Padding: 14px (mobile), 22px (cards), 44px (desktop main)
- Gap: 6px (chips), 12px (cards), 28px (spalten)

---

## 6. Komponenten

### Buttons

```
.btn-primary  → accent background, bg-colored text, bold
.btn          → surface-2 background, border, mono font
.btn-ghost    → no background, no border, muted color
.btn-danger   → red-bg, red border
.btn-sm       → padding 5px 10px, min-height 30px
.btn-lg       → min-height 46px, padding 12px 22px
```

**Hierarchie-Regel:** Pro Karte/Section maximal ein `.btn-primary`. Alles andere ist `.btn` oder `.btn-ghost`.

### Cards / Sections

```css
/* Journal-Direction */
.section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); }
/* Ledger-Direction */
.section { border: none; border-top: 1.5px solid var(--border-mid); border-radius: 0; }
```

### Tags / Objekt-Typ-Labels

Farbkodiert per Objekttyp (Aufgabe=Blau, SOP=Rot, Idee=Orange, etc.). In E-Ink: alle schwarz mit einfachem Border.

### Pills / Filter-Chips

- Rund (999px radius) in journal/default
- Eckig (3px radius) in ledger/console
- Aktiver Zustand: accent-bg + accent border + fettgedruckt

### Objekt-Zeilen (Listen-Items)

- Hover-State: surface-2 background + border erscheint
- Quick-Actions (L / Edit / Move / Delete) erscheinen nur on-hover
- Kein permanentes Action-Menu im Idle-State

### Rückstand / Warnungen

- Orange-Farbe: `var(--orange)` und `var(--orange-bg)`
- Immer kollabierbar mit accordion pattern
- Icon: ⚠ für Rückstand, ! für einzelne unverarbeitete Items

---

## 7. Navigation

### Desktop-Sidebar (218px)

Drei Gruppen:
- **Täglich** (P0): Sammeln, Objekte, Future Log, Verlauf, Abschluss
- **Woche** (P1): Review, Kollektionen, Kontexte
- **Werkzeuge** (P2, kollabiert): Plan, Zettel, Feed, Einstellungen

Aktiver Zustand: surface-3 background + accent icon + fettes Label.

### Mobile-Bottom-Bar

5 Items: Sammeln · Objekte · Future · Verlauf · Abschluss

Aktiver Zustand: accent-farbene Icon + Label.

---

## 8. E-Ink-Regeln

- `box-shadow: none !important` überall
- `transition: none !important` überall
- `animation: none !important` überall
- Alle farbigen Tags: `background: transparent, border: 1px solid var(--ink), color: var(--ink)`
- Alle Objekt-Typ-Farben: `#000`
- Buttons: `border: 1.5px solid var(--ink), background: var(--surface)`
- Aktiver Button/Tab: `background: var(--ink), color: var(--surface)` (Invertierung)

---

## 9. Do / Don't

| Do | Don't |
|----|-------|
| Typografie und Abstände für Tiefe nutzen | Farbverläufe als Hintergrund |
| Einen primären CTA pro Sektion | Mehrere gleichgewichtige .btn-primary |
| Objekt-Farben aus dem Token-System | Neue Farben erfinden |
| Hover-States für Quick-Actions | Quick-Actions immer sichtbar |
| Akkordion für selten genutzte Werkzeuge | Legacy-Tools gleichwertig prominent zeigen |
| Lora/Newsreader/Mono aus dem Token-System | Inter, Roboto, Arial |
| `gap:` statt margin für Flex-/Grid-Layouts | Inline-Spacing durch leere Spans |
| E-Ink: alles schwarz, keine Schatten | E-Ink: Farb-Tokens beibehalten |
