import type { StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card, Kpi, LineChart } from '../charts';
import { NUMBER, euro, labelFor, percent } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Was die Packs einbringen. Umsatz aus dem Katalogpreis des gekauften Packs,
 * Käufe aus den Entitlements mit Stripe-Sitzung, Checkouts aus den
 * Versuchen — plus die Pack-Stufe des Trichters.
 */
export default function Revenue({ data }: { data: StatsSummary }) {
  const { accounts } = data;
  if (!accounts) return <p className={styles.notice}>Konten nicht geladen.</p>;

  const packs = data.funnel.stages.find((s) => s.key === 'packs');
  const checkoutRate = data.funnel.rates.find((r) => r.key === 'checkout_purchase');
  const visitRate = data.funnel.rates.find((r) => r.key === 'visit_purchase');
  const perPurchase =
    accounts.purchases.total > 0 ? accounts.revenue.totalCents / accounts.purchases.total : 0;
  const days = accounts.byDay.map((d) => d.day);
  const openIndex = data.today ? days.indexOf(data.today.day) : -1;

  return (
    <>
      <div className={styles.kpis}>
        <Kpi
          label="Umsatz im Zeitraum"
          value={euro(accounts.revenue.inWindowCents)}
          spark={accounts.byDay.map((d) => d.revenueCents)}
        />
        <Kpi
          label="Umsatz insgesamt"
          value={euro(accounts.revenue.totalCents)}
          hint="brutto, seit Bestehen"
        />
        <Kpi
          label="Käufe"
          value={NUMBER.format(accounts.purchases.inWindow)}
          hint={`${NUMBER.format(accounts.purchases.total)} insgesamt`}
          spark={accounts.byDay.map((d) => d.purchases)}
        />
        <Kpi label="Käufer" value={NUMBER.format(accounts.people.buyers)} hint="Konten mit Kauf" />
        <Kpi label="Ø je Kauf" value={euro(perPurchase)} />
        <Kpi
          label="Besucher → Kauf"
          value={
            visitRate?.rate === null || visitRate === undefined ? '—' : percent(visitRate.rate, 2)
          }
          hint="Ereignisse im Zeitraum"
        />
        <Kpi
          label="Checkout → Kauf"
          value={
            checkoutRate?.rate === null || checkoutRate === undefined
              ? '—'
              : percent(checkoutRate.rate, 0)
          }
          hint={`${NUMBER.format(checkoutRate?.now ?? 0)} von ${NUMBER.format(checkoutRate?.base ?? 0)}`}
        />
      </div>

      <Card
        title="Umsatz je Tag"
        span={2}
        sub="Aus den Entitlements mit Stripe-Sitzung, bewertet zum Katalogpreis."
      >
        {accounts.revenue.inWindowCents === 0 ? (
          <p className={styles.empty}>Kein Kauf im Zeitraum.</p>
        ) : (
          <LineChart
            days={days}
            series={[{ label: 'Umsatz', values: accounts.byDay.map((d) => d.revenueCents) }]}
            openIndex={openIndex >= 0 ? openIndex : null}
            format={(v) => euro(v)}
          />
        )}
      </Card>

      <Card title="Nach Pack" sub="Alle Käufe seit Bestehen.">
        {accounts.purchases.byPack.length === 0 ? (
          <p className={styles.empty}>Noch kein Kauf.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Pack</th>
                  <th scope="col">Käufe</th>
                  <th scope="col">Umsatz</th>
                </tr>
              </thead>
              <tbody>
                {accounts.purchases.byPack.map((p) => (
                  <tr key={p.packId}>
                    <td className={styles.cellKey}>{p.name}</td>
                    <td className={styles.cellNum}>{NUMBER.format(p.count)}</td>
                    <td className={styles.cellNum}>{euro(p.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Stripe-Sitzungen im Zeitraum"
        sub="Jeder Klick auf „Kaufen“ legt eine Sitzung an; „offen“ heißt: Stripe hat keinen Abschluss gemeldet."
      >
        <BarRows
          rows={[
            { key: 'all', label: 'angelegt', count: accounts.checkouts.inWindow },
            { key: 'completed', label: 'abgeschlossen', count: accounts.checkouts.completed },
            { key: 'open', label: 'offen geblieben', count: accounts.checkouts.open },
          ]}
          empty="Keine Sitzungen."
        />
      </Card>

      {packs && (
        <Card title="Die Pack-Stufe" sub="Ereignisse im Zeitraum, kleine Zahl je 100 Besucher.">
          <BarRows
            rows={packs.steps.map((s) => ({
              key: s.key,
              label: labelFor(s.key),
              count: s.count,
              share: data.totals.visitors > 0 ? NUMBER.format(Math.round(s.share * 100)) : '',
            }))}
            empty="Nichts gezählt."
          />
        </Card>
      )}
    </>
  );
}
