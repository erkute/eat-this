import type { ReactNode } from 'react';
import type { Delta, ExitEntry, Mover } from '@/lib/admin/stats.server';
import { NUMBER, direction, percent, shortDay } from './format';
import styles from '../StatsDashboard.module.css';

/**
 * Die Diagramme und Bausteine des Zahlenbretts — reines SVG, keine
 * Bibliothek. Das Brett hat einen Leser; eine Chart-Abhängigkeit im Bundle
 * wäre mehr Gewicht als die drei Formen, die es braucht: Linie, Balken,
 * Funke. Dazu die Tabellen und Kacheln, die mehrere Berichte teilen — damit
 * „Differenz" überall gleich aussieht und gleich gerechnet wird.
 */

export interface Series {
  label: string;
  values: number[];
  /** Die Vorperiode: gestrichelt, gleiche Länge, nach Index überlagert. */
  dashed?: boolean;
}

interface LineChartProps {
  /** Beschriftung der x-Achse (YYYY-MM-DD), gehört zur ersten Reihe. */
  days: string[];
  /**
   * Alle Reihen teilen EINE Skala. Darum nur zusammenlegen, was in derselben
   * Größenordnung liegt: Besucher und Aufrufe in einem Diagramm machten bei
   * 1.470 Aufrufen gegen 163 Besucher die Besucherreihe zum Strich am Boden —
   * genau die Zahl unlesbar, auf die es ankommt.
   */
  series: Series[];
  height?: number;
  /** Index des laufenden Tages — wird hohl gezeichnet, weil unvollständig. */
  openIndex?: number | null;
  format?: (value: number) => string;
}

const W = 720;
const PAD = { top: 12, right: 12, bottom: 26, left: 44 };

