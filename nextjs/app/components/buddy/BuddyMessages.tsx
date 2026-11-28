'use client';
import React, { useCallback, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { BuddyDisplayMessage } from './useBuddyChat';
import { splitAnswerSegments, extractFollowups } from '@/lib/buddy/stream';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { HeartIcon } from '@/app/components/map/icons';
import type { Locale, SpotCandidate, ArticleResult, PackTeaser } from '@/lib/buddy/types';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import styles from './BuddyWidget.module.css';

// What one answer from Remy is made of: formatted text, spot cards, article
// cards, the pack teaser and the follow-up chips. The chat window itself is
// BuddyWidget.tsx; both share one stylesheet.

/* Inline-Markdown, wie Claude es tatsächlich setzt: `**fett**` und `*kursiv*`.
   Kursiv gehört dazu: Er betont damit gern ein einzelnes Wort („eigentlich
   *die* Pizza-Referenz"), und die Sternchen stünden sonst roh im Text. */
function inlineMarkup(text: string, animate = false): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i}>{words(part.slice(2, -2), animate)}</strong>;
    if (/^\*[^*\n]+\*$/.test(part)) return <em key={i}>{words(part.slice(1, -1), animate)}</em>;
    return <React.Fragment key={i}>{words(part, animate)}</React.Fragment>;
  });
}

/* Das Einblenden, wie es Chat-Oberflächen machen (Streamdown / Vercel AI
   Elements: `fadeIn`, 150 ms, `ease`, pro Wort): Jedes Wort sitzt in einer
   eigenen Spanne, und nur eine neu eingehängte Spanne spielt ihre Animation.
   Der Text wächst hinten an, die Schlüssel davor bleiben, React lässt die
   vorhandenen Wörter also in Ruhe. Ohne das ploppt jedes Wort hart auf den
   Schirm; bei 25 Wörtern pro Sekunde ist das ein Flimmern, das sich wie Ruckeln
   liest. Ist die Antwort fertig, fällt die Hülle wieder weg. */
function words(text: string, animate: boolean): React.ReactNode {
  if (!animate) return text;
  return text.split(/(\s+)/).map((w, i) =>
    w.trim() ? (
      <span key={i} className={styles.word}>
        {w}
      </span>
    ) : (
      w
    )
  );
}

// Render Claude's plain-text answer as light markdown: paragraphs, bullet
// lists, bold and italic — so it doesn't read as one flat wall with raw
// ** and * markers.
export function FormattedText({ text, animate = false }: { text: string; animate?: boolean }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;
  const flush = () => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul key={`ul${key++}`} className={styles.botList}>
          {items.map((b, i) => (
            <li key={i}>{inlineMarkup(b, animate)}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*]\s+(.*)/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.*)/);
    blocks.push(
      <p key={`p${key++}`} className={styles.botP}>
        {heading ? (
          <strong>{inlineMarkup(heading[1], animate)}</strong>
        ) : (
          inlineMarkup(line, animate)
        )}
      </p>
    );
  }
  flush();
  return <>{blocks}</>;
}

