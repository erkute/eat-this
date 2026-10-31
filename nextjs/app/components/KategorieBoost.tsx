import type { CSSProperties } from 'react';
import Image from '@/app/components/SiteImage';
import { Link } from '@/i18n/navigation';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt, categoryTile } from '@/lib/categoryArt';
import { getPackContents } from '@/lib/sanity.server';
import styles from './KategorieBoost.module.css';

interface Props {
  categorySlug: string;
  categoryName: string;
  locale: 'de' | 'en';
}

const CARD_BACK = '/pics/card-back.webp?v=20261028';

/**
 * Das Pack der Kategorie als Plakat, gebaut wie die Pack-Werbung am Ende des
 * Spot-Details der Map: das Pack steht auf der Oberkante und ragt darüber
 * hinaus, zwei verdeckte Must Eat Karten fächern beim Hereinscrollen dahinter
 * auf. Der Grund trägt die Farbe des Packs, wie das rote Papier beim Starter
 * Pack.
 */
export default async function KategorieBoost({ categorySlug, categoryName, locale }: Props) {
  const de = locale === 'de';
  const pack = Object.values(CATALOG).find((p) => p.slug === categorySlug);
  if (!pack) return null;
  const contents = (await getPackContents()).byCategory[categorySlug];
  /* Ein Pack ohne Karte hat hier nichts zu suchen: der Kasten wirbt sonst für
     eine leere Schachtel, und /packs blendet ihn aus demselben Grund aus. */
  if (contents && contents.mustEats === 0) return null;
  const image = categoryArt(categorySlug);
  const tile = categoryTile(categorySlug);

  return (
    <aside
      className={styles.boost}
      aria-label={`${categoryName} Pack`}
      data-ink={tile?.ink || undefined}
      style={tile ? ({ '--boost-tile': tile.tile } as CSSProperties) : undefined}
    >
      {image && (
        <div className={styles.stage} aria-hidden="true">
          {[-1, 1].map((fan) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={fan} src={CARD_BACK} alt="" loading="lazy" className={styles.card}
              style={{ '--fan': fan } as CSSProperties} />
          ))}
          <Image
            src={image}
            alt=""
            width={420}
            height={630}
            sizes="160px"
            className={styles.pack}
            data-discovery-pack
          />
        </div>
      )}
      <p className={styles.kicker}>{de ? 'Der passende Booster' : 'The matching booster'}</p>
      <h2 className={styles.title}>{categoryName} Pack</h2>
      <p className={styles.spectrum}>{pack.spectrum[locale]}</p>
      {/* Ein Ausgang, ein Knopf. Der Preis steht erst auf der Pack-Seite. */}
      <Link href={`/pack/${categorySlug}`} className={`et-btn et-btn-lg ${styles.cta}`}>
        {de ? 'Pack ansehen' : 'View pack'}
      </Link>
    </aside>
  );
}
