import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import { formatPackPrice } from '@/lib/pack/packDetail';
import styles from './KategorieBoost.module.css';

interface Props {
  categorySlug: string;
  categoryName: string;
  locale: 'de' | 'en';
}

export default function KategorieBoost({ categorySlug, categoryName, locale }: Props) {
  const de = locale === 'de';
  const pack = Object.values(CATALOG).find((p) => p.slug === categorySlug);
  if (!pack) return null;
  const image = categoryArt(categorySlug);
  const priceLabel = formatPackPrice(pack.amountCents);

  return (
    <aside className={styles.boost} aria-label={`${categoryName} Pack`}>
      {image && (
        <div className={styles.poster}>
          <Image
            src={image}
            alt={`${categoryName} Pack`}
            width={420}
            height={630}
            sizes="(max-width: 540px) 150px, (max-width: 839px) 220px, 150px"
            className={styles.posterImg}
            priority
          />
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.kicker}>{de ? 'Der passende Booster' : 'The matching booster'}</div>
        <h2 className={styles.title}>{categoryName} Pack</h2>
        <div className={styles.spectrum}>{pack.spectrum[locale]}</div>
        {/* Ein Ausgang, ein Knopf, Preis im Label — wie „All Berlin
            freischalten · 9,99 €" auf der All-Berlin-Tafel. Der Pfeil ist weg:
            die Fläche selbst ist die Affordanz. */}
        <Link href={`/pack/${categorySlug}`} className={styles.cta}>
          {de ? 'Pack ansehen' : 'View pack'} · {priceLabel}
        </Link>
      </div>
    </aside>
  );
}
