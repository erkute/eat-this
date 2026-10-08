import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import type { HubArticle } from '@/lib/home/getHomeData';
import { deckKeyframes } from '@/lib/home/magazineDeck';
import MagazineCover from './MagazineCover';
import MagazineDeckDots from './MagazineDeckDots';
import MagazineLink from './MagazineLink';
import styles from './MagazineGrid.module.css';

interface Props {
  articles: HubArticle[];
  locale: 'de' | 'en';
}

const CARD_COUNT = 6;
const DECK_ID = 'hub-magazine-deck';

/**
 * „Auf dem Teller" als Stapel aus Magazinen (01.10.2026, nach „Card stack"
 * aus den GSAP-Demos). Jeder Artikel ist die Titelseite einer Ausgabe, gebaut
 * wie ein Heft: ganz oben klein „Issue 27 · September 2026" (gezählt ab dem
 * ältesten Artikel, siehe getHomeData), darunter das Eat-This-Logo als
 * Masthead, unten die Rubrik als Etikett über der ganzen Schlagzeile (nie
 * gekürzt, die Grösse richtet sich nach der Länge), ein Strichcode am Rand,
 * Glanz und Rücken — in drei wechselnden Stilen. Jedes Heft hat eine feine
 * Papierkante und ist leicht in den Raum gedreht (die acht Papierlagen vom
 * 01.10. wirkten am 02.10. „zu dick, eher wie ein Buch"). Sie liegen
 * als Stapel wie auf dem Tisch, die hinteren leicht verdreht und darüber
 * hinausragend. Quer wischen nimmt das oberste vom Stapel — es fliegt gedreht
 * nach links aus dem Bild —, die übrigen rücken eine Lage vor; zurückwischen
 * legt es wieder obenauf.
 *
 * Das Wischen ist nativ (Scroll-Snap, ein Einrastpunkt pro Cover), nicht
 * per Pointer-Handler: so fühlt es sich an wie Instagram, auch bei schrägem
 * Wisch (siehe wischen-nativ-statt-js). Alle Cover liegen in der ersten
 * Spalte des Querscrollers; dessen Scroll-Timeline (`--deck`) trägt sie um
 * genau den gescrollten Weg zurück und legt sie in den Stapel — die
 * Schlüsselbilder kommen aus `deckKeyframes`. Kein `sticky`: iOS 27 färbt
 * sonst die URL-Leiste. Ohne Scroll-Timelines ist es ein gewöhnlicher
 * Querstreifen mit Einrasten.
 *
 * Ab 768px liegt der Stapel als Fächer auf einem Tisch, der bis an den
 * Fensterrand reicht: bildschirmhoch, die nächsten vier Hefte nach links
 * aufgeblättert, der Stapel ist ein Ring. Dort hängt nichts am Scrollweg —
 * jedes Blättern ist eine getimte Bewegung wie in der GSAP-Demo: das oberste
 * wird angehoben und nach links aus dem Bild geworfen, die übrigen rücken
 * versetzt nach (lib/home/magazineTable.ts, HubMotion). Ziehen, Trackpad,
 * Punkte und ein Klick in den Fächer blättern; die Maus fächert auf.
 */
export default function MagazineGrid({ articles, locale }: Props) {
  if (!articles.length) return null;
  const list = articles.slice(0, CARD_COUNT);
  const count = list.length;
  const labels = {
    all: locale === 'en' ? 'More magazines' : 'Weitere Magazine',
    kicker: locale === 'en' ? 'Magazine' : 'Magazin',
    title: locale === 'en' ? 'On the plate' : 'Auf dem Teller',
    intro: locale === 'en' ? 'Stories from Berlin’s food scene.' : 'Geschichten aus Berlins Food-Szene.',
    dot: (n: number) => (locale === 'en' ? `Story ${n} of ${count}` : `Story ${n} von ${count}`),
  };

  return (
    <section
      className={`homeV2 hv-section hv-wrap ${styles.section}`}
      aria-label={labels.kicker}
      data-hub-magazine=""
    >
      {/* Keyframes per cover and dot, for exactly this many covers — the
          phone's deal-off stack (magazineDeck.ts). */}
      <style>{deckKeyframes(count)}</style>
      <div className={styles.layout}>
        <div>
          <div className={`hv-head ${styles.head}`}>
            <span className={`hv-kicker ${styles.eyebrow}`}>{labels.kicker}</span>
            <h2 className="hv-title">
              {labels.title}
            </h2>
            <p className={styles.intro}>{labels.intro}</p>
          </div>
        </div>

        <div
          className={styles.stage}
          style={{ '--count': count } as CSSProperties}
          data-home-pointer=""
          data-magazine-stage=""
        >
          <div id={DECK_ID} className={styles.deck} data-magazine-deck="">
            <ol className={styles.track} role="list" aria-label={labels.kicker}>
              {list.map((a, i) => (
                <li
                  key={a.slug}
                  className={styles.card}
                  data-deck-index={i}
                  style={
                    {
                      '--i': i,
                      '--deck-key': `mag-deck-${count}-${i}`,
                      zIndex: count - i,
                    } as CSSProperties
                  }
                >
                  <MagazineLink href={`/news/${a.slug}`} className={styles.mag}>
                    <MagazineCover
                      title={a.title}
                      image={a.image}
                      issue={a.issue}
                      date={a.date}
                      locale={locale}
                      cover={a.cover}
                      sizes="(max-width: 767.98px) 80vw, 420px"
                      widths={[480, 800, 1200]}
                    />
                  </MagazineLink>
                </li>
              ))}
              {/* One snap point per cover: the swipe distance between two. */}
              {list.map((a, i) => (
                <li
                  key={`snap-${a.slug}`}
                  className={styles.snap}
                  style={{ gridColumn: i + 1 }}
                  aria-hidden="true"
                />
              ))}
            </ol>
          </div>
        </div>

        <MagazineDeckDots deckId={DECK_ID} labels={list.map((_, i) => labels.dot(i + 1))}
          stories={list.map((article) => ({ title: article.title, href: `/news/${article.slug}` }))} />

        <div className={styles.foot}>
          <Link href="/news" className={styles.allLink}>
            {labels.all}
          </Link>
        </div>
      </div>
    </section>
  );
}
