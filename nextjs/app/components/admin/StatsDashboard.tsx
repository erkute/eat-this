'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase/config';
import {
  type Delta,
  type Entry,
  type ExitEntry,
  type Funnel as FunnelData,
  type Mover,
  type StatsSummary,
} from '@/lib/admin/stats.server';
import type { SearchRow, SearchSummary } from '@/lib/admin/searchConsole';
import { hasNoCountCookie, NO_COUNT_COOKIE } from '@/lib/analytics/noCount';
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

/**
 * Der Tag, seit dem der Bot-Filter wirklich greift. Bis dahin ersetzte die
 * App-Hosting-Edge den User-Agent, und Bingbot, Baidu-Render und ein
 * Azure-Crawler mit Lighthouse-Kennung zaehlten als Besucher — am 01.09.2026
 * rund ein Drittel aller Beacons (Edge-Log). Seitdem schickt der Browser den
 * User-Agent im Beacon mit (lib/analytics.ts). Muss auf den Rollout-Tag
 * zeigen, sonst luegt die Fussnote.
 */
const BOT_FILTER_LIVE_SINCE = '02.09.2026';

/**
 * Der zweite Schnitt: bis hierher zaehlte die EIGENE Lighthouse-CI mit. Sie
 * laeuft bei jedem Push und PR nach main, drei Durchgaenge auf fuenf Seiten,
 * und Lighthouse 12 sendet seinen Telefon-UA ohne die Kennung
 * „Chrome-Lighthouse" — der Filter sah einen normalen Browser (belegt am
 * 03.09.2026, lib/analytics/botFilter.ts). Muss auf den Rollout-Tag des
 * Filters zeigen.
 */
