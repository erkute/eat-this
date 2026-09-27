import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';
import { Link } from '@/i18n/navigation';
import styles from './PackPreview.module.css';

/** Use only the permanent public shop window, never a paid or daily gift card. */
export default async function PackPreview({
  locale,
  category,
}: {
  locale: 'de' | 'en';
  category?: string;
}) {
  const data = await getInitialAnonMapData();
  const publicIds = new Set(data.revealedMustEatIds);
  const categorySpots = category
    ? new Set(
        data.restaurants
          .filter((spot) => spot.categories?.some((c) => c.slug === category))
          .map((spot) => spot._id)
      )
    : null;
  const card = data.mustEats.find(
    (m) =>
      m.revealedForAnon &&
      publicIds.has(m._id) &&
      m.image &&
      m.dish &&
      (!categorySpots || categorySpots.has(m.restaurant._id))
  );
  if (!card) return null;
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
        <h2 className={styles.title}>{card.dish}</h2>
        <p className={styles.spot}>{card.restaurant.name}</p>
        {description && <p className={styles.description}>{description}</p>}
        <p className={styles.note}>
          {de
            ? 'Diese Karte liegt schon offen. Mit deinem Pack deckst du weitere Empfehlungen auf.'
            : 'This card is already face up. Your pack reveals more recommendations.'}
        </p>
      </div>
    </section>
  );
}
