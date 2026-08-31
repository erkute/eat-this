'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase/config';
import type { Delta, Entry, ExitEntry, Mover, StatsSummary } from '@/lib/admin/stats.server';
import styles from './StatsDashboard.module.css';

/**
 * Die Leseseite des einwilligungsfreien Zählers.
 *
 * Bewusst nüchtern: das ist ein Werkzeug, keine Marketingfläche. Was es
 * beantworten muss, steht oben (wie viele Menschen, wie viele stimmen dem
 * Cookie-Dialog zu, wo bricht der Kauf ab); die Ranglisten stehen darunter.
 */

const RANGES = [
  { days: 7, label: '7 Tage' },
  { days: 30, label: '30 Tage' },
  { days: 90, label: '90 Tage' },
] as const;

const EVENT_LABELS: Record<string, string> = {
  begin_checkout: 'Kauf begonnen',
  checkout_already_owned: 'Kauf: schon im Besitz',
  checkout_error: 'Kauf: Fehler',
  consent_accepted: 'Cookies zugestimmt',
  consent_declined: 'Cookies abgelehnt',
  consent_gate_shown: 'Cookie-Dialog gezeigt',
  locked_spot_login_start: 'Gesperrter Spot: Anmeldung begonnen',
  locked_spot_opened: 'Gesperrter Spot geöffnet',
  locked_spot_pack_clicked: 'Gesperrter Spot: Pack geklickt',
  login: 'Angemeldet',
  login_link_sent: 'Magic Link verschickt',
  login_start: 'Anmeldung begonnen',
  login_view: 'Anmeldeseite gesehen',
  map_location_invite_accepted: 'Standort erlaubt',
  map_location_invite_shown: 'Standort gefragt',
  map_opened: 'Karte geöffnet',
  map_view_toggle: 'Kartenansicht gewechselt',
  must_eat_opened: 'Must Eat geöffnet',
  must_eat_reveal_attempt: 'Must Eat aufdecken versucht',
  purchase: 'Gekauft',
  restaurant_maps_clicked: 'Route geklickt',
  restaurant_menu_clicked: 'Speisekarte geklickt',
  restaurant_opened: 'Spot geöffnet',
  restaurant_reservation_clicked: 'Reservierung geklickt',
  share: 'Geteilt',
  sign_up: 'Konto angelegt',
  view_item: 'Spot-Detail gesehen',
};

const NUMBER = new Intl.NumberFormat('de-DE');

function labelFor(key: string): string {
  return EVENT_LABELS[key] ?? key;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1).replace('.', ',')} %`;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/** Tagesbeschriftung „28.08." — der Verlauf braucht kein Jahr. */
function shortDay(day: string): string {
  const [, month, date] = day.split('-');
  return month && date ? `${date}.${month}.` : day;
}

export default function StatsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<StatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (range: number) => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/admin/stats?days=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404 || response.status === 401) {
        // Die Route antwortet Nicht-Admins bewusst mit 404. Hier heißt das
        // nicht „weg", sondern „nicht für dieses Konto".
        setError('Dieses Konto hat keinen Zugriff auf die Zahlen.');
        setData(null);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as StatsSummary);
    } catch (cause) {
      setError(`Die Zahlen ließen sich nicht laden: ${(cause as Error).message}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load(days);
  }, [authLoading, user, days, load]);

  if (authLoading) return null;

  if (!user) {
    return (
      <main className={styles.page}>
        <p className={styles.notice}>Zum Ansehen der Zahlen bitte anmelden.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Zahlen</h1>
        <p className={styles.sub}>
          Einwilligungsfreier Zähler — jeder Besuch, nicht nur die Zustimmenden.
        </p>
        <div className={styles.ranges}>
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              className={range.days === days ? styles.rangeOn : styles.range}
              aria-pressed={range.days === days}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}
      {loading && !data && <p className={styles.notice}>Wird geladen …</p>}

      {data && (
        <div className={loading ? styles.bodyStale : styles.body}>
          <Yesterday data={data} />
          <Headline data={data} />
          <Trend
            title="Besucher"
            points={data.days.map((d) => ({ day: d.day, value: d.visitors }))}
            today={data.today?.day}
          />
          <Trend
            title="Seitenaufrufe"
            points={data.days.map((d) => ({ day: d.day, value: d.pageviews }))}
            today={data.today?.day}
          />
          <Weekdays data={data} />
          <Consent data={data} />
          <Funnels data={data} />
          <Movers data={data} />
          <Exits data={data} />
          <div className={styles.columns}>
            <Ranking title="Einstiegsseiten" rows={data.entryPaths} empty="Noch nicht erfasst." />
            <Ranking title="Meistgesehen" rows={data.paths} empty="Nichts gezählt." />
            <Ranking title="Herkunft" rows={data.referrers} empty="Keine externen Verweise." />
          </div>
          <Events data={data} />
        </div>
      )}
    </main>
  );
}