const LIGHTHOUSE_FILTER_LIVE_SINCE = '04.09.2026';

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
  login: 'Angemeldet (bestehendes Konto)',
  signed_in: 'Angemeldet oder Konto angelegt',
  visitors: 'Besucher',
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
  // GA-Ecommerce-Name: feuert je Pack-Angebot, sobald es im Bild ist — auf
  // /packs also mehrfach je Aufruf. Nicht der Spot, wie es vorher hiess.
  view_item: 'Pack-Angebot gesehen',
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
        <p className={styles.sub}>Alle Besuche, ohne Cookie-Zustimmung.</p>
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
        <NoCountToggle />
      </header>

      {error && <p className={styles.error}>{error}</p>}
      {loading && !data && <p className={styles.notice}>Wird geladen …</p>}

      {data && (
        <div className={loading ? styles.bodyStale : styles.body}>
          <Yesterday data={data} />
          <Headline data={data} />
          <AccountsCard data={data} />
          <SearchCard data={data} />
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
  // Ohne den laufenden Tag: der stand morgens als ganzer Tag im Nenner und
  // drueckte den Schnitt, ohne dass irgendwer weggeblieben waere.
  const closedVisitors = totals.visitors - (data.today?.visitors ?? 0);
  const perDay = totals.closedDays > 0 ? Math.round(closedVisitors / totals.closedDays) : 0;
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
        <Tile value={NUMBER.format(perDay)} label="Besucher je vollem Tag" />
        <Tile value={NUMBER.format(totals.days)} label="Tage erfasst" />
      </section>
      {period && (
        <p className={styles.note}>
          Pfeile: Schnitt je vollem Tag gegen die Periode davor. Bis {BOT_FILTER_LIVE_SINCE} zählten
          Bots mit, bis {LIGHTHOUSE_FILTER_LIVE_SINCE} die eigene Lighthouse-CI.
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
        Besucher, {NUMBER.format(latest.day.pageviews)} Seitenaufrufe.
      </p>
      <div className={styles.changes}>
        {latest.vsPrevDay && <Change delta={latest.vsPrevDay.visitors} label="zum Vortag" />}
        {latest.vsSameWeekday && (
          <Change delta={latest.vsSameWeekday.visitors} label="zum selben Wochentag" />
        )}
      </div>
      {today && (
        <p className={styles.note}>
          Heute bisher {NUMBER.format(today.visitors)} Besucher, {NUMBER.format(today.pageviews)}{' '}
          Aufrufe.
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
      <p className={styles.note}>Besucher im Schnitt je Wochentag.</p>
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
            {NUMBER.format(consent.visitors)}, {NUMBER.format(consent.declined)} lehnen ab,{' '}
            {NUMBER.format(Math.max(0, silent))} antworten nicht. Nur die Zustimmenden sieht Google
            Analytics.
          </p>
        </>
      )}
    </section>
  );
}

function Funnels({ data }: { data: StatsSummary }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Die Reise</h2>
      <div className={styles.funnels}>
        {data.funnels.map((funnel) => (
          <FunnelColumn key={funnel.label} funnel={funnel} visitors={data.totals.visitors} />
        ))}
      </div>
      <p className={styles.note}>Ereignisse, rechte Spalte je 100 Besucher.</p>
    </section>
  );
}

/** Eine Trichter-Spalte. Der Balken hängt an den Besuchern, nicht an der
 *  ersten Stufe — sonst sähe „Konto" mit 100 Anmeldeseiten so voll aus wie
 *  die Reise mit 1.400 Besuchern. */
function FunnelColumn({ funnel, visitors }: { funnel: FunnelData; visitors: number }) {
  return (
    <div className={styles.funnel}>
      <h3 className={styles.funnelTitle}>{funnel.label}</h3>
      {funnel.steps.map((step) => {
        // Bewusst KEINE Quote gegen die Stufe davor: die Reise ist keine
        // strenge Kette. /packs feuert `view_item` je Pack an jeden, der die
        // Seite direkt oeffnet — gegen „Pack geklickt" gerechnet stuenden
        // dort 4.500 %. Der einzige Nenner, der ueberall stimmt, sind die
        // Besucher.
        const share = visitors > 0 ? step.count / visitors : 0;
        return (
          <div key={step.key} className={styles.step}>
            <span className={styles.stepLabel} title={labelFor(step.key)}>
              {labelFor(step.key)}
            </span>
            <span className={styles.stepBarWrap}>
              <span
                className={step.count === 0 ? styles.stepBarEmpty : styles.stepBar}
                style={{ width: `${Math.min(1, share) * 100}%` }}
              />
            </span>
            <span className={styles.stepValue}>{NUMBER.format(step.count)}</span>
            <span className={styles.stepShare} title="je 100 Besucher">
              {step.key === 'visitors' ? '' : NUMBER.format(Math.round(share * 100))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Konten sind eine andere Welt als Besucher: Firebase Auth statt Zähler,
 * Personen statt Ereignisse. Deshalb eine eigene Karte mit eigener Quelle
 * statt einer Kachel zwischen den Besucherzahlen.
 */
function AccountsCard({ data }: { data: StatsSummary }) {
  const a = data.accounts;
  if (!a) return null;
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Konten</h2>
      <h3 className={styles.funnelTitle}>Aktive Nutzer</h3>
      <section className={styles.tiles}>
        <Tile value={NUMBER.format(a.active.day)} label="Heute" />
        <Tile value={NUMBER.format(a.active.week)} label="Letzte 7 Tage" />
        <Tile value={NUMBER.format(a.active.month)} label="Letzte 30 Tage" />
      </section>
      <h3 className={styles.funnelTitle}>Bestand</h3>
      <section className={styles.tiles}>
        <Tile value={NUMBER.format(a.total)} label="Konten gesamt" />
        <Tile value={NUMBER.format(a.newInWindow)} label="Neu im Zeitraum" />
        <Tile value={NUMBER.format(a.activeInWindow)} label="Aktiv im Zeitraum" />
        <Tile
          value={NUMBER.format(a.purchases.inWindow)}
          label={`Käufe im Zeitraum · ${NUMBER.format(a.purchases.total)} insgesamt`}
        />
      </section>
      <p className={styles.note}>
        {NUMBER.format(a.google)} über Google, {NUMBER.format(a.email)} über Magic Link,{' '}
        {NUMBER.format(a.withFavorites)} mit gespeicherten Spots. {NUMBER.format(a.checkouts.inWindow)}{' '}
        Stripe-Sitzungen im Zeitraum, {NUMBER.format(a.checkouts.open)} offen.
      </p>
    </section>
  );
}

/** Prozent mit einer Stelle, für CTR — „0,6 %" statt „0.0056". */
function ctr(value: number): string {
  return percent(value);
}

function position(value: number): string {
  return value > 0 ? value.toFixed(1).replace('.', ',') : '—';
}

/**
 * Die Google-Suche. Andere Quelle, andere Menschen: die Search Console zählt
 * Suchergebnisse, nicht Besuche, und ihre Zahlen kommen zwei bis drei Tage
 * nach dem Tag. Deshalb eine eigene Karte mit eigener Beschriftung — und mit
 * einem ehrlichen Zustand, wenn der Zugang fehlt, statt einer leeren Tabelle.
 */
function SearchCard({ data }: { data: StatsSummary }) {
  const search = data.search;
  if (!search) return null;
  if (!search.ok) {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Google-Suche</h2>
        {search.reason === 'no-access' ? (
          <p className={styles.note}>
            Kein Zugriff. In der Search Console unter „Nutzer und Berechtigungen“{' '}
            <code className={styles.code}>{search.identity ?? '(unbekannt)'}</code> als Nutzer
            eintragen.
          </p>
        ) : (
          <p className={styles.note}>Search Console antwortet nicht: {search.message}</p>
        )}
      </section>
    );
  }
  const s: SearchSummary = search.data;
  const { totals, before } = s;
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Google-Suche</h2>
      <section className={styles.tiles}>
        <Tile
          value={NUMBER.format(totals.clicks)}
          label="Klicks"
          delta={before ? { now: totals.clicks, before: before.clicks, change: change(totals.clicks, before.clicks) } : null}
        />
        <Tile
          value={NUMBER.format(totals.impressions)}
          label="Impressionen"
          delta={
            before
              ? {
                  now: totals.impressions,
                  before: before.impressions,
                  change: change(totals.impressions, before.impressions),
                }
              : null
          }
        />
        <Tile value={ctr(totals.ctr)} label={before ? `Klickrate · vorher ${ctr(before.ctr)}` : 'Klickrate'} />
        <Tile
          value={position(totals.position)}
          label={before ? `Position · vorher ${position(before.position)}` : 'Position'}
        />
      </section>
      <p className={styles.note}>
        {shortDay(s.range.start)} bis {shortDay(s.range.end)}, Pfeile gegen die{' '}
        {NUMBER.format(s.range.days)} Tage davor. Die letzten zwei bis drei Tage liefert Google
        nachträglich.
      </p>
      <Trend
        title="Klicks aus der Suche"
        points={s.days.map((d) => ({ day: d.day, value: d.clicks }))}
      />
      <div className={styles.columns}>
        <SearchTable
          title="Welche Suche funktioniert"
          rows={s.queries}
          empty="Noch keine Klicks aus der Suche."
        />
        <SearchTable title="Welche Seite gefunden wird" rows={s.pages} empty="Noch keine Klicks." />
      </div>
      <SearchTable
        title="Fast oben — oft gezeigt, selten geklickt"
        rows={s.opportunities}
        empty="Nichts zwischen Position 4 und 20 mit nennenswerten Impressionen."
      />
      <p className={styles.note}>Position 4 bis 20, mindestens 30 Impressionen.</p>
    </section>
  );
}

function change(now: number, before: number): number | null {
  return before > 0 ? (now - before) / before : null;
}

function SearchTable({ title, rows, empty }: { title: string; rows: SearchRow[]; empty: string }) {
  return (
    <div>
      <h3 className={styles.funnelTitle}>{title}</h3>
      {rows.length === 0 ? (
        <p className={styles.note}>{empty}</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Suche</th>
                <th scope="col">Klicks</th>
                <th scope="col">Impr.</th>
                <th scope="col">CTR</th>
                <th scope="col">Pos.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className={styles.cellKey} title={row.key}>
                    {row.key}
                  </td>
                  <td className={styles.cellNum}>{NUMBER.format(row.clicks)}</td>
                  <td className={styles.cellNum}>{NUMBER.format(row.impressions)}</td>
                  <td className={styles.cellNum}>{ctr(row.ctr)}</td>
                  <td className={styles.cellNum}>{position(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Der eigene Browser gehört nicht in die Zahlen. Das Cookie liest die
 * Zähl-Route wie GPC; gesetzt wird es nur hier, auf Knopfdruck — der Zähler
 * selbst bleibt speicherfrei (lib/analytics/noCount.ts).
 */
function NoCountToggle() {
  const [off, setOff] = useState<boolean | null>(null);
  useEffect(() => {
    setOff(hasNoCountCookie(document.cookie));
  }, []);
  if (off === null) return null;
  const toggle = () => {
    // Kein `Secure`: localhost ist http und verschluckt das Cookie sonst still.
    document.cookie = off
      ? `${NO_COUNT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
      : `${NO_COUNT_COOKIE}=1; Max-Age=31536000; Path=/; SameSite=Lax`;
    setOff(!off);
  };
  return (
    <p className={styles.optOut}>
      {off
        ? 'Dieser Browser wird nicht mitgezählt.'
        : 'Dieser Browser zählt mit — jeder eigene Klick landet in den Zahlen.'}{' '}
      <button type="button" className={styles.optOutButton} onClick={toggle}>
        {off ? 'Wieder mitzählen' : 'Nicht mitzählen'}
      </button>
    </p>
  );
}

function Exits({ data }: { data: StatsSummary }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Wo Besuche enden</h2>
      {data.exits.length === 0 ? (
        <p className={styles.note}>Für diesen Zeitraum nicht erfasst.</p>
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
            Über {NUMBER.format(data.exitDays)} von {NUMBER.format(data.totals.days)} Tagen.
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
