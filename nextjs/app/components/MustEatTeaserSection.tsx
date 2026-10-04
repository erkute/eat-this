'use client';

import { CSSProperties, MouseEvent, useState } from 'react';
import Image from '@/app/components/SiteImage';
import type { MustEatPreview } from '@/lib/sanity.server';
import { useRouter } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import styles from './MustEatTeaserSection.module.css';

interface Props {
  mustEats: MustEatPreview[];
  /** Der Spot, wie er auf der Seite heisst — der Satz nennt ihn. */
  name: string;
  locale: 'de' | 'en';
  /** Abschnitt, Zwischentitel und Knopf setzt die Spot-Seite, damit sie
   *  aussehen wie ihre übrigen Abschnitte. */
  classNames: { section: string; heading: string; button: string };
}

// Deterministic ±tilt array — cards look thrown-on-the-table consistently
// across renders. Alternating pattern keeps adjacent cards from leaning the
// same way and creating accidental stripes.
const TILTS = [-3.2, 2.4, -1.8, 2.8, -2.6, 1.9, -3.0, 2.2, -2.1, 2.6, -2.4, 1.7];

/**
 * Die verdeckten Karten auf der Spot-Seite — ein eigener Abschnitt im
 * Heftlook, auf Weiss (Ansage 03.10.2026: „nicht schwarz", Insider-Tipp und
 * Must Eats getrennt). Ein Satz, die Karten, ein Knopf „Aufdecken"; keine
 * Bedienzeile mehr darunter.
 */
export default function MustEatTeaserSection({ mustEats, name, locale, classNames }: Props) {
  const [shakingId, setShakingId] = useState<string | null>(null);
  const router = useRouter();

  if (mustEats.length === 0) return null;
  const de = locale === 'de';

  // Die Karte IST ein Link auf `/map?me=<id>` — das Ziel ist die Detailansicht
  // genau dieser Karte (?me= ist derselbe Parameter, den die Artikel benutzen).
  // Das generische '/map', das hier mal stand, ließ den Klick auf der Listen-
  // ansicht liegen: die angetippte Karte ging nie auf.
  //
  // Der Handler übernimmt nur den einfachen Linksklick, um vorher kurz zu
  // wackeln. Alles andere bleibt beim Browser — Cmd/Strg für einen neuen Tab,
  // Shift für ein neues Fenster, Mittelklick (der löst gar kein `click` aus).
  // Als <button> gab es das alles nicht, und im HTML stand überhaupt kein Ziel.
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

  // „Zwei Gerichte haben es auf unsere Karten geschafft." — die Anzahl ist die
  // Nachricht dieses Blocks. Für SERP-Besucher, die Eat This nicht kennen, war
  // „Noch nicht aufgedeckt." als einzige Ansage ein Rätsel ohne Kontext; jetzt
  // erklärt die Zeile, WAS verdeckt ist, und der Rätsel-Satz wird Unterzeile.
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

  const t = de
    ? { ariaCard: 'Karte auf der Map aufdecken', reveal: 'Aufdecken' }
    : { ariaCard: 'Reveal this card on the map', reveal: 'Reveal' };
  const first = mustEats[0]._id;

  return (
    <section className={classNames.section} aria-labelledby="spot-must-eats">
      <h2 id="spot-must-eats" className={classNames.heading}>
        Must Eats
      </h2>
      <p className={styles.sentence}>{sentence}</p>

      <ul className={styles.grid} role="list">
        {mustEats.map((m, i) => (
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
              onClick={(event) => handleClick(event, m._id)}
              aria-label={t.ariaCard}
            >
              <Image
                src="/pics/card-back.webp?v=7"
                alt=""
                fill
                sizes="(max-width: 480px) 38vw, (max-width: 720px) 28vw, 180px"
                className={styles.cardBack}
                aria-hidden="true"
              />
            </MapIntentLink>
          </li>
        ))}
      </ul>

      {/* Derselbe Weg wie ein Tipp auf die erste Karte: sie wackelt, dann
          geht es auf die Map. */}
      <div className={styles.actions}>
        <MapIntentLink
          href={`/map?me=${first}`}
          className={classNames.button}
          onClick={(event) => handleClick(event, first)}
        >
          {t.reveal}
        </MapIntentLink>
      </div>
    </section>
  );
}
