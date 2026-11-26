import { formatPackPrice } from '@/lib/pack/packDetail';
import styles from './PackPrice.module.css';

/** Der Preis über dem Kaufknopf: groß als Zahl, darunter die Zahlungsart. */
export default function PackPrice({ amountCents, locale }: { amountCents: number; locale: 'de' | 'en' }) {
  return (
    <p className={styles.price}>
      <span className={styles.amount}>{formatPackPrice(amountCents)}</span>
      <span className={styles.note}>
        {locale === 'de' ? 'Einmalzahlung, kein Abo' : 'One-time payment, no subscription'}
      </span>
    </p>
  );
}
