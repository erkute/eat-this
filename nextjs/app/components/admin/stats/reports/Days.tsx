import type { DaySummary, StatsSummary } from '@/lib/admin/stats.server';
import type { SearchDayDetail, SearchRow } from '@/lib/admin/searchConsole';
import { BarRows, Card, Change } from '../charts';
import { NUMBER, dayTitle, euro, labelFor, longDay, percent, position } from '../format';
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

function tile(label: string, value: string) {
  return (
    <div key={label} className={styles.dayTile}>
      <span className={styles.dayTileValue}>{value}</span>
      <span className={styles.dayTileLabel}>{label}</span>
    </div>
  );
}

function DayColumn({ day, open }: { day: DaySummary; open: boolean }) {
  const count = (key: string): number => day.events.find((e) => e.key === key)?.count ?? 0;
  const signedIn = count('login') + count('sign_up');
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
          {day.visitors > 0 &&
            `, ${(day.pageviews / day.visitors).toFixed(1).replace('.', ',')} je Besucher`}
          .
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
          {tile('Karte geöffnet', NUMBER.format(count('map_opened')))}
          {tile('Spot geöffnet', NUMBER.format(count('restaurant_opened')))}
          {tile('Karte (Must Eat) geöffnet', NUMBER.format(count('must_eat_opened')))}
          {tile(
            'Rücken getippt ohne Konto',
            NUMBER.format(count('must_eat_reveal_login_required'))
          )}
          {tile('Anmeldeformular', NUMBER.format(count('login_view')))}
          {tile('Angemeldet', NUMBER.format(signedIn))}
          {tile('Konto angelegt', NUMBER.format(count('sign_up')))}
          {tile('Starter Pack', NUMBER.format(count('starter_pack_granted')))}
          {tile('Vor Ort aufgedeckt', NUMBER.format(count('must_eat_reveal_unlocked')))}
          {tile('Zu weit weg', NUMBER.format(count('must_eat_reveal_too_far')))}
          {tile('Kauf begonnen', NUMBER.format(count('begin_checkout')))}
          {tile('Gekauft', NUMBER.format(count('purchase')))}
        </div>
      </div>

      {day.people && (
        <div>
          <h3 className={styles.subTitle}>Aus Firestore</h3>
          <div className={styles.dayTiles}>
            {tile('Neue Konten', NUMBER.format(day.people.newAccounts))}
            {tile('Starter Packs', NUMBER.format(day.people.starterPacks))}
            {tile('Karten aufgedeckt', NUMBER.format(day.people.reveals))}
            {tile('Einladungen', NUMBER.format(day.people.referrals))}
            {tile('Käufe', NUMBER.format(day.people.purchases))}
            {tile('Umsatz', euro(day.people.revenueCents))}
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
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Seite</th>
                  <th scope="col">Aufrufe</th>
                  <th scope="col">Ende</th>
                  <th scope="col">Quote</th>
                </tr>
              </thead>
              <tbody>
                {day.exits.map((row) => (
                  <tr key={row.key}>
                    <td className={styles.cellKey}>{row.key}</td>
                    <td className={styles.cellNum}>{NUMBER.format(row.views)}</td>
                    <td className={styles.cellNum}>{NUMBER.format(row.exits)}</td>
                    <td className={styles.cellNum}>{percent(row.rate, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          {tile('Klicks', NUMBER.format(detail.totals.clicks))}
          {tile('Impressionen', NUMBER.format(detail.totals.impressions))}
          {tile('Klickrate', percent(detail.totals.ctr))}
          {tile('Position', position(detail.totals.position))}
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