function TypingDots({ label }: { label: string }) {
  return (
    <span className={styles.typing}>
      {label}
      <span className={styles.typingDots} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

// Das 9px-Quadrat vor jedem Kicker — dasselbe Zeichen wie vor jedem
// Insider-Tipp.
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.kicker}>
      <span className={styles.mk} aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Ein Spot wie eine Karte in der Map-Liste: das Foto ist die Karte, Name und
 * Bezirk · Küche · Preis stehen als Etiketten unten links darauf, der
 * Offen-Zustand oben links. Keine Beschreibung, solange Remy den Spot im Text
 * vorstellt: Er formuliert seinen Absatz aus genau diesem Feld. In der
 * Sammelausgabe am Ende (`showDesc`) hat er über die Spots nichts geschrieben;
 * dort steht die Beschreibung unter dem Foto.
 *
 * Die Fläche selbst ist der Weg zur Map, ohne „Auf der Map ansehen"-Balken.
 */
// Large landscape photos; wide chat windows show two cards side by side.
export const SPOT_IMG_SIZES = '(max-width: 600px) calc(100vw - 32px), 440px';
export const spotSrcSet = (image: string) => sanitySrcSet(image, [400, 800, 1200], 82);

function SpotCard({
  spot,
  locale,
  onSelect,
  isSaved,
  onSave,
  showDesc,
}: {
  spot: SpotCandidate;
  locale: Locale;
  onSelect: () => void;
  isSaved?: boolean;
  onSave?: () => void;
  /** Beschreibung mitzeigen — nur wo kein Absatz von Remy darüber steht. */
  showDesc?: boolean;
}) {
  const facts = [
    spot.bezirk,
    spot.cuisineType ? localizedCuisine(spot.cuisineType, locale === 'en' ? 'en' : 'de') : null,
    spot.priceRange,
    spot.distanceLabel,
  ].filter(Boolean) as string[];
  const openLabel = locale === 'en' ? `Show ${spot.name} on the map` : `${spot.name} auf der Map`;
  /* Das Foto blendet ein, sobald es da ist, statt in die stehende Karte zu
     ploppen. Meist ist es das schon: der Chat lädt die Fotos vor, sobald die
     Kandidaten eintreffen (siehe BuddyWidget). */
  const [imgReady, setImgReady] = useState(false);
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete) setImgReady(true);
  }, []);
  return (
    <article className={styles.spotCard}>
      <Link
        className={styles.spotCardLink}
        href={`/map?r=${spot.slug}`}
        prefetch
        aria-label={openLabel}
        onClick={onSelect}
      >
        <span className={styles.spotThumb}>
          {spot.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.spotImg}
              src={spot.image}
              srcSet={spotSrcSet(spot.image)}
              sizes={SPOT_IMG_SIZES}
              alt=""
              width={640}
              height={480}
              decoding="async"
              ref={imgRef}
              data-ready={imgReady ? 'true' : 'false'}
              onLoad={() => setImgReady(true)}
              onError={() => setImgReady(true)}
            />
          )}
          {/* Geöffnet: schwarzes Band wie ein gesetzter Filter; geschlossen:
              Rot. Getragen vom Wort, nicht von Grün gegen Rot. */}
          {spot.openLabel && (
            <span
              className={`et-label ${spot.openNow ? 'et-label-open et-label-tape' : 'et-label-closed'} ${styles.spotStatus}`}
            >
              {spot.openLabel}
            </span>
          )}
          <span className={styles.spotLabels}>
            <span className={styles.spotName}>
              <span className="et-label-title et-label-tape">{spot.name}</span>
            </span>
            {facts.length > 0 && (
              <span className={`et-label et-label-paper et-label-tape ${styles.spotMeta}`}>
                {facts.join(' · ')}
              </span>
            )}
          </span>
        </span>
        {showDesc && spot.shortDescription && (
          <span className={styles.spotDesc}>{spot.shortDescription}</span>
        )}
      </Link>
      {onSave && (
        <button
          type="button"
          className={styles.spotSave}
          data-saved={isSaved ? 'true' : 'false'}
          aria-pressed={isSaved}
          aria-label={
            isSaved
              ? locale === 'en'
                ? 'Remove heart'
                : 'Herz entfernen'
              : locale === 'en'
                ? 'Heart this spot'
                : 'Spot herzen'
          }
          onClick={onSave}
        >
          <HeartIcon filled={!!isSaved} />
        </button>
      )}
    </article>
  );
}

function ArticleCard({
  article,
  locale,
  onSelect,
}: {
  article: ArticleResult;
  locale: Locale;
  onSelect: () => void;
}) {
  return (
    <Link className={styles.articleCard} href={`/news/${article.slug}`} prefetch onClick={onSelect}>
      <Kicker>{locale === 'en' ? 'From the magazine' : 'Aus dem Magazin'}</Kicker>
      <span className={styles.articleTitle}>{article.title}</span>
      {article.excerpt && <span className={styles.spotDesc}>{article.excerpt}</span>}
    </Link>
  );
}

// A short line in Remy's voice that hands the pack card over, so it doesn't
// just appear unannounced. Canned (app-controlled, not LLM) so his streamed
// answer stays sales-free — this aside is clearly the app nudging, in his tone.
const PACK_INTRO: Record<Locale, (name: string) => string> = {
  de: (name) => `Ach, und falls dich ${name} öfter packt — dafür hätte ich was:`,
  en: (name) => `Oh, and if ${name} is your thing — I’ve got something for that:`,
};