function Headline({ data }: { data: StatsSummary }) {
  const { totals, period } = data;
  const perDay = totals.days > 0 ? Math.round(totals.visitors / totals.days) : 0;
  return (
    <>
      <section className={styles.tiles}>
        <Tile
          value={NUMBER.format(totals.visitors)}
          label="Besucher"
          delta={period?.visitors ?? null}
        />
        <Tile
          value={NUMBER.format(totals.pageviews)}
          label="Seitenaufrufe"
          delta={period?.pageviews ?? null}
        />
        <Tile value={NUMBER.format(perDay)} label="Besucher je Tag" />
        <Tile value={NUMBER.format(totals.days)} label="Tage erfasst" />
      </section>
      {period && (
        <p className={styles.note}>
          Die Pfeile vergleichen den Schnitt <strong>je Tag</strong> mit der Periode davor —{' '}
          {NUMBER.format(period.daysNow)} gemessene Tage gegen {NUMBER.format(period.days)}.
          {period.days !== period.daysNow &&
            ' Die Perioden sind kalendarisch gleich lang; dass unterschiedlich viele Tage Daten tragen, gleicht der Tagesschnitt aus.'}
        </p>
      )}
    </>
  );
}

function Tile({ value, label, delta }: { value: string; label: string; delta?: Delta | null }) {
  return (
    <div className={styles.tile}>
      <strong className={styles.tileValue}>{value}</strong>
      <span className={styles.tileLabel}>{label}</span>
      {delta && delta.change !== null && (
        <span className={styles.tileDelta}>
          {Math.abs(delta.change) < 0.005 ? '±' : delta.change > 0 ? '▲' : '▼'}{' '}
          {percent(Math.abs(delta.change))}
        </span>
      )}
    </div>
  );
}

/** Eine Kennziffer im Vergleich: „▲ 12 %" mit Bezug. */
function Change({ delta, label }: { delta: Delta; label: string }) {
  if (delta.change === null) {
    return (
      <span className={styles.changeFlat}>
        {label}: {NUMBER.format(delta.before)} → {NUMBER.format(delta.now)}
      </span>
    );
  }
  const up = delta.change > 0;
  const flat = Math.abs(delta.change) < 0.005;
  return (
    <span className={flat ? styles.changeFlat : up ? styles.changeUp : styles.changeDown}>
      {flat ? '±' : up ? '▲' : '▼'} {percent(Math.abs(delta.change))}
      <span className={styles.changeLabel}>
        {' '}
        {label} ({NUMBER.format(delta.before)})
      </span>
    </span>
  );
}

/** Der jüngste abgeschlossene Tag — die Zahl für den Morgenkaffee. Der
 *  laufende Tag steht bewusst nur als Randnotiz daneben: er ist unvollständig
 *  und sähe als Hauptzahl jeden Morgen wie ein Absturz aus. */
function Yesterday({ data }: { data: StatsSummary }) {
  const { latest, today } = data;
  if (!latest.day) return null;
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        {WEEKDAYS[new Date(`${latest.day.day}T12:00:00Z`).getUTCDay()]}, {shortDay(latest.day.day)}
      </h2>
      <p className={styles.big}>{NUMBER.format(latest.day.visitors)}</p>
      <p className={styles.note}>
        Besucher, {NUMBER.format(latest.day.pageviews)} Seitenaufrufe — der letzte volle Tag.
      </p>
      <div className={styles.changes}>
        {latest.vsPrevDay && <Change delta={latest.vsPrevDay.visitors} label="zum Vortag" />}
        {latest.vsSameWeekday && (
          <Change delta={latest.vsSameWeekday.visitors} label="zum selben Wochentag" />
        )}
      </div>
      {today && (
        <p className={styles.note}>
          Heute stehen bisher {NUMBER.format(today.visitors)} Besucher und{' '}
          {NUMBER.format(today.pageviews)} Aufrufe — der Tag läuft noch, die Zahl wächst.
        </p>
      )}
    </section>
  );
}

/**
 * Ein Verlauf, eine Größe, eine Skala.
 *
 * Vorher lagen Besucher und Aufrufe in einem Diagramm auf gemeinsamer Skala —
 * bei 1.470 Aufrufen gegen 163 Besucher war die Besucherreihe ein Strich am
 * Boden, also genau die Zahl unlesbar, auf die es ankommt.
 */
