import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';
import { Link } from '@/i18n/navigation';
import type { MapMustEat } from '@/lib/types';
import styles from './PackPreview.module.css';

export default function PackPreviewCard({
  card,
  locale,
}: {
  card: MapMustEat;
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  const description = de ? card.description : card.descriptionEn;
  return (
    <section
      className={styles.preview}
      aria-label={de ? 'So sehen deine Must Eats aus' : 'Meet your Must Eats'}
    >
      <Link
        href={{ pathname: '/map', query: { me: card._id } }}
        className={styles.cardLink}
        aria-label={`${card.dish} – ${de ? 'auf der Map ansehen' : 'view on the map'}`}
      >
        {/* The protected image route already resizes its public card art. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mustEatCardSrc(card.image, 440)}
          srcSet={mustEatCardSrcSet(card.image)}
          sizes="(max-width: 699px) 170px, 200px"
          width={760}
          height={1044}
          alt={card.dish}
          loading="lazy"
          decoding="async"
          className={styles.card}
        />
      </Link>
      <div>
        <p className={`et-label ${styles.kicker}`}>
          {de ? 'So sehen deine Must Eats aus' : 'Meet your Must Eats'}
        </p>
        <p className={styles.spot}>{card.restaurant.name}</p>
        <h2 className={styles.title}>{card.dish}</h2>
        {description && <p className={styles.description}>{description}</p>}
        <p className={styles.note}>
          {de
            ? 'Diese Karte kannst du schon ansehen. Mit einem Pack schaltest du weitere Empfehlungen frei.'
            : 'You can already view this card. Unlock more recommendations with a pack.'}
        </p>
      </div>
    </section>
  );
}
