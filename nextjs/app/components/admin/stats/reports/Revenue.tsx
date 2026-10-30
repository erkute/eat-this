import type { StatsSummary } from '@/lib/admin/stats.server';
import { BarRows, Card, Kpi, LineChart } from '../charts';
import { NUMBER, euro, labelFor, decimal } from '../format';
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
      <p className={styles.notice}>
        Käufe sind gespeicherte Freischaltungen mit Stripe-Beleg. Geldbeträge sind zum aktuellen
        Katalogpreis berechnet; Rabatte, Preisänderungen und Erstattungen sind darin nicht
        berücksichtigt.
      </p>
      <div className={styles.kpis}>
        <Kpi
          label="Katalogwert im Zeitraum"
          value={euro(accounts.revenue.inWindowCents)}
          spark={accounts.byDay.map((d) => d.revenueCents)}
        />
        <Kpi
          label="Katalogwert insgesamt"
          value={euro(accounts.revenue.totalCents)}
          hint="Aktueller Listenpreis · seit Bestehen"
        />
        <Kpi
          label="Käufe"
          value={NUMBER.format(accounts.purchases.inWindow)}
          hint={`${NUMBER.format(accounts.purchases.total)} insgesamt`}
          spark={accounts.byDay.map((d) => d.purchases)}
        />
        <Kpi
          label="Käufer"
          value={NUMBER.format(accounts.people.buyers)}
          hint="Konten mit Kauf · seit Bestehen"
        />
        <Kpi label="Ø Katalogwert je Kauf" value={euro(perPurchase)} hint="Seit Bestehen" />
        <Kpi
          label="Käufe je 100 Tagesbesucher"
          value={
            visitRate?.rate === null || visitRate === undefined
              ? '—'
              : decimal(visitRate.rate * 100, 2)
          }
          hint="Ereignisse im Zeitraum"
        />
        <Kpi
          label="Käufe je 100 Checkout-Starts"
          value={
            checkoutRate?.rate === null || checkoutRate === undefined
              ? '—'
              : decimal(checkoutRate.rate * 100, 1)
          }
          hint={`${NUMBER.format(checkoutRate?.now ?? 0)} Kauf-Ereignisse / ${NUMBER.format(checkoutRate?.base ?? 0)} Starts`}
        />
      </div>

      <Card
        title="Katalogwert je Tag"
        span={2}
        sub="Aus den Entitlements mit Stripe-Sitzung, bewertet zum Katalogpreis."
      >
        {accounts.revenue.inWindowCents === 0 ? (
          <p className={styles.empty}>Kein Kauf im Zeitraum.</p>
        ) : (
          <LineChart
            days={days}
            series={[{ label: 'Katalogwert', values: accounts.byDay.map((d) => d.revenueCents) }]}
            openIndex={openIndex >= 0 ? openIndex : null}
            format={(v) => euro(v)}
          />
        )}
      </Card>

      <Card title="Nach Pack" sub="Alle Käufe seit Bestehen.">
        {accounts.purchases.byPack.length === 0 ? (
          <p className={styles.empty}>Noch kein Kauf.</p>
        ) : (
          <div
            className={styles.scroll}
            tabIndex={0}
            role="region"
            aria-label="Tabelle horizontal scrollen"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Pack</th>
                  <th scope="col">Käufe</th>
                  <th scope="col">Katalogwert</th>
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
        title="Gespeicherte Checkout-Versuche"
        sub="Je Konto und Pack bleibt nur der letzte Versuch gespeichert. Angezeigt werden Datensätze mit Anlagedatum im Zeitraum; frühere Versuche können überschrieben sein. Gast-Checkouts fehlen hier."
      >
        <BarRows
          rows={[
            { key: 'all', label: 'gespeichert', count: accounts.checkouts.inWindow },
            { key: 'completed', label: 'abgeschlossen', count: accounts.checkouts.completed },
            { key: 'open', label: 'ohne gemeldeten Abschluss', count: accounts.checkouts.open },
          ]}
          empty="Keine gespeicherten Versuche im Zeitraum."
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
