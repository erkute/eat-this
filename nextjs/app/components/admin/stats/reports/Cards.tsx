import type { StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card, Kpi, LineChart, Tile } from '../charts';
import { NUMBER, percent } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Der Stapel und wer ihn sammelt: Karten im Katalog, Konten, Starter Packs,
 * Aufdeckungen vor Ort, Einladungen — Firestore und Sanity, nicht der Zähler.
 */
export default function Cards({ data }: { data: StatsSummary }) {
  const { accounts, deck } = data;
  if (!accounts) return <p className={styles.notice}>Konten nicht geladen.</p>;

  const days = accounts.byDay.map((d) => d.day);
  const openIndex = data.today ? days.indexOf(data.today.day) : -1;

  return (
    <>
      <div className={styles.kpis}>
        <Kpi
          label="Konten"
          value={NUMBER.format(accounts.total)}
          hint={`${NUMBER.format(accounts.newInWindow)} neu im Zeitraum`}
          spark={accounts.byDay.map((d) => d.newAccounts)}
        />
        <Kpi label="Aktiv heute" value={NUMBER.format(accounts.active.day)} hint="Token erneuert" />
        <Kpi label="Aktiv 7 Tage" value={NUMBER.format(accounts.active.week)} />
        <Kpi label="Aktiv 30 Tage" value={NUMBER.format(accounts.active.month)} />
        <Kpi
          label="Starter Packs"
          value={NUMBER.format(accounts.starterPacks.inWindow)}
          hint={`${NUMBER.format(accounts.starterPacks.total)} insgesamt`}
          spark={accounts.byDay.map((d) => d.starterPacks)}
        />
        <Kpi
          label="Vor Ort aufgedeckt"
          value={NUMBER.format(accounts.reveals.inWindow)}
          hint={`${NUMBER.format(accounts.reveals.total)} insgesamt`}
          spark={accounts.byDay.map((d) => d.reveals)}
        />
        <Kpi
          label="Einladungen"
          value={NUMBER.format(accounts.referrals.inWindow)}
          hint={`${NUMBER.format(accounts.referrals.total)} insgesamt`}
          spark={accounts.byDay.map((d) => d.referrals)}
        />
      </div>

      <Card
        title="Konten und Karten je Tag"
        span={2}
        sub="Neue Konten, eingelöste Starter Packs und vor Ort aufgedeckte Karten — aus Firestore, je Kalendertag."
      >
        {/* Zwei Reihen auf einer Skala: beides einstellige Tageszahlen, das
            passt. Umsatz oder Aufrufe gehören hier NICHT dazu (siehe LineChart). */}
        <LineChart
          days={days}
          series={[
            { label: 'Neue Konten', values: accounts.byDay.map((d) => d.newAccounts) },
            { label: 'Vor Ort aufgedeckt', values: accounts.byDay.map((d) => d.reveals) },
          ]}
          openIndex={openIndex >= 0 ? openIndex : null}
        />
      </Card>

      <Card title="Wie die Konten kommen" sub="Anmeldeweg und Nutzung, alle Konten.">
        <BarRows
          rows={[
            { key: 'google', label: 'über Google', count: accounts.google },
            { key: 'email', label: 'über Magic Link', count: accounts.email },
            { key: 'favorites', label: 'mit gespeicherten Spots', count: accounts.withFavorites },
            { key: 'starter', label: 'mit Starter Pack', count: accounts.people.withStarterPack },
            { key: 'reveal', label: 'haben vor Ort aufgedeckt', count: accounts.people.withReveal },
            { key: 'buyers', label: 'haben gekauft', count: accounts.people.buyers },
          ].map((row) => ({
            ...row,
            share: accounts.total > 0 ? percent(row.count / accounts.total, 0) : '',
          }))}
          empty="Keine Konten."
        />
        <p className={styles.note}>
          {NUMBER.format(accounts.activeInWindow)} Konten waren im Zeitraum aktiv. „Aktiv“ heißt:
          die App hat ein Token erneuert — die Seite war offen.
        </p>
      </Card>

      {deck ? (
        <>
          <Card title="Der Stapel" sub="Was es heute zu sammeln gibt — aus Sanity, live.">
            <div className={styles.dayTiles}>
              <Tile label="Karten" value={NUMBER.format(deck.cards)} />
              <Tile
                label="offen ohne Konto"
                value={`${NUMBER.format(deck.publicCards)} / ${NUMBER.format(deck.freeCards)}`}
              />
              <Tile label="Spots" value={NUMBER.format(deck.spots)} />
              <Tile
                label="Starter Pack"
                value={`${deck.starterCards} · ${deck.starterFaceUp} offen`}
              />
            </div>
            <p className={styles.note}>
              Ohne Konto {deck.freeCards} Karten offen, mit Konto{' '}
              {deck.freeCards + deck.starterCards} sichtbar ({deck.freeCards + deck.starterFaceUp}{' '}
              offen, {deck.starterCards - deck.starterFaceUp} als Rücken). Bei{' '}
              {NUMBER.format(deck.cards)} Karten im Stapel bleiben{' '}
              {NUMBER.format(Math.max(0, deck.cards - deck.freeCards - deck.starterCards))} für die
              Packs.
            </p>
          </Card>

          <Card
            title="Karten je Kategorie"
            span={2}
            sub="Ein Pack verkauft die Karten seiner Kategorie; ohne Karte ist es nicht käuflich. Karten sind mehrfachkategorisiert, die Spalte summiert sich darum nicht zur Stapelgröße."
          >
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Kategorie</th>
                    <th scope="col">Karten</th>
                    <th scope="col">Spots</th>
                    <th scope="col">Karten je Spot</th>
                    <th scope="col">Pack</th>
                  </tr>
                </thead>
                <tbody>
                  {deck.byCategory.map((c) => (
                    <tr key={c.slug}>
                      <td className={styles.cellKey}>{c.name}</td>
                      <td className={styles.cellNum}>{NUMBER.format(c.cards)}</td>
                      <td className={styles.cellNum}>{NUMBER.format(c.spots)}</td>
                      <td className={styles.cellNum}>
                        {c.spots > 0 ? percent(c.cards / c.spots, 0) : '—'}
                      </td>
                      <td className={styles.cellNum}>
                        {c.packId === null ? (
                          <span className={styles.pill}>kein Pack</span>
                        ) : c.sellable ? (
                          <span className={styles.pillGreen}>käuflich</span>
                        ) : (
                          <span className={styles.pillRed}>leer</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <p className={styles.notice}>Der Katalog aus Sanity ließ sich nicht laden.</p>
      )}
    </>
  );
}
