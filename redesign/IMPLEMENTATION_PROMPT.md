# IMPLEMENTATION_PROMPT.md
# Prompt für den DailyLog Redesign Coding-Agenten

---

Du arbeitest an der Datei `index.html` der DailyLog-App — einer lokalen Single-File-HTML-PWA.

## Deine Aufgabe

Implementiere den visuellen Redesign-Pass aus `REDESIGN_PLAN.md`, Etappe [N].

---

## Harte Schutzregeln — NIEMALS verletzen

1. **Kein Rewrite.** Arbeite in kleinen, chirurgischen Patches. Schreib keine neuen Gesamtversionen der Datei.
2. **Kein Framework-Wechsel.** Die App ist Vanilla JS + CSS. Kein React, kein Vue, kein Svelte.
3. **Keine Buildpipeline.** Keine npm, keine Bundler, keine Transpiler außer dem was bereits vorhanden ist.
4. **Kein Backend.** Die App ist lokal-first. Keine API-Calls, keine Server-Annahmen.
5. **Keine Sync-/Storage-Änderungen.** localStorage, IndexedDB, GitHub-Gist-Sync, Tombstones, Backup/Import/Export bleiben unberührt.
6. **Keine Datenmodell-Änderungen.** Neue Felder, neue Objekte, neue Strukturen nur wenn explizit als Feature-Sprint markiert.
7. **Keine Funktionen entfernen.** Bestehende Features wie Feed, Scanner, Zettel, Plan, Kontexte, Sync bleiben vollständig erhalten — dürfen aber visuell zurücktreten.
8. **Keine Tab-IDs umbenennen.** Bestehende IDs und Selektoren (z. B. `data-tab`, `data-panel`) bleiben erhalten; nur Trigger und Styling ändern sich.
9. **Keine localStorage-Keys ändern.** Datenpersistenz-Schlüssel bleiben exakt wie bisher.

---

## Vorgehensweise

### Schritt 1: Datei lesen

```
Lies die vollständige index.html.
Notiere:
- Die aktuelle CSS-Variablen-Sektion (:root, [data-theme="light"], [data-theme="eink"])
- Alle Tab-IDs und Panel-IDs
- Das aktuelle Layout-Schema (#app, .tabs, .tab-btn, .section, .card)
- Bestehende Theme-Klassen und -Selektoren
- Bestehende Navigationsstruktur
```

### Schritt 2: Änderungsumfang klarstellen

Für Etappe 1 (Lesbarkeits-Pass):
- Nur CSS-Variablen und Typography-Properties ändern
- Kein HTML anfassen

Für Etappe 2 (Navigation):
- HTML-Struktur: Sidebar-Wrapper um bestehenden Content hinzufügen
- CSS: Sidebar-Styles + Mobile-Bottom-Bar-Styles hinzufügen
- JS: bestehende Tab-Click-Handler auf neue Nav-Items erweitern (NICHT ersetzen)

Für Etappe 3–8: Analog — erst HTML-Struktur, dann CSS, dann minimale JS-Erweiterungen.

### Schritt 3: Patch erstellen

Erstelle einen präzisen, minimalen Patch:
- Zeige den alten und neuen Code
- Begründe jede Änderung
- Markiere klar, was CSS-only, HTML-Struktur oder JS ist

### Schritt 4: Validieren

Nach jedem Patch prüfe:
- [ ] Alle bisherigen Tabs sind erreichbar
- [ ] Alle bestehenden Funktionen sind testbar
- [ ] Keine localStorage-Daten verändert
- [ ] Dark / Light / E-Ink Mode funktionieren
- [ ] Mobile (≤ 480px) funktioniert ohne horizontales Scrollen
- [ ] Desktop (≥ 1024px) nutzt die Breite sinnvoll

### Schritt 5: Lieferformat

Liefere am Ende:
- **Option A:** Die vollständige, editierte `index.html` als einzelne Datei
- **Option B:** Einen strukturierten Patch (Zeilen-genaue Ersetzungen als diff-Format)

Bevorzuge Option A wenn weniger als 200 Zeilen geändert werden.
Bevorzuge Option B bei größeren Eingriffen.

---

## CSS-Token-Referenz (aus DESIGN.md)

Ersetze in `:root`:

```css
/* VORHER (Dark — zu wenig Kontrast) */
--ink:     #e6e4dc;
--ink-mid: #9a9890;

/* NACHHER (Dark — WCAG AA) */
--ink:     #efece1;
--ink-mid: #b3afa2;
--ink-soft: #807c70;
```

Ersetze in `[data-theme="light"]`:

```css
/* NACHHER */
--bg:      #efece3;
--surface: #fbfaf5;
--ink:     #1d1b14;
--ink-mid: #4f4b3e;
--accent:  #7c6a3e;
```

Neue E-Ink-Regeln (hinzufügen):

```css
[data-theme="eink"] * {
  box-shadow: none !important;
  text-shadow: none !important;
  transition: none !important;
  animation: none !important;
  background-image: none !important;
}
[data-theme="eink"] .btn {
  border: 1.5px solid var(--ink) !important;
  background: var(--surface) !important;
  color: var(--ink) !important;
}
[data-theme="eink"] .btn:active {
  background: var(--ink) !important;
  color: var(--surface) !important;
}
```

---

## Navigation HTML-Struktur (Etappe 2)

Füge VOR `#app` ein:

```html
<!-- REDESIGN: Desktop Sidebar -->
<div id="redesign-sidebar" class="redesign-sidebar">
  <div class="sidebar-header">
    <span class="sidebar-logo">Daily Log</span>
    <div class="sidebar-date-nav">
      <!-- bestehende Date-Nav hier hinein verschieben oder duplizieren -->
    </div>
  </div>
  <nav class="sidebar-nav">
    <div class="sidebar-group-label">Täglich</div>
    <!-- Nav-Items spiegeln bestehende Tabs -->
    <button class="sidebar-nav-item" data-sidebar-target="sammeln">✎ Sammeln</button>
    <button class="sidebar-nav-item" data-sidebar-target="objekte">◈ Objekte</button>
    <button class="sidebar-nav-item" data-sidebar-target="futurelog">↗ Future Log</button>
    <button class="sidebar-nav-item" data-sidebar-target="verlauf">☰ Verlauf</button>
    <button class="sidebar-nav-item" data-sidebar-target="abschluss">✓ Abschluss</button>
    <!-- ... weitere Gruppen -->
  </nav>
  <div class="sidebar-footer">
    <!-- Theme-Switcher (bestehend) hierher verschieben -->
  </div>
</div>
```

JS-Bridge (klein, nicht-invasiv):

```javascript
// REDESIGN: Sidebar Bridge — verbindet neue Sidebar mit bestehendem Tab-System
document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.sidebarTarget;
    // bestehenden Tab-Click auslösen
    const existingTab = document.querySelector(`.tab-btn[data-tab="${target}"]`);
    if (existingTab) existingTab.click();
    // active state update
    document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
```

---

## Prüf-Checkliste vor Abgabe

```
[ ] index.html validiert als HTML5 (kein DOCTYPE fehlt, Tags geschlossen)
[ ] Alle 11 Tabs erreichbar (Sammeln, Feed, Objekte, Plan, Review, Abschluss,
    Future Log, Kontexte, Zettel, Kollektionen, Verlauf)
[ ] Sync / GitHub-Gist-Funktionalität unverändert
[ ] Backup / Import / Export unverändert
[ ] Dark Mode: kein weißer Flash, kein fehlender Kontrast
[ ] Light Mode: lesbar, kein weißer-auf-weißem Text
[ ] E-Ink Mode: keine farbigen Hintergründe, keine Schatten
[ ] Mobile (375px): keine horizontale Scrollleiste
[ ] Desktop (1440px): Sidebar sichtbar, Hauptinhalt breiter als vorher
[ ] PWA: manifest.json und sw.js unverändert
[ ] localStorage: keine Keys geändert oder gelöscht
```

---

## Was NICHT im ersten Coding-Sprint landen darf

- Future-Log-Zeitsektoren mit Daten-Persistenz (erfordert Feature-Sprint)
- Hierarchische Objekte / Threads / Longform-Journaling
- Neue Datenfelder in localStorage
- People/Beziehungsmodul
- Zettelansicht-Umbau
- Drag & Drop Future Log
- Atlas/Roadtrip-Integration