function ticks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? power;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export function LineChart({
  days,
  series,
  height = 220,
  openIndex = null,
  format,
}: LineChartProps) {
  const fmt = format ?? ((v: number) => NUMBER.format(Math.round(v)));
  const n = Math.max(days.length, ...series.map((s) => s.values.length));
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const yTicks = ticks(max);
  const top = yTicks.at(-1) ?? max;
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const labelEvery = Math.max(1, Math.ceil(n / 9));

  if (n === 0) return <p className={styles.empty}>Keine Tage im Zeitraum.</p>;

  return (
    <div className={styles.chart}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label="Verlauf"
        className={styles.chartSvg}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className={styles.gridLine}
            />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className={styles.axisText}>
              {fmt(t)}
            </text>
          </g>
        ))}
        {days.map((day, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={day} x={x(i)} y={height - 8} textAnchor="middle" className={styles.axisText}>
              {shortDay(day)}
            </text>
          ) : null
        )}
        {series.map((s, si) => {
          const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          const cls = s.dashed ? styles.lineBefore : si === 0 ? styles.lineNow : styles.lineSecond;
          return (
            <g key={s.label}>
              {!s.dashed && si === 0 && s.values.length > 1 && (
                <polygon
                  className={styles.areaNow}
                  points={`${x(0)},${y(0)} ${points} ${x(s.values.length - 1)},${y(0)}`}
                />
              )}
              <polyline points={points} className={cls} />
              {s.values.map((v, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={openIndex === i && !s.dashed ? 4.5 : 3}
                  className={
                    s.dashed
                      ? styles.dotBefore
                      : openIndex === i
                        ? styles.dotOpen
                        : si === 0
                          ? styles.dotNow
                          : styles.dotSecond
                  }
                >
                  <title>
                    {`${s.label} · ${days[i] ? shortDay(days[i]) : `Tag ${i + 1}`}: ${fmt(v)}${
                      openIndex === i && !s.dashed ? ' (läuft noch)' : ''
                    }`}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className={styles.legend}>
        {series.map((s, si) => (
          <span key={s.label} className={styles.legendItem}>
            <i
              className={
                s.dashed ? styles.swatchBefore : si === 0 ? styles.swatchNow : styles.swatchSecond
              }
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ein Funke für eine Kachel: 30 Tage in 90 Pixeln. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const max = Math.max(1, ...values);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.spark} role="img" aria-label={label}>
      <polyline points={points} className={styles.sparkLine} />
    </svg>
  );
}

/** Balkenzeilen — die Rangliste des Bretts. `share` hängt rechts als kleine
 *  Zahl dran (z. B. je 100 Besucher). */
export function BarRows({
  rows,
  empty,
  share,
}: {
  rows: { key: string; label?: ReactNode; count: number; share?: string }[];
  empty: string;
  share?: string;
}) {
  if (rows.length === 0) return <p className={styles.empty}>{empty}</p>;
  const peak = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ol className={styles.rank} aria-label={share}>
      {rows.map((row) => (
        <li key={row.key} className={styles.rankRow}>
          <span className={styles.rankKey} title={row.key}>
            {row.label ?? row.key}
          </span>
          <span className={styles.rankBarWrap}>
            <span className={styles.rankBar} style={{ width: `${(row.count / peak) * 100}%` }} />
          </span>
          <span className={styles.rankValue}>{NUMBER.format(row.count)}</span>
          {row.share !== undefined && <span className={styles.rankShare}>{row.share}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Säulen — für Wochentage. */
export function Columns({ rows }: { rows: { label: string; value: number; title?: string }[] }) {
  const peak = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={styles.columns} role="list">
      {rows.map((row) => (
        <div key={row.label} className={styles.column} role="listitem" title={row.title}>
          <span className={styles.columnValue}>{NUMBER.format(Math.round(row.value))}</span>
          <span className={styles.columnBarWrap}>
            <span className={styles.columnBar} style={{ height: `${(row.value / peak) * 100}%` }} />
          </span>
          <span className={styles.columnLabel}>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Eine Kennziffer im Vergleich: „▲ 12 %" mit Bezug. */
export function Change({ delta, label }: { delta: Delta; label: string }) {
  const dir = direction(delta);
  if (dir === null) {
    return (
      <span className={styles.deltaFlat}>
        {label}: {NUMBER.format(Math.round(delta.before))} → {NUMBER.format(Math.round(delta.now))}
      </span>
    );
  }
  const cls = dir === 'flat' ? styles.deltaFlat : dir === 'up' ? styles.deltaUp : styles.deltaDown;
  return (
    <span className={cls}>
      {dir === 'flat' ? '±' : dir === 'up' ? '▲' : '▼'} {percent(Math.abs(delta.change ?? 0))}
      <span className={styles.deltaLabel}>
        {' '}
        {label} ({NUMBER.format(Math.round(delta.before))})
      </span>
    </span>
  );
}

/** Eine Kennzahl-Kachel im GA-Stil: Wert, Delta, Funke. */
export function Kpi({
  label,
  value,
  delta,
  hint,
  spark,
  invert = false,
}: {
  label: string;
  value: string;
  delta?: Delta | null;
  hint?: string;
  spark?: number[];
  /** Für Zahlen, bei denen weniger besser ist (Ausstiege, Fehler). */
  invert?: boolean;
}) {
  const dir = direction(delta);
  const good =
    dir === null ? null : dir === 'flat' ? 'flat' : (dir === 'up') !== invert ? 'up' : 'down';
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <strong className={styles.kpiValue}>{value}</strong>
      <span className={styles.kpiFoot}>
        {delta && dir !== null && (
          <span
            className={
              good === 'up' ? styles.deltaUp : good === 'down' ? styles.deltaDown : styles.deltaFlat
            }
          >
            {dir === 'flat' ? '±' : dir === 'up' ? '▲' : '▼'} {percent(Math.abs(delta.change ?? 0))}
          </span>
        )}
        {hint && <span className={styles.kpiHint}>{hint}</span>}
      </span>
      {spark && <Sparkline values={spark} label={label} />}
    </div>
  );
}

/** Ein Bericht-Kasten mit Titel und optionalen Werkzeugen rechts. */
export function Card({
  title,
  sub,
  tools,
  children,
  span,
}: {
  title: string;
  sub?: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
  span?: 2 | 3;
}) {
  return (
    <section
      className={span === 3 ? styles.cardSpan3 : span === 2 ? styles.cardSpan2 : styles.card}
    >
      <header className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          {sub && <p className={styles.cardSub}>{sub}</p>}
        </div>
        {tools && <div className={styles.cardTools}>{tools}</div>}
      </header>
      {children}
    </section>
  );
}

/** Eine kleine Kachel: Wert oben, Beschriftung darunter. */
export function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.dayTile}>
      <span className={styles.dayTileValue}>{value}</span>
      <span className={styles.dayTileLabel}>{label}</span>
    </div>
  );
}

/** Eine Differenz als Tabellenzelle: „+12" grün, „−3" rot, leer ohne Wert. */
export function DiffCell({ diff }: { diff: number | null }) {
  if (diff === null) return <td className={styles.cellNum} />;
  return (
    <td className={diff > 0 ? styles.cellPos : styles.cellNeg}>
      {diff > 0 ? '+' : '−'}
      {NUMBER.format(Math.abs(diff))}
    </td>
  );
}

/** Was gegen die Vorperiode gewonnen und verloren hat — Seiten, Hosts,
 *  Ereignisse. `label` übersetzt den Schlüssel, wo es eine Übersetzung gibt. */
export function MoverList({
  rows,
  head,
  label,
}: {
  rows: Mover[];
  head: string;
  label?: (key: string) => string;
}) {
  if (rows.length === 0) return <p className={styles.empty}>Keine Vorperiode im Zeitraum.</p>;
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{head}</th>
            <th scope="col">Vorher</th>
            <th scope="col">Jetzt</th>
            <th scope="col">Differenz</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.key}>
              <td className={styles.cellKey} title={m.key}>
                {label ? label(m.key) : m.key}
              </td>
              <td className={styles.cellNum}>{NUMBER.format(m.before)}</td>
              <td className={styles.cellNum}>{NUMBER.format(m.now)}</td>
              <DiffCell diff={m.diff} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Wo Besuche enden. `compact` lässt die Spalte „weiter" weg und rundet die
 *  Quote — für die schmale Tagesspalte. */
export function ExitTable({ rows, compact = false }: { rows: ExitEntry[]; compact?: boolean }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Seite</th>
            <th scope="col">Aufrufe</th>
            {!compact && <th scope="col">weiter</th>}
            <th scope="col">Ende</th>
            <th scope="col">Quote</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className={styles.cellKey}>{row.key}</td>
              <td className={styles.cellNum}>{NUMBER.format(row.views)}</td>
              {!compact && <td className={styles.cellNum}>{NUMBER.format(row.continued)}</td>}
              <td className={styles.cellNum}>{NUMBER.format(row.exits)}</td>
              <td className={styles.cellNum}>{percent(row.rate, compact ? 0 : 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
