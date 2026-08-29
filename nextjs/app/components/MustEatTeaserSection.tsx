'use client';

import { CSSProperties, MouseEvent, useState } from 'react';
import Image from 'next/image';
import type { MustEatPreview } from '@/lib/sanity.server';
import { useRouter } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import styles from './MustEatTeaserSection.module.css';

interface Props {
  mustEats: MustEatPreview[];
  locale: 'de' | 'en';
}

// Deterministic ±tilt array — cards look thrown-on-the-table consistently
// across renders. Alternating pattern keeps adjacent cards from leaning the
// same way and creating accidental stripes.
const TILTS = [-3.2, 2.4, -1.8, 2.8, -2.6, 1.9, -3.0, 2.2, -2.1, 2.6, -2.4, 1.7];

export default function MustEatTeaserSection({ mustEats, locale }: Props) {
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
  const heading = de
    ? count === 1
      ? 'Ein Gericht hat es auf unsere Karten geschafft.'
      : `${countWord} Gerichte haben es auf unsere Karten geschafft.`
    : count === 1
      ? 'One dish made it onto our cards.'
      : `${countWord} dishes made it onto our cards.`;

  const t = de
    ? {
        eyebrow: 'Must Eats',
        // Der Hinweis sagt jetzt, was zu TUN ist: dass die verdeckten Karten
        // anklickbar sind, war nicht erkennbar (Nutzer-Review 28.08.).
        body: 'Tipp eine Karte an — sie deckt sich auf der Map auf.',
        ariaList: 'Must Eats aufdecken',
        ariaCard: 'Karte auf der Map aufdecken',
      }
    : {
        eyebrow: 'Must Eats',
        body: 'Tap a card — it flips open on the map.',
        ariaList: 'Reveal Must Eats',
        ariaCard: 'Reveal this card on the map',
      };

  return (
    <section className={styles.section} aria-label={t.ariaList}>
      <header className={styles.head}>
        {/* Die H2 trägt jetzt den Abschnittsnamen (vorher stand er als
            blindes <p> davor und die Outline bestand aus dem Rätsel-Satz). */}
        <h2 className={styles.eyebrow}>{t.eyebrow}</h2>
        <p className={styles.heading}>{heading}</p>
        <p className={styles.body}>{t.body}</p>
      </header>

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
    </section>
  );
}
