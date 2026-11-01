'use client';

import { CSSProperties, MouseEvent, useState } from 'react';
import Image from '@/app/components/SiteImage';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import { useVisibleMustEats } from '@/lib/must-eat/useVisibleMustEats';
import { mustEatCardSrc } from '@/lib/must-eat/cardImage';
import type { MustEatPreview } from '@/lib/sanity.server';
import { useRouter } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import styles from './MustEatTeaserSection.module.css';

interface Props {
  mustEats: MustEatPreview[];
  initialData: InitialMapData;
  /** Der Spot, wie er auf der Seite heisst — der Satz nennt ihn. */
  name: string;
  locale: 'de' | 'en';
  /** Abschnitt und Zwischentitel folgen den übrigen Bereichen der Spot-Seite. */
  classNames: { section: string; heading: string };
}

// Deterministic ±tilt array — cards look thrown-on-the-table consistently
// across renders. Alternating pattern keeps adjacent cards from leaning the
// same way and creating accidental stripes.
const TILTS = [-3.2, 2.4, -1.8, 2.8, -2.6, 1.9, -3.0, 2.2, -2.1, 2.6, -2.4, 1.7];

/** Antippbare Must-Eat-Karten als eigener Abschnitt der Spot-Seite. */
export default function MustEatTeaserSection({ mustEats, initialData, name, locale, classNames }: Props) {
  const [shakingId, setShakingId] = useState<string | null>(null);
  const router = useRouter();
  const visible = useVisibleMustEats(initialData);
  const revealedIds = new Set(visible.revealedMustEatIds);
  const faceUp = new Map(visible.mustEats
    .filter(card => revealedIds.has(card._id) && card.image)
    .map(card => [card._id, card]));

  if (mustEats.length === 0) return null;
  const de = locale === 'de';

  // Die Karte öffnet ihr Map-Detail nach kurzem Wackeln; modifizierte Klicks
  // bleiben native Links für neue Tabs oder Fenster.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setShakingId(id);
    // Ohne Animation gibt es nichts abzuwarten: bei `prefers-reduced-motion`
    // neutralisiert globals.css das Wackeln, die Pause wäre reines Nichtstun.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go = () => router.push(`/map?me=${id}`);
    if (reduced) go();
    else window.setTimeout(go, 280);
  };

  const count = mustEats.length;
  const words = de
    ? ['Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs']
    : ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
  const countWord = count <= words.length ? words[count - 1] : String(count);
  const sentence = de
    ? count === 1
      ? `Ein Gericht von ${name} hat es auf unsere Karten geschafft.`
      : `${countWord} Gerichte von ${name} haben es auf unsere Karten geschafft.`
    : count === 1
      ? `One dish from ${name} made it onto our cards.`
      : `${countWord} dishes from ${name} made it onto our cards.`;


  return (
    <section className={classNames.section} aria-labelledby="spot-must-eats">
      <h2 id="spot-must-eats" className={classNames.heading}>
        Must Eats
      </h2>
      <p className={styles.sentence}>{sentence}</p>

      <ul className={styles.grid} role="list">
        {mustEats.map((m, i) => {
          const image = faceUp.get(m._id)?.image;
          return (
            <li
              key={m._id}
              className={styles.cardWrap}
              style={
                {
                  ['--tilt' as string]: `${TILTS[i % TILTS.length]}deg`,
                  // Versetzt, damit die Reihe nicht im Gleichschritt wippt.
                  ['--wobble-delay' as string]: `${(i % 4) * 0.42}s`,
                } as CSSProperties
              }
            >
              <MapIntentLink
                href={`/map?me=${m._id}`}
                className={`${styles.card} ${shakingId === m._id ? styles.cardShake : ''}`}
                onClick={image ? undefined : (event) => handleClick(event, m._id)}
                data-card-state={image ? 'open' : 'covered'}
                aria-label={image
                  ? (de ? 'Must Eat auf der Map ansehen' : 'View this Must Eat on the map')
                  : (de ? 'Karte auf der Map aufdecken' : 'Reveal this card on the map')}
              >
                {image ? (
                  // Das native Bild übermittelt die Freigabe-Cookies an die geschützte Route.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mustEatCardSrc(image, 440)}
                    alt=""
                    className={styles.cardBack}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <Image
                    src="/pics/card-back.webp?v=20261028"
                    alt=""
                    fill
                    sizes="(max-width: 480px) 38vw, (max-width: 720px) 28vw, 180px"
                    className={styles.cardBack}
                    aria-hidden="true"
                  />
                )}
              </MapIntentLink>
            </li>
          );
        })}
      </ul>

    </section>
  );
}
