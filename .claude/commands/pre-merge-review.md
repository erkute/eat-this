---
description: Senior-Review des Diffs, bevor er nach staging oder main geht
---

Review den Diff, der nach `staging` bzw. `main` gehen soll, als Senior Dev.
Ziehe ihn dir frisch (`git diff origin/staging...HEAD` bzw. `origin/main...origin/staging`),
verlasse dich nicht auf CI-Signale von vorher.

Nicht nur „funktioniert es" — geh gezielt auf:

1. **Toter Code.** Gibt es nach der Änderung Funktionen, Queries, Module oder
   CSS-Regeln ohne Konsumenten? Belege es mit grep, rate nicht.
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

Der Browser-Pane läuft `hidden` und blockt fremde Domains; für Sicht- und
Messfragen ist Playwright zuverlässiger (echte Viewport-Kontrolle, wartet
sauber). Lange Iframe-Messschleifen bleiben stehen und liefern dann Werte der
vorigen Seite — lieber eine Seite pro Aufruf.
