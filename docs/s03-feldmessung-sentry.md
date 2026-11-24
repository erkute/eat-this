# S03 – Feldmessung und Sentry

Prüfung vom 24.11.2026. Referenz ist `aa156ce26bbcd29c9cb16f7227b552465b621366`. GitHub bestätigte den App-Hosting-Check. Der Firebase-Rollout war `SUCCEEDED` und der Build mit demselben SHA `READY`. [Release #1415](https://github.com/erkute/eat-this/pull/1415)

| Befund | Nachweis | Nächste Prüfung |
| --- | --- | --- |
| T5 · teilweise | Die eigene Erfassung liefert Produktionsdaten. Ältere Tageswerte mischen Releases. Die neuen Stichproben reichen noch nicht aus, um die Feldziele zu bewerten. Auch CrUX liefert zu wenig Daten. | Sieben vollständige Berliner Kalendertage auswerten, die Rollouts im Zeitfenster prüfen und die Stichprobe je Kennzahl, Seitentyp und Geräteklasse bewerten. |
| T7 · teilweise | Sentry bestätigte drei Artifact Bundles mit 516 Dateien für dieses Release. Je Bundle ließ sich eine geprüfte Debug-ID dem passenden JavaScript und seiner Source Map zuordnen. Ein geeignetes neues Fehlerereignis war bei der Prüfung nicht verfügbar. | Beim nächsten passenden Ereignis Produktionsrelease, Debug-ID und aufgelöste Originaldatei samt Zeile prüfen. |

Der bestehende Lighthouse-Lauf meldete LCP von 3,605 s auf der Startseite, 4,012 s auf der Map, 2,939 s für Engelbecken, 4,763 s beim Magazin und 2,645 s auf EN-Pizza. Bei der Map kamen TBT von 4080,5 ms und ein Performance-Score von 64 hinzu. Beim Magazin waren es 203 ms und 79. TBT misst Blockierzeit im Labor. Den INP beurteilen wir anhand von Feldwerten. [Lighthouse-Lauf](https://github.com/erkute/eat-this/actions/runs/45220455540)

Die oberste Stufe des Vitals-Histogramms hat eine offene Obergrenze. Eine lokale Reproduktion mit synthetischen Daten zeigte, dass das Dashboard dort trotzdem einen konkreten Zahlenwert anzeigt. Bei späterer Auswertung die Stufengrenzen und die Stichprobengröße für jede der drei Kennzahlen berücksichtigen. [Histogramm](../nextjs/lib/analytics/webVitals.ts) · [Admin-Bericht](../nextjs/app/components/admin/stats/reports/Vitals.tsx)

Die nächste Prüfung ist für den 01.12.2026 vorgesehen. Die detaillierten Produktionsmessungen liegen in der lokalen, vertraulichen Übergabe.