function Trend({
  title,
  points,
  today,
}: {
  title: string;
  points: { day: string; value: number }[];
  today?: string;
}) {
  const peak = Math.max(1, ...points.map((p) => p.value));
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{title}</h2>
      <div className={styles.trend} role="list">
        {points.map((point) => (
          <div
            key={point.day}
            className={styles.trendCol}
            role="listitem"
            title={`${shortDay(point.day)} — ${NUMBER.format(point.value)}${point.day === today ? ' (läuft noch)' : ''}`}
          >
            <span className={styles.trendValue}>{NUMBER.format(point.value)}</span>
            <div className={styles.trendBars}>
              <span
                className={point.day === today ? styles.trendBarToday : styles.trendBar}
                style={{ height: `${(point.value / peak) * 100}%` }}
              />
            </div>
            <span className={styles.trendDay}>{shortDay(point.day)}</span>
          </div>
        ))}
      </div>
      {today && points.some((p) => p.day === today) && (
        <p className={styles.note}>Der letzte Balken ist der laufende Tag und noch nicht fertig.</p>
      )}
    </section>
  );
}

/** Wann Menschen wirklich kommen. Beantwortet die Frage, die sonst jeden
 *  Sonntag neu gestellt wird: ist das ein Einbruch oder der Wochenrhythmus? */
function Weekdays({ data }: { data: StatsSummary }) {
  if (data.weekdays.length < 2) return null;
  const avg = (w: { visitors: number; days: number }) => (w.days > 0 ? w.visitors / w.days : 0);
  const peak = Math.max(1, ...data.weekdays.map(avg));
  // Montag zuerst — Date zählt ab Sonntag, gelesen wird die Woche anders.
  const ordered = [...data.weekdays].sort(
    (a, b) => ((a.index + 6) % 7) - ((b.index + 6) % 7)
  );
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Nach Wochentag</h2>
      <ol className={styles.rank}>
        {ordered.map((day) => (
          <li key={day.index} className={styles.rankRow}>
            <span className={styles.rankKey}>{WEEKDAYS[day.index]}</span>
            <span className={styles.rankBarWrap}>
              <span className={styles.rankBar} style={{ width: `${(avg(day) / peak) * 100}%` }} />
            </span>
            <span className={styles.rankValue}>{Math.round(avg(day))}</span>
          </li>
        ))}
      </ol>
      <p className={styles.note}>
        Besucher im Schnitt je Wochentag, über die abgeschlossenen Tage des Zeitraums. Der laufende
        Tag zählt nicht mit.
      </p>
    </section>
  );
}

/** Was sich gegenüber der Vorperiode bewegt hat — in beide Richtungen. Ein
 *  Wegbruch ist so interessant wie ein Anstieg, und beide gehen in reinen
 *  Bestenlisten unter. */
function Movers({ data }: { data: StatsSummary }) {
  const { paths, referrers } = data.movers;
  if (!data.period || (paths.length === 0 && referrers.length === 0)) return null;
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Veränderungen zur Vorperiode</h2>
      <div className={styles.columns}>
        <MoverList title="Seiten" rows={paths} />
        <MoverList title="Herkunft" rows={referrers} />
      </div>
      <p className={styles.note}>
        Absolute Zahlen gegen die {NUMBER.format(data.period.days)} gemessenen Tage davor
        {data.period.days !== data.period.daysNow
          ? ` — die tragen weniger Tage als die ${NUMBER.format(data.period.daysNow)} hier, die Differenzen fallen also zu hoch aus.`
          : '.'}
      </p>
    </section>
  );
}

