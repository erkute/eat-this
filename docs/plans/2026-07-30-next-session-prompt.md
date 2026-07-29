# Prompt für die nächste Session

Paste-fertig. Alles darunter ist der Prompt.

---

Kontext: Repo "Eat This" (`nextjs/` + `studio/`). `main` und `staging` sind
gleichauf, keine offenen PRs. Ausgangspunkt ist
`docs/plans/2026-07-29-map-audit-open-items.md` — **lies die Datei ZUERST**,
sie ist frisch aufgeräumt und enthält zu jedem offenen Punkt die Begründung
plus Messungen, die man sonst neu herleitet.

Vorgeschichte: PRs #310, #312, #313, #317, #319, #321 (Code) und #315, #316
(Doku). #280 wurde geschlossen. Die letzte Session hat die iOS-Tastatur-
Regression gefixt, den Marker-Reveal gebaut, den Cookie-Banner von der
Filterreihe geholt und `MapFilters` von 83 toten CSS-Deklarationen befreit.

## 1. ZUERST: den offenen Messwiderspruch in MapControls klären

Ein Bulk-Prune der 19 entfernbaren Deklarationen in `MapControls.module.css`
erzeugte **24 Computed-Style-Abweichungen bei 320px**: `.mapStatusLayer` und
`.mapStatusLayerError` sprangen von `translateY(0)` auf `translateY(-162px)`
bzw. `-130px`, in allen 24 Zuständen. Sofort zurückgenommen, ungeklärt.

Der Verdacht steht in Abschnitt 3 der Doku: der **Nachher**-Wert ist der, den
das Stylesheet bei 320px vorschreibt — verdächtig ist also die _Baseline_, und
zwar vermutlich, weil sie direkt nach `resize_window` erfasst wurde, bevor der
Browser die Media Queries neu ausgewertet hat.

Kläre das, bevor irgendetwas anderes an der Kaskade passiert. Die Glaubwürdig-
keit des MapFilters-Ergebnisses hängt an derselben Messmethode.

## 2. Danach: Kaskadenfunde weiter abarbeiten

Reihenfolge: `MapControls` (26) → `RestaurantList` (19) → `MapDetails` (104).
Entscheidung ist gefallen und gilt: **löschen, nicht wiederbeleben.**
Die vierstufige Methode steht in Abschnitt 3 der Doku — vor allem Punkt 2
(Sonden-Elemente für Klassen, die im DOM nie sichtbar sind) und Punkt 3 (nur
löschen, wenn für _jede_ Klasse der Gruppe tot). Punkt 3 ist genau das, woran
der frühere Flatten-Versuch gescheitert ist.

`MapDetails` ist der schwierigste Teil, weil seine Elemente nur in anderen
Zuständen existieren (Must-Eat-Detail, verdeckte Karte, Restaurant-Detail).

## 3. Offen, braucht eine Entscheidung von mir — nicht selbst entscheiden

- **Clustering** — nicht ob, sondern _wie ein Cluster aussieht_.
  Count-Bubbles sind abgelehnt.
- **Dark Mode** — 564 hardcodierte Hex-Werte, 53 CSS-Dateien, dunkle Basemap,
  das papierweiße Sheet. Eigenes Vorhaben, keine Nebenaufgabe.
- **Flachklopfen von MapControls** — Empfehlung steht auf "nicht", Begründung
  hat sich geändert (der Auditor liefert den Nutzen jetzt ohne das Risiko).

## 4. Von mir, kein Code

- Standalone-Statusbar am iPhone testen (Add-to-Home-Screen, geht nicht im Tab
  — Begründung in Abschnitt 1 der Doku). Dabei mit offener Tastatur gegen-
  prüfen, ob die Kappe wegrutscht.
- Sanity-Draft publishen: `5310ecbd-4c43-43ab-ba69-a805c983550a`,
  `"Kolo Coffee "` → `"Kolo Coffee"`.

## Arbeitsweise

- **Messen statt schließen.** Die Tastatur-Regression sah exakt wie ein
  Kaskadenfehler aus und war keiner. Ein Screenshot mit Live-Werten hat es in
  einem Zug geklärt.
- **Der iPhone-Simulator ist echtes WebKit und billig.** Ohne
  `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false`
  - Neustart der Simulator.app ist die halbe Bug-Klasse unsichtbar. Hinterher
    zurücksetzen.
- **Bei CSS-Änderungen: Computed-Style-Diff über Viewports UND Zustände, sonst
  gar nicht.** Zustände über die `data-*`-Attribute auf `[data-map-body]`
  fahren, nicht über die UI.
- **Nichts löschen, was der Diff nicht abdeckt.** Der Filter-Picker und der
  Status-Toast sind im DOM nicht dauerhaft vorhanden — dafür Sonden-Elemente
  einhängen.
- Workflow: Feature-Branch → PR nach `staging` → PR nach `main`.
  `git config core.hooksPath .githooks` einmal pro Maschine.
- Nicht anfassen ohne Rückfrage: die drei Punkte aus Abschnitt 3 oben.
