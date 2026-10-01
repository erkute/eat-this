'use client';
// „Worauf hast du Lust?" — Remy in der Mitte, die Kategorien im Bogen um
// Kopf und Schultern (Ansagen 01.10.2026: „Remys Kopf ist in der Mitte und
// die Kategorien um ihn herum", „Remy mit Körper", „mit der Maus dreht Remy
// seinen Kopf dahin, keine Augen"; die Kategorie, auf die man zeigt, wird
// fett — ohne Gelb). Gechattet wird nicht mehr hier, sondern über den Knopf unten
// rechts oder „Frag Remy" im Burger — beide schicken ein BUDDY_ASK_EVENT an
// RemyDock.
//
// Der Auftritt (Remy schießt hoch, die Kategorien platzen aus seinem Kopf, er
// redet), sein Blick zur Maus und das Reden beim Scrollen gehören HubMotion —
// über `data-fragremy-*`/`data-remy-*`-Haken und Attribute, die React nicht
// verwaltet.
import type { CSSProperties } from 'react';
import Image from '@/app/components/SiteImage';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './HubFragRemy.module.css';

interface Props {
  /** Slug → Name der Kategorien (getHomeData). */
  categoryNames?: Record<string, string>;
}

const REMY_SIZES = '(max-width: 767px) 60vw, 480px';

/**
 * Wo eine Kategorie steht: auf einem Bogen um Remys Gesicht, über Kopf und
 * Schultern, unten offen — dort steht sein Körper.
 * - `--a` (ab 768px): gleichmässig über 210°.
 * - `--am` (Telefon): an der Spitze des Bogens ist auf 343px nur für ein
 *   Wort Platz (gleichmässig verteilt stiessen dort drei aneinander). Also
 *   eins oben, die übrigen je zur Hälfte an den Seiten, von schräg unten
 *   (135° bzw. 45°) bis schräg oben (225° bzw. 315°).
 */
function placeOf(i: number, n: number): CSSProperties {
  const t = n > 1 ? i / (n - 1) : 0.5;
  const top = n % 2 === 1 ? (n - 1) / 2 : -1;
  const side = Math.floor(n / 2);
  const step = side > 1 ? 90 / (side - 1) : 0;
  const am = i === top ? 270 : i < side ? 135 + i * step : 315 + (i - (n - side)) * step;
  return {
    '--i': i,
    '--a': `${165 + t * 210}deg`,
    '--am': `${am}deg`,
  } as CSSProperties;
}

export default function HubFragRemy({ categoryNames = {} }: Props) {
  const de = useLocale() === 'de';
  const categories = Object.entries(categoryNames);

  return (
    <section
      className={`homeV2 hv-section hv-wrap ${styles.section}`}
      id="hub-fragremy"
      data-hub-fragremy=""
    >
      <div className={styles.body}>
        <h2 className={`hv-title ${styles.question}`}>
          {de ? 'Worauf hast du Lust?' : 'What are you craving?'}
        </h2>

        <div className={styles.ring} data-remy-ring="">
          {/* Remy freigestellt, mit Oberkörper; nach unten läuft er in die
              Tafel aus. */}
          <div className={styles.figure}>
            <div className={styles.avatarWrap} data-fragremy-avatar="">
              <div className={styles.head} data-remy-head="">
                <div className={styles.avatar}>
                  <Image
                    className={styles.face}
                    src="/buddy/buddy.webp"
                    alt="Remy"
                    fill
                    sizes={REMY_SIZES}
                    loading="lazy"
                  />
                  <Image
                    className={styles.faceOpen}
                    src="/buddy/buddy-open.webp"
                    alt=""
                    fill
                    sizes={REMY_SIZES}
                    loading="lazy"
                    aria-hidden="true"
                  />
                  <Image
                    className={styles.faceLaugh}
                    src="/buddy/buddy-laugh.webp"
                    alt=""
                    fill
                    sizes={REMY_SIZES}
                    loading="lazy"
                    aria-hidden="true"
                  />
                  {/* Sein Blick: die Zeichnung als verformtes Gitter
                      (lib/home/renderRemyLook.ts). Zeichnet es, treten die
                      drei Bilder darüber zurück (`data-mesh`). */}
                  <canvas className={styles.mesh} data-remy-mesh="" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>

          {/* Remys Platz, unbewegt: daran misst HubMotion, wann er im Bild
              ist und hochschießt, und von dort fliegen die Kategorien los. */}
          <span className={styles.avatarSpot} data-fragremy-spot="" aria-hidden="true" />

          {categories.length > 0 && (
            <ul
              className={styles.orbit}
              role="list"
              aria-label={de ? 'Kategorien' : 'Categories'}
              data-hub-categories=""
            >
              {categories.map(([slug, name], i) => (
                <li key={slug} className={styles.place} style={placeOf(i, categories.length)}>
                  {/* `fly` gehört dem Auftritt (GSAP-transform), der Platz
                      darüber seiner Lage im Bogen (`translate`). */}
                  <span className={styles.fly} data-remy-orbit="">
                    <Link href={`/kategorie/${slug}`} className={styles.word}>
                      {name}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
