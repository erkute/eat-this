import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';
import { Link } from '@/i18n/navigation';
import type { MapMustEat } from '@/lib/types';
import styles from './PackPreview.module.css';

export default function PackPreviewCard({
  card,
  locale,
  personal = false,
}: {
  card: MapMustEat;
  locale: 'de' | 'en';
  personal?: boolean;
}) {
  const de = locale === 'de';
  const description = de ? card.description : card.descriptionEn;
  return (
    <section
      className={styles.preview}
      aria-label={de ? 'Ein Blick in die Karten' : 'A look inside the cards'}
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
          sizes="(max-width: 559px) 140px, 200px"
          width={760}
          height={1044}
          alt={card.dish}
          loading="lazy"
          decoding="async"
          className={styles.card}
        />
      </Link>
      <div>
        <p className={styles.kicker}>
          {de ? 'Ein Blick in die Karten' : 'A look inside the cards'}
        </p>
        <p className={styles.spot}>{card.restaurant.name}</p>
        <h2 className={styles.title}>{card.dish}</h2>
        {description && <p className={styles.description}>{description}</p>}
        <p className={styles.note}>
          {personal
            ? de
              ? 'Diese Karte ist für dich freigeschaltet.'
              : 'This card is unlocked for you.'
            : de
              ? 'Diese Karte liegt schon offen. Mit deinem Pack deckst du weitere Empfehlungen auf.'
              : 'This card is already face up. Your pack reveals more recommendations.'}
        </p>
      </div>
    </section>
  );
}
