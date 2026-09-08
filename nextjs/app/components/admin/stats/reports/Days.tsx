import { dayBefore, type DaySummary, type StatsSummary } from '@/lib/admin/stats.server';
import type { SearchDayDetail, SearchRow } from '@/lib/admin/searchConsole';
import { BarRows, Card, Change, ExitTable, Tile } from '../charts';
import { NUMBER, dayTitle, decimal, euro, labelFor, longDay, percent, position } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Zwei Tage nebeneinander, ganz ausgebreitet: der laufende und der jüngste
 * abgeschlossene. Dazu die Google-Suche des frischesten Tages, den die
 * Search Console hat — der hinkt zwei bis drei Tage nach, und genau das
 * steht dran.
 */
export default function Days({ data }: { data: StatsSummary }) {
  const { today, latest } = data.dayDetails;
  const search = data.search?.ok ? data.search.data : null;
  // „Gestern" heisst der Bericht; der juengste abgeschlossene Tag ist es nur,
  // wenn gestern ein Dokument hat. Sonst steht dran, was wirklich gezeigt wird.
  const yesterday = data.range.today ? dayBefore(data.range.today) : null;
  const latestIsNotYesterday = Boolean(latest && yesterday && latest.day !== yesterday);

  return (
    <>
      {!today && !latest && <p className={styles.notice}>Keine Tage im Zeitraum.</p>}
      <div className={styles.dayCols}>
        {today && <DayColumn day={today} open />}
        {latest && <DayColumn day={latest} open={false} />}
      </div>
      {!today && data.range.includesToday === false && (
        <p className={styles.notice}>
          Der Zeitraum endet am {longDay(data.range.end)} — „heute“ liegt außerhalb. Gezeigt wird
          der letzte Tag des Zeitraums.
        </p>
      )}
      {latestIsNotYesterday && data.range.includesToday && latest && (
        <p className={styles.notice}>
          Für gestern liegen keine Zahlen vor — gezeigt wird der jüngste abgeschlossene Tag,{' '}
          {longDay(latest.day)}.
        </p>
      )}

      {search && (
        <Card
          title="Google-Suche: der frischeste Tag"
          span={3}
          sub="Die Search Console liefert zwei bis drei Tage nach; das hier ist der jüngste Tag mit Zahlen, daneben der Tag davor."
        >
          {search.latestDay ? (
            <div className={styles.split}>
              <SearchDay detail={search.latestDay} />
              {search.previousDay && <SearchDay detail={search.previousDay} />}
            </div>
          ) : (
            <p className={styles.empty}>Google hat für die letzten Tage noch nichts geliefert.</p>
          )}
        </Card>
      )}
    </>
  );
}

/** Die Kacheln unter „Der Weg" — eine Auswahl aus dem Trichter des Tages, in
 *  seiner Reihenfolge. Die Zahlen kommen aus `day.funnel`, nicht aus einer
 *  zweiten Rechnung; `signed_in` etwa gibt es nur dort. */
const DAY_STEPS = [
  'map_opened',
  'restaurant_opened',
  'must_eat_opened',
  'must_eat_reveal_login_required',
  'login_view',
  'signed_in',
  'sign_up',
  'starter_pack_granted',
  'must_eat_reveal_unlocked',
  'must_eat_reveal_too_far',
  'begin_checkout',
  'purchase',
];

