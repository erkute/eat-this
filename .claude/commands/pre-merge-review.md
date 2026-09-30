---
description: Senior-Review des Diffs, bevor er nach staging oder main geht
---

Review den Diff, der nach `staging` bzw. `main` gehen soll, als Senior Dev.
Prüfe zuerst `git status --short --branch` und aktualisiere die Remote-Refs
mit `git fetch origin --prune`. Reviewe den Branch-Diff
(`git diff origin/staging...HEAD` bzw. `git diff origin/main...origin/staging`)
und bei noch nicht committierter Arbeit auch `git diff` und `git diff --cached`;
prüfe ungetrackte Dateien aus dem Status separat. Ein leerer Branch-Diff
schließt lokale Änderungen nicht aus. Verlasse dich nicht auf frühere CI-Signale.

Nicht nur „funktioniert es" — geh gezielt auf:

1. **Toter Code.** Gibt es nach der Änderung Funktionen, Queries, Module oder
   CSS-Regeln ohne Konsumenten? Belege es mit `rg`, rate nicht.
2. **Duplikation.** Steht dieselbe Logik zweimal da und kann auseinanderlaufen,
   ohne dass ein Test es merkt?
3. **Einfachere Variante.** Löst eine vorhandene Abstraktion das schon, oder
   lässt sich eine Sonderregel durch eine geteilte ersetzen?
4. **Verlorenes Wissen.** Sind beim Umbau Kommentare weggefallen, die ein WARUM
   festhielten? Die gehören zurück.
5. **CSS-Spezifität und Reihenfolge.** Greift die neue Regel wirklich, oder
   überstimmt sie eine speziellere? Miss es im gerenderten Layout, nicht im
   Stylesheet.
6. **Ehrliche Prüfliste.** Was hast du gemessen, was nur angenommen? Benenne
   ungeprüfte Stellen explizit.

Sag mir am Ende klar, was du ändern würdest und was bewusst so bleiben soll.

## Warum Punkt 5 hier steht

Am 27.08.2026 hat er zweimal zugeschlagen: `.bezirkDetail .cardTip` hat eine
Schriftanhebung per Spezifität überstimmt, und der Kategorie-Index hatte einen
eigenen Desktop-Override. Beides sah im Stylesheet richtig aus und wäre
ungeprüft ausgeliefert worden. Der Beleg ist immer `getComputedStyle` auf der
gerenderten Seite.

## Womit messen

Die verfügbaren Browser-Werkzeuge bestimmen den Messweg. Viewport und Route
explizit setzen, auf das fertige Layout warten und `getComputedStyle` an der
gerenderten Seite prüfen. Lange Iframe-Messschleifen vermeiden; lieber eine
Seite pro Aufruf. Historische Audit-Werte ersetzen keine aktuelle Messung.

Stand dieser Anleitung: 30.09.2026. Frühere offene Reviews sind kein laufender
Auftrag; vor einem neuen Merge den tatsächlichen Diff neu prüfen.
