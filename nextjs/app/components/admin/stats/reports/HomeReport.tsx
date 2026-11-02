'use client';
import HeatPreview from '../HeatPreview';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/config';
import type { StatsSummary } from '@/lib/admin/stats.server';
import {
  HOME_SECTIONS,
  type HomeDevice,
  type HomeDeviceStats,
  type HomeSection,
  type HomeStats,
} from '@/lib/analytics/homeHeat';
import { BarRows, Card, Kpi } from '../charts';
import { NUMBER, longDay, percent } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Die Startseite: wie weit Aufrufe scrollen, worauf geklickt wird, und eine
 * Heatmap direkt über der echten Seite.
 *
 * Die Zahlen kommen getrennt vom Rest (`?only=home`), weil nur dieser Reiter
 * sie braucht. Die Vorschau ist die Startseite selbst in einem iframe — gleiche
 * Herkunft, also legt dieser Bericht seine Ebenen direkt in ihre Abschnitte.
 * Dort zählt sie nicht mit (lib/analytics.ts, isOwnOrAutomated).
 */

const DEVICES: { key: HomeDevice; label: string; width: number }[] = [
  { key: 'phone', label: 'Telefon', width: 390 },
  { key: 'desktop', label: 'Desktop', width: 1280 },
];

const LABEL = Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, s.label])) as Record<
  HomeSection,
  string
>;

export default function HomeReport({ data }: { data: StatsSummary }) {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<HomeDevice>('phone');
  const { start } = data.range;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(
          `/api/admin/stats?only=home&from=${start}&to=${data.range.end}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { home } = (await response.json()) as { home: HomeStats };
        if (!cancelled) {
          setStats(home);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled)
          setError(`Die Startseiten-Zahlen ließen sich nicht laden: ${(cause as Error).message}`);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [start, data.range.end]);

  if (error)
    return (
      <p className={styles.error} role="alert">
        {error}
      </p>
    );
  if (!stats)
    return (
      <p className={styles.notice} role="status">
        Wird geladen …
      </p>
    );

  const current = stats.devices[device];
  const valid = validProgress(current);
  const tools = (
    <div className={styles.seg} role="group" aria-label="Gerät">
      {DEVICES.map((d) => (
        <button
          key={d.key}
          type="button"
          className={d.key === device ? styles.segBtnOn : styles.segBtn}
          aria-pressed={d.key === device}
          onClick={() => setDevice(d.key)}
        >
          {d.label} · {NUMBER.format(stats.devices[d.key].views)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className={styles.homeToolbar}>
        {tools}
        <p className={styles.homeSince}>
          {stats.since
            ? `Messdaten ab ${longDay(stats.since)} · gewählter Zeitraum endet am ${longDay(data.range.end)}.`
            : 'Für diesen Zeitraum liegen keine Scroll- oder Klickmessungen vor.'}
        </p>
      </div>
      <Numbers stats={current} />
      {!valid && (
        <p className={styles.notice}>
          Messlücke: Mehr Fortschritte als Aufrufe angekommen. Quoten und mittlere Scrolltiefe
          werden deshalb nicht berechnet.
        </p>
      )}

      <Card
        title="Wie weit gescrollt wird"
        span={2}
        sub="Anteil der Aufrufe, die den Anfang eines Abschnitts im Bild hatten."
      >
        <BarRows
          rows={current.reached.map((r) => ({
            key: r.section,
            label: LABEL[r.section],
            count: r.count,
            share: valid && current.views > 0 ? percent(r.count / current.views, 0) : '–',
          }))}
          empty="Noch nichts gemessen."
          share="Anteil der Aufrufe"
        />
      </Card>

      <Card title="Scrolltiefe" sub="Anteil der Aufrufe, die mindestens so weit kamen.">
        <BarRows
          rows={current.depth
            .filter((d) => d.depth > 0)
            .map((d) => ({
              key: String(d.depth),
              label: `${d.depth} %`,
              count: Math.round(d.share * current.views),
              share: valid ? percent(d.share, 0) : '–',
            }))}
          empty="Noch nichts gemessen."
          share="Anteil der Aufrufe"
        />
      </Card>

      <Card
        title="Meistgeklickt"
        span={3}
        sub="Links, Knöpfe und Felder je Abschnitt. Ein Pfad ist ein Link auf diese Seite, ein Host ein Link nach außen."
      >
        <BarRows
          rows={current.targets.slice(0, 20).map((t) => ({
            key: `${t.section}|${t.target}`,
            label: (
              <>
                <span className={styles.homeSection}>{LABEL[t.section]}</span> {t.target}
              </>
            ),
            count: t.count,
            share: current.clicks > 0 ? percent(t.count / current.clicks, 0) : '',
          }))}
          empty="Noch keine Klicks."
          share="Anteil an allen Klicks"
        />
      </Card>

      <Card
        title="Heatmap"
        span={3}
        sub="Die Startseite, wie sie jetzt ist. Klicks liegen dort, wo sie im Abschnitt waren; die Linien zeigen, wie viele Aufrufe bis dahin kamen. Die Vorschau lässt sich scrollen; Links und Knöpfe sind gesperrt."
        tools={
          <span className={styles.heatLegend} aria-hidden="true">
            selten <span className={styles.heatRamp} /> oft
          </span>
        }
      >
        <HeatPreview
          key={device}
          path="/"
          title="Startseite mit Heatmap"
          sections={HOME_SECTIONS}
          heat={current.heat}
          views={current.views}
          reached={valid ? current.reached : []}
          width={DEVICES.find((d) => d.key === device)!.width}
        />
      </Card>
    </>
  );
}

function validProgress(stats: HomeDeviceStats) {
  return (
    stats.reached.every((row) => row.count <= stats.views) &&
    stats.depth.every((row) => row.share <= 1)
  );
}
function Numbers({ stats }: { stats: HomeDeviceStats }) {
  const valid = validProgress(stats);
  const bottom = stats.reached.at(-1)?.count ?? 0;
  const median = stats.depth.filter((d) => d.share >= 0.5).at(-1)?.depth ?? 0;
  return (
    <div className={styles.kpis}>
      <Kpi label="Gemessene Aufrufe" value={NUMBER.format(stats.views)} />
      <Kpi
        label="Bis zum Footer"
        value={valid && stats.views > 0 ? percent(bottom / stats.views, 0) : '–'}
        hint={`${NUMBER.format(bottom)} Aufrufe`}
      />
      <Kpi
        label="Halbe Aufrufe kommen bis"
        value={valid && stats.views > 0 ? `${median} %` : '–'}
        hint="der Seitenlänge"
      />
      <Kpi
        label="Klicks"
        value={NUMBER.format(stats.clicks)}
        hint={
          stats.views > 0
            ? `${(stats.clicks / stats.views).toFixed(1).replace('.', ',')} je Aufruf`
            : undefined
        }
      />
    </div>
  );
}