function DayColumn({ day, open }: { day: DaySummary; open: boolean }) {
  const steps = new Map(day.funnel.stages.flatMap((s) => s.steps).map((s) => [s.key, s.count]));
  return (
    <section className={styles.dayCol} aria-label={dayTitle(day.day)}>
      <header className={styles.dayHead}>
        <h2 className={styles.dayName}>{dayTitle(day.day)}</h2>
        <span className={open ? styles.pillYellow : styles.pill}>
          {open ? 'läuft noch' : 'abgeschlossen'}
        </span>
      </header>

      <div>
        <p className={styles.big}>
          {NUMBER.format(day.visitors)}
          <span className={styles.bigUnit}>Besucher</span>
        </p>
        <p className={styles.note}>
          {NUMBER.format(day.pageviews)} Seitenaufrufe
          {day.visitors > 0 && `, ${decimal(day.pageviews / day.visitors)} je Besucher`}.
        </p>
        <div className={styles.changes}>
          {day.vsPrevDay && <Change delta={day.vsPrevDay.visitors} label="zum Vortag" />}
          {day.vsSameWeekday && (
            <Change delta={day.vsSameWeekday.visitors} label="zum selben Wochentag" />
          )}
        </div>
        {open && (
          <p className={styles.note}>
            Ein laufender Tag gegen ganze Tage — die Pfeile werden im Lauf des Tages ehrlicher.
          </p>
        )}
      </div>

      <div>
        <h3 className={styles.subTitle}>Der Weg</h3>
        <div className={styles.dayTiles}>
          {DAY_STEPS.map((key) => (
            <Tile key={key} label={labelFor(key)} value={NUMBER.format(steps.get(key) ?? 0)} />
          ))}
        </div>
      </div>

      {day.people && (
        <div>
          <h3 className={styles.subTitle}>Aus Firestore</h3>
          <div className={styles.dayTiles}>
            <Tile label="Neue Konten" value={NUMBER.format(day.people.newAccounts)} />
            <Tile label="Starter Packs" value={NUMBER.format(day.people.starterPacks)} />
            <Tile label="Karten aufgedeckt" value={NUMBER.format(day.people.reveals)} />
            <Tile label="Einladungen" value={NUMBER.format(day.people.referrals)} />
            <Tile label="Käufe" value={NUMBER.format(day.people.purchases)} />
            <Tile label="Umsatz" value={euro(day.people.revenueCents)} />
          </div>
        </div>
      )}

      <div>
        <h3 className={styles.subTitle}>Einstiegsseiten</h3>
        <BarRows rows={day.entryPaths} empty="Noch nicht erfasst." />
      </div>

      <div>
        <h3 className={styles.subTitle}>Meistgesehen</h3>
        <BarRows rows={day.paths} empty="Nichts gezählt." />
      </div>

      <div>
        <h3 className={styles.subTitle}>Herkunft</h3>
        <BarRows rows={day.referrers} empty="Keine externen Verweise." />
      </div>

      <div>
        <h3 className={styles.subTitle}>Wo Besuche enden</h3>
        {day.hasExits ? (
          <ExitTable rows={day.exits} compact />
        ) : (
          <p className={styles.empty}>Für diesen Tag nicht erfasst.</p>
        )}
      </div>

      <div>
        <h3 className={styles.subTitle}>Alle Ereignisse</h3>
        <BarRows
          rows={day.events.map((e) => ({ key: e.key, label: labelFor(e.key), count: e.count }))}
          empty="Keine Ereignisse gezählt."
        />
      </div>
    </section>
  );
}

function SearchDay({ detail }: { detail: SearchDayDetail }) {
  return (
    <div className={styles.stack}>
      <div>
        <h3 className={styles.subTitle}>{dayTitle(detail.day)}</h3>
        <div className={styles.dayTiles}>
          <Tile label="Klicks" value={NUMBER.format(detail.totals.clicks)} />
          <Tile label="Impressionen" value={NUMBER.format(detail.totals.impressions)} />
          <Tile label="Klickrate" value={percent(detail.totals.ctr)} />
          <Tile label="Position" value={position(detail.totals.position)} />
        </div>
      </div>
      <div>
        <h3 className={styles.subTitle}>Suchbegriffe des Tages</h3>
        <SearchRows rows={detail.queries} empty="Keine Anfragen mit Klicks an diesem Tag." />
      </div>
      <div>
        <h3 className={styles.subTitle}>Gefundene Seiten</h3>
        <SearchRows rows={detail.pages} empty="Keine Seiten mit Klicks an diesem Tag." />
      </div>
    </div>
  );
}

export function SearchRows({ rows, empty }: { rows: SearchRow[]; empty: string }) {
  if (rows.length === 0) return <p className={styles.empty}>{empty}</p>;
  return (
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
              <td className={styles.cellNum}>{percent(row.ctr)}</td>
              <td className={styles.cellNum}>{position(row.position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
