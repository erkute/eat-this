import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/config';
import type { StatsSummary } from '@/lib/admin/stats.server';
import {
  SURFACES,
  SURFACE_LABELS,
  surfaceForPath,
  totalInsights,
  emptyDeviceCounts,
  type Surface,
  type InsightDevice,
  type InsightHeat,
} from '@/lib/analytics/engagement';
import { Card, Kpi, BarRows } from '../charts';
import { NUMBER, percent, longDay } from '../format';
import HeatPreview from '../HeatPreview';
import HomeReport from './HomeReport';
import styles from '../../StatsDashboard.module.css';
const SECTIONS = [
  { key: 'header', label: 'Kopf', selector: '[data-insight-header]' },
  { key: 'content', label: 'Inhalt', selector: '[data-insight-content]' },
  { key: 'footer', label: 'Footer', selector: '[data-site-footer]' },
];
const TARGET_LABELS: Record<string, string> = {
  article: 'Artikel öffnen',
  spot: 'Spot öffnen',
  map: 'Map öffnen',
  pack: 'Pack öffnen',
  navigation: 'Interner Link',
  external: 'Externer Link',
  share: 'Teilen',
  control: 'Bedienelement',
  other: 'Klick ohne Bedienelement',
};
export default function Insights({ data }: { data: StatsSummary }) {
  const [surface, setSurface] = useState<Surface | 'home'>('article');
  const [device, setDevice] = useState<InsightDevice>('phone');
  const [selected, setSelected] = useState('');
  const [showHeat, setShowHeat] = useState(false);
  const [heat, setHeat] = useState<InsightHeat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pages = data.paths.filter((row) => surfaceForPath(row.key) === surface);
  const path = pages.find((row) => row.key === selected)?.key ?? pages[0]?.key ?? '';
  const summary = surface === 'home' ? null : data.engagement.surfaces[surface];
  const row = data.engagement.pages.find((row) => row.path === path);
  const counts = (row?.devices ?? emptyDeviceCounts())[device];
  const observed = surface === 'home' ? 0 : (summary ?? emptyDeviceCounts())[device].view;
  const baseline = pages.reduce((sum, row) => sum + row.count, 0);
  const allCounts = summary ? totalInsights(summary) : null;
  const invalid = Object.entries(counts).some(
    ([key, value]) => key !== 'view' && value > counts.view
  );
  const share = (value: number) =>
    counts.view > 0 && !invalid ? percent(value / counts.view) : '—';
  useEffect(() => {
    if (!showHeat || !path || surface === 'map' || surface === 'home') return;
    let cancelled = false;
    setHeat(null);
    setError(null);
    const load = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch(
          `/api/admin/stats?only=heat&path=${encodeURIComponent(path)}&device=${device}&from=${data.range.start}&to=${data.range.end}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!cancelled) setHeat(result.heat);
      } catch (cause) {
        if (!cancelled)
          setError(`Heatmap konnte nicht geladen werden: ${(cause as Error).message}`);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showHeat, path, device, surface, data.range.start, data.range.end]);
  return (
    <>
      <div className={styles.reportTabs} role="group" aria-label="Nutzungsbereich">
        {[...SURFACES, 'home' as const].map((key) => (
          <button
            type="button"
            key={key}
            className={`et-btn et-btn-sm${surface === key ? '' : ' et-btn-alt'}`}
            aria-pressed={surface === key}
            onClick={() => {
              setSurface(key);
              setSelected('');
              setShowHeat(false);
            }}
          >
            {key === 'home' ? 'Startseite' : SURFACE_LABELS[key]}
          </button>
        ))}
      </div>
      {surface === 'home' ? (
        <HomeReport data={data} />
      ) : (
        <>
          <Card
            title={`${SURFACE_LABELS[surface]}: Messabdeckung`}
            span={3}
            sub="Aufrufe sind keine eindeutigen Personen. Neue Detailmessungen sind erst nach dem Rollout verfügbar."
          >
            <p className={styles.note}>
              {NUMBER.format(allCounts?.view ?? 0)} Aufrufe mit Detailmessung bei{' '}
              {NUMBER.format(baseline)} gespeicherten Seitenaufrufen dieses Bereichs.{' '}
              {data.engagement.since
                ? `Detaildaten ab ${longDay(data.engagement.since)}.`
                : 'Für diesen Zeitraum liegen noch keine Detailmessungen vor.'}
            </p>
            <p className={styles.note}>
              Telefon und Desktop bezeichnen hier die Breite beim Öffnen: unter 768 px
              beziehungsweise ab 768 px, keine Geräteerkennung.
            </p>
            <div className={styles.cardTools}>
              <label>
                Seite{' '}
                <select
                  className={styles.select}
                  aria-label="Nutzung: Seite"
                  value={path}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setShowHeat(false);
                  }}
                >
                  {pages.map((row) => (
                    <option key={row.key} value={row.key}>
                      {row.key}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Gerät{' '}
                <select
                  className={styles.select}
                  aria-label="Nutzung: Gerät"
                  value={device}
                  onChange={(e) => setDevice(e.target.value as InsightDevice)}
                >
                  <option value="phone">Telefon</option>
                  <option value="desktop">Desktop</option>
                </select>
              </label>
            </div>
          </Card>
          {counts.view === 0 ? (
            <p className={styles.notice}>
              Für diese Seite und dieses Gerät fehlen Detailmessungen. Scrolltiefe, Vertiefung und
              Weiterklicks sind unbekannt, keine Nullwerte.
            </p>
          ) : (
            <>
              {invalid && (
                <p className={styles.error}>
                  Einzelne Signale übersteigen die Zahl der gemessenen Aufrufe. Die Quoten werden
                  bis zum Abgleich nicht berechnet.
                </p>
              )}
              <div className={styles.kpis}>
                <Kpi label="Gemessene Aufrufe" value={NUMBER.format(counts.view)} />
                <Kpi
                  label="Mit Vertiefung"
                  value={share(counts.engaged)}
                  hint="10 sichtbare Sekunden oder Interaktion"
                />
                <Kpi
                  label="Mit internem Weiterklick"
                  value={share(counts.onward)}
                  hint="Je Aufruf höchstens einmal"
                />
                <Kpi
                  label={surface === 'map' ? 'Mit Spot-Öffnung' : 'Mindestens 30 Sekunden sichtbar'}
                  value={share(surface === 'map' ? counts.spot : counts.read30)}
                />
              </div>
              <Card
                title={
                  surface === 'map' ? 'Was auf der Map passiert' : 'Wie weit die Seite gesehen wird'
                }
                span={3}
                sub={
                  surface === 'map'
                    ? 'Einmal je gemessenem Map-Aufruf. Eine Person kann mehrere Schritte auslösen.'
                    : 'Scrolltiefe zeigt sichtbare Textpositionen, nicht nachgewiesenes Lesen. Ein Sprung nach unten kann mehrere Stufen erreichen.'
                }
              >
                <BarRows
                  rows={(surface === 'map'
                    ? [
                        ['engaged', 'Interagiert / 10 s sichtbar'],
                        ['search', 'Suche benutzt'],
                        ['filter', 'Filter / Ansicht benutzt'],
                        ['spot', 'Spot-Detail geöffnet'],
                        ['onward', 'Intern weitergeklickt'],
                        ['outbound', 'Externer Link geklickt'],
                      ]
                    : [
                        ['depth25', '25 % des Inhalts'],
                        ['depth50', '50 % des Inhalts'],
                        ['depth75', '75 % des Inhalts'],
                        ['depth100', 'Ende des Inhalts sichtbar'],
                        ['onward', 'Interner Weiterklick'],
                        ['outbound', 'Externer Link geklickt'],
                      ]
                  ).map(([key, label]) => ({
                    key,
                    label,
                    count: counts[key as keyof typeof counts],
                    share: share(counts[key as keyof typeof counts]),
                  }))}
                  empty="Keine Signale erfasst."
                />
                {surface === 'map' && (
                  <p className={styles.note}>
                    {NUMBER.format(Math.max(0, counts.view - counts.spot))} gemessene Map-Aufrufe
                    ohne Spot-Öffnung. Das ist eine prüfbare Übergangslücke, keine personenbezogene
                    Absprungrate. Eine geografische Heatmap wäre wegen wechselnder Ausschnitte und
                    Zoomstufen irreführend.
                  </p>
                )}
              </Card>
            </>
          )}
          {surface !== 'map' && path && (
            <Card
              title="Klick-Heatmap dieser Seite"
              span={3}
              sub="Relative Klickpositionen innerhalb von Kopf, Inhalt und Footer. Die Vorschau ist nur zum Scrollen und zeigt das heutige Layout; nach größeren Layoutänderungen sind ältere Positionen nur eingeschränkt vergleichbar."
            >
              <button
                type="button"
                className="et-btn et-btn-sm et-btn-alt"
                onClick={() => setShowHeat((value) => !value)}
              >
                {showHeat ? 'Vorschau schließen' : 'Heatmap laden'}
              </button>
              {showHeat &&
                (error ? (
                  <p className={styles.error}>{error}</p>
                ) : !heat ? (
                  <p role="status" className={styles.note}>
                    Heatmap wird geladen …
                  </p>
                ) : (
                  <>
                    {Object.keys(heat.heat).length === 0 && (
                      <p className={styles.note}>
                        Keine Klickpositionen für diese Auswahl gespeichert. Eine leere Karte
                        bedeutet keine nachgewiesene Interaktionslosigkeit.
                      </p>
                    )}
                    <BarRows
                      rows={Object.entries(heat.targets).map(([key, count]) => ({
                        key,
                        label: TARGET_LABELS[key] ?? key,
                        count,
                      }))}
                      empty="Keine Klickziele gespeichert."
                    />
                    <HeatPreview
                      key={`${path}:${device}`}
                      path={path}
                      title={`${SURFACE_LABELS[surface]} mit Heatmap`}
                      width={device === 'phone' ? 390 : 1280}
                      sections={SECTIONS}
                      heat={heat.heat}
                      views={counts.view}
                      depth={
                        invalid
                          ? []
                          : [25, 50, 75, 100].map((at) => ({
                              at,
                              count: counts[`depth${at}` as keyof typeof counts],
                            }))
                      }
                    />
                  </>
                ))}
            </Card>
          )}
          {observed === 0 && (
            <p className={styles.notice}>
              Nach dem Rollout sammeln sich hier echte Nutzungsdaten. Historische Aufrufe werden
              nicht mit erfundenen Scroll- oder Klickwerten ergänzt.
            </p>
          )}
        </>
      )}
    </>
  );
}
