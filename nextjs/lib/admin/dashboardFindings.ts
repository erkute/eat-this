import { FULL_DAY_FIELDS_SINCE, type StatsSummary } from './stats.server';
import { totalInsights } from '@/lib/analytics/engagement';
export interface DashboardFinding {
  key: string;
  title: string;
  detail: string;
  report: 'days' | 'search' | 'home' | 'measurement';
}
/** Prüfhinweise mit sichtbarer Datenbasis. Kleine Stichproben bekommen keine Alarmbewertung. */
export function dashboardFindings(data: StatsSummary): DashboardFinding[] {
  const result: DashboardFinding[] = [];
  const mismatches = data.measurement.filter(
    (day) =>
      day.recorded &&
      day.day >= FULL_DAY_FIELDS_SINCE &&
      (day.entries !== day.visitors || day.views !== day.pageviews)
  );
  if (mismatches.length)
    result.push({
      key: 'measurement',
      title: 'Zählerabgleich prüfen',
      detail: `An ${mismatches.length} Tagen stimmen Gesamtzahl und gespeicherte Aufschlüsselung nicht überein. Diese Daten zuerst prüfen.`,
      report: 'measurement',
    });
  const eventCount = (key: string) => data.events.find((row) => row.key === key)?.count ?? 0;
  const shown = eventCount('consent_gate_shown');
  const answered = eventCount('consent_accepted') + eventCount('consent_declined');
  if (shown >= 100 && answered / shown < 0.25)
    result.push({
      key: 'traffic-quality',
      title: 'Verkehrsqualität prüfen',
      detail: `${shown} Cookie-Dialog-Einblendungen, aber nur ${answered} Antworten. Das kann kurze Besuche, wiederholte Einblendungen, Messlücken oder Automatisierung bedeuten. Kein Botnachweis: Vergleiche die Tageswerte mit GA und Google-Suche, bevor du daraus Nutzerwachstum ableitest.`,
      report: 'measurement',
    });
  const loss = data.search?.ok
    ? data.search.data.movers.falling.find((row) => row.clicksBefore >= 5 && row.diff <= -3)
    : null;
  if (loss)
    result.push({
      key: 'search',
      title: `Weniger Google-Klicks: ${loss.key}`,
      detail: `${loss.clicks} statt ${loss.clicksBefore} Klicks im gleich langen Suchzeitraum. Prüfe Zielseite, Suchintention und Suchvorschau; die Ursache ist daraus noch nicht bekannt.`,
      report: 'search',
    });
  const map = totalInsights(data.engagement.surfaces.map);
  if (map.view >= 20 && map.spot <= map.view && map.spot / map.view < 0.25)
    result.push({
      key: 'map',
      title: 'Wenige Map-Aufrufe mit Spot-Öffnung',
      detail: `Bei ${map.view} gemessenen Map-Aufrufen wurde ${map.spot}-mal mindestens ein Spot geöffnet. Prüfe Suche, Filter und Einstieg. Die Zahlen beziehen sich auf Aufrufe, nicht auf unterschiedliche Menschen.`,
      report: 'home',
    });
  const exit = data.exits
    .filter((row) => row.views >= 20 && row.rate >= 0.8)
    .sort((a, b) => b.exits - a.exits)[0];
  if (exit)
    result.push({
      key: 'exit',
      title: `Viele Aufrufe ohne internen Folgeklick auf ${exit.key}`,
      detail: `${exit.exits} von ${exit.views} Aufrufen ohne gezählte interne Fortsetzung, geschätzt. Bei einem Artikel kann das bedeuten, dass die Frage beantwortet wurde. Prüfe passende nächste Schritte statt allein die Quote zu bewerten.`,
      report: 'days',
    });
  return result.slice(0, 3);
}