// Booster-Pack teaser card — rendered by the APP under a matching answer (the
// server picks at most one per request, see lib/buddy/packTeaser.ts). Remy's
// streamed text never sells; this card does, with canonical catalog copy.
//
// Wie eine Kachel auf /packs, nur ohne eigene Fläche auf dem Rot: das Pack
// leicht gekippt links, rechts der Name groß, die Spectrum-Zeile und
// „Ansehen". Die Kachel ist als Ganzes der Link; der Knopf zeigt nur, dass
// sie einer ist.
function PackCard({ pack, locale, onSelect }: { pack: PackTeaser; locale: Locale; onSelect: () => void }) {
  return (
    <Link
      className={styles.packCard}
      href={`/pack/${pack.slug}`}
      prefetch
      onClick={onSelect}
      data-buddy-pack={pack.packId}
    >
      {pack.art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.packArt}
          src={pack.art}
          alt=""
          width={420}
          height={656}
          loading="lazy"
        />
      )}
      <span className={styles.packInfo}>
        <span className={styles.packName}>{pack.name}</span>
        <span className={styles.packSpectrum}>{pack.spectrum}</span>
        <span className={`et-btn et-btn-sm ${styles.packView}`} aria-hidden="true">
          {locale === 'en' ? 'View' : 'Ansehen'}
        </span>
      </span>
    </Link>
  );
}

// Renders one assistant message: prose with spot cards interleaved at their
// `[[spot:<slug>]]` markers. Spots Remy didn't place inline fall back to a block
// at the end — but only when he placed NONE (else we'd re-introduce the noise of
// dumping unrelated candidates) and only once streaming for this message ended.
export function BotMessage({
  m,
  locale,
  streaming,
  isLast,
  onSpotSelect,
  onFollowup,
  savedIds,
  onSaveSpot,
  thinkingLabel,
  pack,
}: {
  m: BuddyDisplayMessage;
  locale: Locale;
  streaming: boolean;
  isLast: boolean;
  onSpotSelect: () => void;
  onFollowup: (text: string) => void;
  savedIds: Set<string>;
  onSaveSpot: (spot: SpotCandidate) => void;
  thinkingLabel: string;
  /** Booster-Pack teaser — set only on the one message that may show it. */
  pack?: PackTeaser;
}) {
  if (!m.content) {
    return streaming ? <TypingDots label={thinkingLabel} /> : null;
  }
  const spots = m.spots ?? [];
  const allowed = new Set(spots.map((s) => s.slug));
  const bySlug = new Map(spots.map((s) => [s.slug, s]));
  // Pull the follow-up chips off the end first, then split the rest into
  // text + spot-card segments.
  const { chips, rest } = extractFollowups(m.content);
  const { segments, placedSlugs } = splitAnswerSegments(rest, allowed);
  const showFallback = !streaming && placedSlugs.length === 0 && spots.length > 0;
  // Linked magazine articles Remy pulled via search_articles.
  const articles = m.articles ?? [];
  const showArticles = !streaming && articles.length > 0;
  // Follow-up chips only on the newest answer, once it finished streaming.
  const showChips = isLast && !streaming && chips.length > 0;

  return (
    <>
      {segments.map((seg, si) =>
        seg.type === 'text' ? (
          <FormattedText key={si} text={seg.text} animate={streaming} />
        ) : bySlug.has(seg.slug) ? (
          <div key={si} className={styles.spots}>
            <SpotCard
              spot={bySlug.get(seg.slug)!}
              locale={locale}
              onSelect={onSpotSelect}
              isSaved={savedIds.has(bySlug.get(seg.slug)!._id)}
              onSave={() => onSaveSpot(bySlug.get(seg.slug)!)}
            />
          </div>
        ) : null
      )}
      {showFallback && (
        <div className={styles.spots}>
          {spots.slice(0, 4).map((s) => (
            <SpotCard
              key={s.slug}
              spot={s}
              locale={locale}
              onSelect={onSpotSelect}
              isSaved={savedIds.has(s._id)}
              onSave={() => onSaveSpot(s)}
              // Hier steht kein Absatz von Remy über den Spots — die
              // Beschreibung ist die einzige Auskunft, die sie tragen.
              showDesc
            />
          ))}
        </div>
      )}
      {showArticles && (
        <div className={styles.spots}>
          {articles.slice(0, 2).map((a) => (
            <ArticleCard key={a.slug} article={a} locale={locale} onSelect={onSpotSelect} />
          ))}
        </div>
      )}
      {pack && !streaming && (
        <div className={styles.packBlock}>
          <p className={styles.packIntro}>{PACK_INTRO[locale](pack.name)}</p>
          <PackCard pack={pack} locale={locale} onSelect={onSpotSelect} />
        </div>
      )}
      {showChips && (
        <div className={styles.chips}>
          {chips.map((c) => (
            <button key={c} type="button" className={styles.chip} onClick={() => onFollowup(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