function MoverList({ title, rows }: { title: string; rows: Mover[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className={styles.funnelTitle}>{title}</h3>
      <ol className={styles.rank}>
        {rows.map((row) => (
          <li key={row.key} className={styles.rankRow}>
            <span className={styles.rankKey} title={row.key}>
              {row.key}
            </span>
            <span className={row.diff > 0 ? styles.moverUp : styles.moverDown}>
              {row.diff > 0 ? '+' : '−'}
              {NUMBER.format(Math.abs(row.diff))}
            </span>
            <span className={styles.rankValue}>{NUMBER.format(row.now)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Consent({ data }: { data: StatsSummary }) {
  const { consent } = data;
  const silent = consent.visitors - consent.accepted - consent.declined;
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Cookie-Dialog</h2>
      {consent.rate === null ? (
        <p className={styles.note}>Der Dialog wurde in diesem Zeitraum nicht gezählt.</p>
      ) : (
        <>
          <p className={styles.big}>{percent(consent.rate)}</p>
          <p className={styles.note}>
            der Besucher stimmen zu — {NUMBER.format(consent.accepted)} von{' '}
            {NUMBER.format(consent.visitors)}. Dazu {NUMBER.format(consent.declined)} Ablehnungen;{' '}
            {NUMBER.format(Math.max(0, silent))} antworten gar nicht. Genau die Zustimmenden sieht
            Google Analytics — alle anderen werden nur hier gezählt.
          </p>
          <p className={styles.note}>
            Der Dialog erschien {NUMBER.format(consent.shown)} Mal, also{' '}
            {consent.viewsPerVisitor === null
              ? '—'
              : consent.viewsPerVisitor.toFixed(1).replace('.', ',')}{' '}
            Mal je Besucher: er blockiert und kommt bei jedem Seitenaufruf wieder, bis jemand
            antwortet. Gegen die Einblendungen gerechnet wären es{' '}
            {consent.ratePerView === null ? '—' : percent(consent.ratePerView)} — dieselbe
            Wirklichkeit, nur durch den falschen Nenner geteilt. Grundlage sind{' '}
            {NUMBER.format(consent.days)} von {NUMBER.format(data.totals.days)} Tagen; gezählt wird
            der Dialog erst seit dem 28.08.2026.
          </p>
        </>
      )}
    </section>
  );
}

function Funnels({ data }: { data: StatsSummary }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Trichter</h2>
      <div className={styles.funnels}>
        {data.funnels.map((funnel) => {
          const start = funnel.steps[0]?.count ?? 0;
          return (
            <div key={funnel.label} className={styles.funnel}>
              <h3 className={styles.funnelTitle}>{funnel.label}</h3>
              {funnel.steps.map((step) => (
                <div key={step.key} className={styles.step}>
                  <span className={styles.stepLabel}>{labelFor(step.key)}</span>
                  <span className={styles.stepBarWrap}>
                    <span
                      className={step.count === 0 ? styles.stepBarEmpty : styles.stepBar}
                      style={{ width: start > 0 ? `${(step.count / start) * 100}%` : '0%' }}
                    />
                  </span>
                  <span className={styles.stepValue}>{NUMBER.format(step.count)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Exits({ data }: { data: StatsSummary }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Wo Besuche enden</h2>
      {data.exits.length === 0 ? (
        <p className={styles.note}>
          Für diesen Zeitraum liegen keine Fortsetzungen vor — das Feld wird erst seit dem
          28.08.2026 geschrieben.
        </p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Seite</th>
                <th scope="col">Aufrufe</th>
                <th scope="col">weiter</th>
                <th scope="col">Ende</th>
                <th scope="col">Quote</th>
              </tr>
            </thead>
            <tbody>
              {data.exits.map((row: ExitEntry) => (
                <tr key={row.key}>
                  <td className={styles.cellKey}>{row.key}</td>
                  <td className={styles.cellNum}>{NUMBER.format(row.views)}</td>
                  <td className={styles.cellNum}>{NUMBER.format(row.continued)}</td>
                  <td className={styles.cellNum}>{NUMBER.format(row.exits)}</td>
                  <td className={styles.cellNum}>{percent(row.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>
            Gerechnet über {NUMBER.format(data.exitDays)} von {NUMBER.format(data.totals.days)}{' '}
            Tagen. Ein harter Neuladen zählt nicht als Fortsetzung, die Quote ist darum eher zu
            hoch als zu niedrig.
          </p>
        </>
      )}
    </section>
  );
}

function Ranking({ title, rows, empty }: { title: string; rows: Entry[]; empty: string }) {
  const peak = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{title}</h2>
      {rows.length === 0 ? (
        <p className={styles.note}>{empty}</p>
      ) : (
        <ol className={styles.rank}>
          {rows.map((row) => (
            <li key={row.key} className={styles.rankRow}>
              <span className={styles.rankKey} title={row.key}>
                {row.key}
              </span>
              <span className={styles.rankBarWrap}>
                <span className={styles.rankBar} style={{ width: `${(row.count / peak) * 100}%` }} />
              </span>
              <span className={styles.rankValue}>{NUMBER.format(row.count)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Events({ data }: { data: StatsSummary }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Ereignisse</h2>
      {data.events.length === 0 ? (
        <p className={styles.note}>Keine Ereignisse gezählt.</p>
      ) : (
        <ol className={styles.rank}>
          {data.events.map((row) => (
            <li key={row.key} className={styles.rankRow}>
              <span className={styles.rankKey} title={row.key}>
                {labelFor(row.key)}
              </span>
              <span className={styles.rankValue}>{NUMBER.format(row.count)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
