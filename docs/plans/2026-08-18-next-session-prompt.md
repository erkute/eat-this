# Prompt für die nächste Session

Paste-fertig. Alles unter der Linie ist der Prompt.

---

Kontext: Repo „Eat This" (`nextjs/` + `studio/`). Ausgangspunkt ist
`docs/plans/2026-08-18-mobile-ux-findings.md` — **lies die Datei ZUERST**. Sie
enthält 30 offene Punkte aus einem Mobile-Walkthrough, jeweils mit Messung und
Begründung, die man sonst neu herleitet. Ich will die schrittweise abarbeiten,
nicht alles auf einmal.

Vorgeschichte: PR #337 (drei Bugs) → `staging`, PR #338 (Promotion) → `main`,
beide gemerged. Erledigt und **nicht nochmal anfassen**: der Grid-Overflow im
„Was bestellen?"-Block, der Drop-Cap-Balken bei Ledes mit „I", und die
Zurück-Geste auf der Map (inkl. des dabei gefundenen stale `?r=` beim
X-Schließen).

## Vorgehen

Ein Punkt pro Durchgang. Für jeden: erst am laufenden Dev-Server im
375px-Viewport reproduzieren und messen, dann fixen, dann mit derselben Messung
gegenprüfen. Keine Sammel-PRs — Feature-Branch → PR in `staging`.

Frag mich vor dem Start, welchen Punkt ich will, wenn er nicht unten steht.

## Startpunkt: P1.1, Empty State bei null Treffern

Suche „Ramen" / „Sushi" / „vegan" auf der Map liefert eine leere Fläche plus
Paywall-Anzeige — kein „0 Treffer", keine Erklärung. Der Nutzer kann nicht
unterscheiden zwischen „gibt's nicht", „ist gesperrt" und „kaputt".

Zwei Dinge, die die letzte Session schon rausgefunden hat und die Zeit sparen:

1. `app/components/map/MapListEmpty.tsx` **existiert bereits** und greift im
   Suchfall nicht. Erst klären warum, dann bauen — nicht blind eine zweite
   Empty-State-Komponente danebenstellen.
2. Die freie Map hat **29 Spots gesamt** (gemessen über
   `document.querySelectorAll('button[class*=rcard]').length` bei leerer Suche).
   Gleichzeitig sind auf `/bezirk/kreuzberg` 57 Restaurants frei verlinkt und
   `/restaurant/buya-ramen-factory` ist frei lesbar. Der Empty State muss also
   sagen, wie viele gesperrte Treffer es gibt — „Keine freien Treffer für
   ‚Ramen'. 3 Ramen-Spots stecken im Dinner-Pack." Ohne Zahl ist die Paywall
   eine Blackbox, und bei „Burger" (1 von 1 frei) wäre ein pauschales
   „kauf und du kriegst mehr" schlicht falsch.

Das hängt an P2.3 und P2.4 im Fund-Dokument — lies die mit, bevor du die Copy
formulierst.

## Randbedingungen, die hier greifen

- `CLAUDE.md` ist die Quelle der Wahrheit, `AGENTS.md` ist Referenzdetail.
- **Keine Opacity-Fades** für Ein-/Ausblend-Motion auf Marken-Oberflächen.
  Zustandswechsel (Hover, Backdrop) dürfen Opacity nutzen, Bewegung nicht.
- Die App ist **light-only**, das ist entschieden. Kein `prefers-color-scheme`,
  kein `data-theme`.
- Kein `!important` — drei `*.styles.test.ts` prüfen das und schlagen sonst an.
- `npm test` vor dem Push laufen lassen; der Pre-Push-Hook baut nur.
- Läuft `npm run dev`, dann `npm run build:isolated` statt `npm run build`.

## Was NICHT Teil des Auftrags ist

- Die Prettier-Baseline der fünf unformatierten Dateien (siehe Ende des
  Fund-Dokuments) — eigener Commit, wenn überhaupt.
- Der Stripe-500 aus der letzten Session war lokale Config, **kein
  Produktdefekt**; die Fehlerbehandlung im UI funktioniert.
