# OPTIONAL_FEATURES_BACKLOG.md
# Zukünftige Feature-Ideen — getrennt vom Redesign

Diese Features sind **nicht** Teil des aktuellen Redesign-Auftrags.
Sie erfordern eigene Feature-Sprints mit Datenmodell-Entscheidungen.

---

## 1. Future Log — Persistente Zeitsektoren

**Was:** Jedes Future-Log-Item bekommt ein Feld `sector` (inbox / dieseWoche / naechsteWoche / etc.) und `sectorDate`. Verschieben in einen Sektor ist persistent.

**Warum getrennt:** Braucht neue Datenfelder, Datenmigration für bestehende Items, Änderung am localStorage-Schema.

**Lösungsansatz:** Neues Feld `{ ...item, sector: 'dieseWoche', movedAt: ISO-Datum }` in Future-Log-Einträgen. Migration: alle bestehenden Items → `sector: 'inbox'`. Kein Datenverlust.

**Designprototyp:** Im Hi-Fi-Prototyp bereits visuell umgesetzt (ohne Persistenz). Kann als Referenz dienen.

---

## 2. Drag & Drop zwischen Future-Log-Sektoren

**Was:** Items per Drag & Drop zwischen Sektor-Spalten oder via Drag in der Sektor-Tab-Leiste verschieben.

**Warum getrennt:** Requires pointer/touch event handling, drag-state management, und persistente Speicherung. Komplex auf Mobile.

**Empfehlung:** Erst Quick-Chip-basiertes Verschieben (bereits im Redesign enthalten) stabilisieren. Drag & Drop ist Enhancement.

---

## 3. Hierarchische Objekte

**Was:** Objekte können anderen Objekten untergeordnet werden. Notizen, Ereignisse, Aufgaben können wie im Bullet Journal geschachtelt werden.

**Warum getrennt:** Erfordert neues Datenmodell (`parentId`, `children`-Referenzen), veränderte Filterlogik, neue UI für Baumansicht.

**Design-Komplexität:** Hoch. Filterlogik für Ebenen muss separat konzipiert werden. Kann bestehende Timeline-Ansicht kaputt machen.

---

## 4. Threading über Tage

**Was:** Ein Objekt an einem alten Tag kann später fortgesetzt/verlinkt werden. Entsteht ein verbundener Gedanken-Thread über mehrere Tage.

**Warum getrennt:** Erfordert neue Verlinkungsstruktur (`threadId`, `threadPrev`, `threadNext`), neue Ansicht für Thread-Verlauf, geänderte Verlaufs-Ansicht.

**Prototyp-Idee:** „Dieses Objekt fortsetzen →" Button auf alten Objekten, der ein neues Objekt mit dem heutigen Datum und `threadId` erstellt.

---

## 5. Longform Journaling

**Was:** Einzelne Objekte oder Gedanken sollen in längere Reflexionen ausgebaut werden. Alternative/Ergänzung zur Zettelansicht.

**Warum getrennt:** Braucht Rich-Text-Editor oder erweitertes Textarea-Konzept, neue Speicherstruktur für lange Texte, Navigation zwischen Einträgen.

**Diagnose zur aktuellen Zettelansicht:** Der Nutzen der bestehenden Zettelansicht ist unklar. Mögliche Alternativen:
- People/Beziehungsnotizen
- Longform Journaling
- Wochen-Ideenreview
- Projekt-Handoffs zu Atlas/Roadtrip
- Schreibideen-Sammlung

Empfehlung: Zettelansicht erst diagnostizieren bevor ein Umbau-Sprint gestartet wird.

---

## 6. Random alter Tag / Spaced Repetition

**Was:** Ein zufälliger alter Tag wird wieder vorgelegt — für Reflexion, Re-Threading oder Weiterverarbeitung.

**Warum getrennt:** Einfach technisch, aber braucht UI-Konzept für „Wiederkehr"-Workflow. Wo erscheint der alte Tag? Als Card in Sammeln? Als eigener Screen?

**Prototyp-Idee:** Kleiner „Aus dem Archiv"-Widget in der rechten Sidebar des Tagescockpits.

---

## 7. People / Beziehungsnotizen

**Was:** Personen als Entitäten in der App. Informationen über Personen filtern, Beziehungen bewusst pflegen.

**Warum getrennt:** Völlig neues Datenmodell (`persons`, `person-refs` in Objekten), neue Ansicht, neue Filterlogik. Bedeutender Feature-Sprint.

**Einstiegspunkt:** `@Name` in Karten und Objekten als Markup → automatische Personen-Extraktion in einem späteren Sprint.

---

## 8. Zettelansicht neu denken

**Was:** Die bestehende Zettelansicht hat unklaen Nutzen. Mögliche Alternativen (siehe oben). Vor einem Umbau braucht es eine klare Entscheidung: Was soll die Zettelansicht leisten?

**Nächster Schritt:** 1–2 Wochen die eigene Nutzung der Zettelansicht beobachten und dokumentieren, dann Entscheidung.

---

## 9. Atlas / Roadtrip Handoffs aus DailyLog

**Was:** Strukturierte Kontextpakete für andere Apps (Atlas, Roadtrip) aus DailyLog-Inhalten generieren. Projekte, Threads, Ideen als exportierbare Formate.

**Warum getrennt:** Erfordert Kenntnisse der Zielformate, eigene Prompt-Templates, möglicherweise neue Exportstruktur.

---

## 10. Verbesserte Claude-Abendreview-Kontextpakete

**Was:** Statt roher Karten- und Objekt-Listen strukturierte, schön formatierte Kontext-Pakete für den Abend-Chat mit Claude generieren.

**Warum getrennt:** Prompt-Engineering-Arbeit, nicht Redesign. Kann parallel und ohne Codeänderungen in Claude direkt entwickelt werden.

**Sofortiger Ansatz:** Multi-Day-Kontext-Prompt im Verlauf-Screen (bereits im Redesign) ist ein guter Startpunkt.

---

## 11. Wochen-Batch-Reduktion durch bessere Tagesroutine

**Kontext:** Derzeit häuft sich Wochen-Batch-Arbeit an, weil die tägliche Reibung zu hoch ist. Das Redesign (Etappen 1–8) adressiert dies direkt durch:

- Tagescockpit mit sichtbarem Rückstand
- Mini-Review in Objekte
- Future-Log-Triage als tägliche Gewohnheit

Dieses Feature ist kein Feature — es ist ein Nebeneffekt besserer täglicher UX.

---

## Priorisierungs-Matrix

| Feature                          | Nutzen | Komplexität | Sprint-Größe |
|----------------------------------|--------|-------------|--------------|
| FL Persistente Sektoren          | Hoch   | Mittel      | 1 Sprint     |
| Drag & Drop FL                   | Mittel | Hoch        | 1–2 Sprints  |
| Hierarchische Objekte            | Hoch   | Sehr hoch   | 2–3 Sprints  |
| Threading                        | Mittel | Hoch        | 2 Sprints    |
| Longform Journaling              | Mittel | Mittel      | 1 Sprint     |
| Random alter Tag                 | Mittel | Niedrig     | 0.5 Sprint   |
| People / Beziehungen             | Hoch   | Sehr hoch   | 3+ Sprints   |
| Zettelansicht neu                | Unklar | Mittel      | Erst diagnostizieren |
| Atlas/Roadtrip Handoffs          | Mittel | Mittel      | 1 Sprint     |
| Claude Abendreview Pakete        | Hoch   | Niedrig     | 0.5 Sprint   |
