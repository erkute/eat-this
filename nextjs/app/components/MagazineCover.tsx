import type { CSSProperties, ReactNode } from 'react';
import {
  FRONT_LOGO,
  altTone,
  coverLook,
  cutoutRect,
  fitCutout,
  fitSize,
  focusPoint,
  frontGeometry,
  hasCutout,
  plateTone,
  scaleSizes,
  splitHeadline,
  tilt,
  toneOnTone,
  type CoverData,
  type CoverRect,
  type CoverTone,
  type CutoutCover,
} from '@/lib/magazineCover';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import styles from './MagazineCover.module.css';

const LOGO = '/pics/cover/logo.webp';
const TONES: Record<CoverTone, string> = {
  yellow: styles.yellow,
  red: styles.red,
  ink: styles.ink,
};
const SLOGAN = 'We tell you what to eat';

/** The issue's month on the cover, like a magazine: „September 2026". */
export function formatMonth(iso: string | null | undefined, locale: 'de' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}

interface Props {
  title: string;
  /** Sanity image URL; without one the cover keeps its ground colour. */
  image?: string | null;
  /** Place in the run of all articles, the oldest is 1 (siehe getHomeData). */
  issue?: number | null;
  /** ISO date — the cover only prints its month. */
  date?: string | null;
  locale: 'de' | 'en';
  /** Look, cut-out and palette from Sanity (`cover` am Artikel). */
  cover?: CoverData | null;
  sizes: string;
  widths?: number[];
  /** The page's LCP image: load at once and ahead of the rest. */
  priority?: boolean;
  /** Visible supporting covers load immediately without competing with the front. */
  loading?: 'eager' | 'lazy';
  /** Small covers (archive shelf, related row): headlines keep a legible
   *  floor in px, where pure `cqw` would shrink below reading size. */
  compact?: boolean;
}

const q = (n: number) => `${Math.round(n * 1000) / 1000}cqw`;
const place = (r: CoverRect): CSSProperties => ({
  left: q(r.left),
  top: q(r.top),
  width: q(r.width),
  height: q(r.height),
});
const size = (n: number) => ({ '--size': q(n) }) as CSSProperties;

/**
 * Eine Titelseite des Eat-This-Hefts in einem von fünfzehn Looks nach
 * Mode-Magazinen (Auswahl 03.10.2026). Welcher Look, steht in
 * lib/magazineCover.ts: Gerichte mit Freisteller bekommen im Wechsel die
 * fünf Freisteller-Looks, alles andere geht reihum durch die zehn Foto-Looks.
 *
 * Das Logo liegt vorne — ausser bei „Vor dem Logo“, wo genau das der Witz
 * ist. Im Heft bewegt sich nichts; Stapel, Neigung und Wurf legt die Seite
 * außen herum (Ansage: „das Magazin soll animiert sein, nicht der Inhalt").
 *
 * Alles in `cqw` der Titelseite, damit sie in jeder Grösse gleich gesetzt
 * ist. Dasselbe Objekt auf der Startseite („Auf dem Teller"), im
 * Magazin-Index und unter „Weitere Ausgaben". Ein Tipp darauf schlägt das
 * Heft auf (MagazineLink) — im Artikel selbst steht es deshalb nicht.
 */
export default function MagazineCover({
  title,
  image,
  issue,
  date,
  locale,
  cover,
  sizes,
  widths = [480, 800, 1200],
  priority = false,
  loading: requestedLoading = 'lazy',
  compact = false,
}: Props) {
  const look = coverLook(issue, cover);
  const month = formatMonth(date, locale);
  const issueLine = [issue ? `Issue ${issue}` : '', month].filter(Boolean).join(' · ');
  const issueStack = (
    <>
      {issue ? (
        <>
          Issue {issue}
          <br />
        </>
      ) : null}
      {month}
    </>
  );
  const loading = priority ? 'eager' : requestedLoading;
  const fetchPriority = priority ? ('high' as const) : undefined;
  const [lead, rest] = splitHeadline(title);
  const cut = hasCutout(cover) ? cover : null;

  // Das Aufmacher-Foto, `factor`-mal so breit wie das Heft.
  const photo = (className: string, factor = 1, style?: CSSProperties) =>
    image ? (
      // Sanity serves the responsive variants itself; the App Hosting image
      // proxy would re-optimise them.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        style={style}
        src={sanityImageLoader({ src: image, width: widths[1] ?? widths[0] })}
        srcSet={sanitySrcSet(image, widths)}
        sizes={factor === 1 ? sizes : scaleSizes(sizes, factor)}
        alt=""
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
    ) : null;

  // Der Freisteller, auf den Rahmen des Motivs zugeschnitten.
  const cutout = (c: CutoutCover, rect: CoverRect, className: string, style?: CSSProperties) => {
    const base = c.cutout.split('?')[0];
    const crop = cutoutRect(c);
    const ws = widths.map((w) => Math.round((w * rect.width) / 100));
    const url = (w: number) => `${base}?rect=${crop}&w=${w}&auto=format&q=80`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        style={{ ...place(rect), ...style }}
        src={url(ws[1] ?? ws[0])}
        srcSet={ws.map((w) => `${url(w)} ${w}w`).join(', ')}
        sizes={scaleSizes(sizes, rect.width / 100)}
        alt=""
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
    );
  };

  const logo = (style: CSSProperties, className = styles.logo) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} style={style} src={LOGO} alt="" loading={loading} decoding="async" />
  );
  // Das Logo einfarbig: nur die Buchstabenflächen, ohne Kontur und Schatten.
  const flatLogo = (fill: string, style: CSSProperties) => (
    <span className={styles.flatLogo} style={{ ...style, '--fill': fill } as CSSProperties} />
  );
  const meta = (text: ReactNode, style: CSSProperties, className = styles.meta) => (
    <span className={className} style={style} aria-hidden="true" data-cover-folio="">
      {text}
    </span>
  );
  const barcode = (style: CSSProperties, upright = false) => (
    <span
      className={upright ? styles.barcodeUp : styles.barcode}
      style={style}
      aria-hidden="true"
    />
  );
  const spine = <span className={styles.spine} aria-hidden="true" />;
  // Für Vorleser der ganze Titel, wo das Heft nur einen Teil gross setzt.
  const hiddenTitle = <span className={styles.hidden}>{title}</span>;

  let tone: CoverTone | null = null;
  let body: ReactNode;

  // coverLook gibt einen Freisteller-Look nur zurück, wenn `cut` da ist.
  switch (look) {
    /* ── Freisteller-Looks ─────────────────────────────────────────────── */
    case 'perfect': {
      // Nach Perfect, mit der Schlagzeile statt des Zitats: weiss, das Logo
      // klein oben, das Gericht gross in der Mitte, die Schlagzeile unten.
      // Erst stand die Schlagzeile gross oben und das Gericht klein unten
      // rechts — „andersherum, das Bild muss grösser sein, die Headline
      // nach unten" (Ansage 03.10.2026).
      const c = cut as CutoutCover;
      body = (
        <>
          {logo({ left: q(5), top: q(5), width: q(34) }, styles.logoAt)}
          {meta(issueStack, { right: q(5), top: q(6), textAlign: 'right' })}
          {cutout(c, fitCutout(c, 84, 68, 50, 58), styles.object)}
          <span
            className={styles.headline}
            style={{ ...size(fitSize(title, 330, 4.6, 7)), left: q(5), right: q(5), bottom: q(6) }}
          >
            {title}
          </span>
        </>
      );
      break;
    }
    case 'paper': {
      // Nach PAPER, in Rot und Schwarz wie Carnale: das Logo gross auf Rot,
      // darunter ein schwarzes Studio-Feld mit dem Gericht, Ort und Ausgabe in
      // den Ecken. Ansagen 03.10.2026: erst „Rot mit Weiss nicht so geil",
      // dann Gelb auf Weiss „hässlich, mach rot schwarz wie Carnale".
      const c = cut as CutoutCover;
      tone = 'red';
      body = (
        <>
          {logo({ top: q(3.5), width: q(92) })}
          <span className={`${styles.panel} ${styles.ink}`} aria-hidden="true" />
          {meta('Berlin', { left: q(9), top: q(41), color: '#fff' }, styles.metaBold)}
          {meta(
            issueLine,
            { right: q(9), top: q(41), color: '#fff', textAlign: 'right' },
            styles.metaBold
          )}
          {cutout(c, fitCutout(c, 66, 52, 50, 76), styles.objectSoft)}
          <span
            className={`${styles.headline} ${styles.caps}`}
            style={{
              ...size(fitSize(title, 270, 4.4, 6.2)),
              left: q(9),
              right: q(9),
              bottom: q(10),
              textAlign: 'center',
              color: '#fff',
            }}
          >
            {title}
          </span>
        </>
      );
      break;
    }
    case 'band': {
      // Fussband: Farbe und Gericht oben, unten ein Ink-Streifen mit der
      // Schlagzeile (höchstens zwei Zeilen, Ansage 03.10.2026) und dem Logo.
      const c = cut as CutoutCover;
      tone = altTone(issue, ['yellow', 'red']);
      body = (
        <>
          {meta(issueStack, { left: q(6), top: q(5) })}
          {cutout(c, fitCutout(c, 84, 62, 50, 54), styles.object, { rotate: `${tilt(issue)}deg` })}
          <span className={styles.band}>
            <span
              className={`${styles.headline} ${styles.twoLines}`}
              style={size(fitSize(title, 260, 3.2, 5.4))}
            >
              {title}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.bandLogo} src={LOGO} alt="" loading={loading} decoding="async" />
          </span>
        </>
      );
      break;
    }
    case 'front': {
      // Vor dem Logo: das Gericht ragt vor die untere Hälfte des Logos, Foto
      // und Freisteller deckungsgleich übereinander.
      const c = cut as CutoutCover;
      const g = frontGeometry(c);
      const onPhoto = g.mode === 'photo' && Boolean(image);
      tone = onPhoto ? null : 'ink';
      const ws = widths.map((w) => Math.min(2000, Math.round((w * g.rect.width) / 100)));
      const layerSizes = scaleSizes(sizes, g.rect.width / 100);
      body = (
        <>
          {onPhoto && image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.layer}
              style={place(g.rect)}
              src={sanityImageLoader({ src: image, width: ws[1] ?? ws[0] })}
              srcSet={sanitySrcSet(image, ws)}
              sizes={layerSizes}
              alt=""
              loading={loading}
              fetchPriority={fetchPriority}
              decoding="async"
            />
          )}
          {onPhoto && <span className={styles.scrimBoth} aria-hidden="true" />}
          {meta(
            issueLine,
            { left: 0, right: 0, top: q(3.4), textAlign: 'center' },
            styles.metaWide
          )}
          {logo({ top: q(FRONT_LOGO.top), width: q(FRONT_LOGO.width) })}
          {onPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={`${styles.layer} ${styles.cutoutShadow}`}
              style={place(g.rect)}
              src={sanityImageLoader({ src: c.cutout, width: ws[1] ?? ws[0] })}
              srcSet={sanitySrcSet(c.cutout, ws)}
              sizes={layerSizes}
              alt=""
              loading={loading}
              decoding="async"
            />
          ) : (
            cutout(c, g.rect, styles.cutoutShadow)
          )}
          <span
            className={`${styles.headline} ${styles.onPhoto}`}
            style={{
              ...size(fitSize(title, 360, 5.4, 7.6)),
              left: q(6),
              right: q(6),
              bottom: q(6),
            }}
          >
            {title}
          </span>
        </>
      );
      break;
    }
    case 'still': {
      // Stillleben nach Toilet Paper: das Gericht gross auf Gelb oder Rot,
      // das Logo klein unten, die Schlagzeile oben rechts (Ansage 03.10.2026).
      const c = cut as CutoutCover;
      tone = altTone(issue, ['yellow', 'red']);
      body = (
        <>
          {meta(issueStack, { left: q(6), top: q(6) })}
          <span
            className={styles.headline}
            style={{
              ...size(fitSize(title, 300, 4.2, 6)),
              right: q(6),
              top: q(6),
              width: q(54),
              textAlign: 'right',
            }}
          >
            {title}
          </span>
          {cutout(c, fitCutout(c, 84, 62, 50, 76), styles.object, { rotate: `${tilt(issue)}deg` })}
          {logo({ bottom: q(6), width: q(30) })}
        </>
      );
      break;
    }

    /* ── Foto-Looks ────────────────────────────────────────────────────── */
    case 'love': {
      // Nach LOVE: das Logo Ton in Ton mit dem Foto, unten der kurze Titel.
      body = (
        <>
          {photo(styles.fill)}
          <span className={styles.scrimBottom} aria-hidden="true" />
          {flatLogo(toneOnTone(cover?.palette), { left: q(3), right: q(3), top: q(3) })}
          <span
            className={styles.stack}
            style={{ left: q(6), right: q(6), bottom: q(6.5), textAlign: 'center', color: '#fff' }}
            aria-hidden="true"
          >
            <span
              className={`${styles.headline} ${styles.caps}`}
              style={size(fitSize(lead, 300, 4.6, 7))}
            >
              {lead}
            </span>
            <span className={styles.sub}>
              {[rest, issue ? `Issue ${issue}` : ''].filter(Boolean).join(' · ')}
            </span>
          </span>
          {hiddenTitle}
        </>
      );
      break;
    }
    case 'system': {
      // Nach System: oben das Foto, unten ein weisses Feld mit einer Zeile.
      body = (
        <>
          {photo(styles.systemPhoto)}
          <span className={styles.scrimTop} aria-hidden="true" />
          {logo({ top: q(4), width: q(70) })}
          {barcode({ left: q(6), top: q(102), width: q(4.4), height: q(17) }, true)}
          <span className={styles.systemText} aria-hidden="true">
            <span className={styles.headline} style={size(fitSize(lead, 190, 5, 7.4))}>
              {lead}
            </span>
            {rest && <span className={styles.systemRest}>{rest}</span>}
          </span>
          {meta([issue ? `No. ${issue}` : '', month].filter(Boolean).join(' · '), {
            right: q(4),
            bottom: q(3),
            fontSize: q(1.6),
          })}
          {hiddenTitle}
        </>
      );
      break;
    }
    case 'holiday': {
      // Nach Holiday: das Logo weiss und riesig, darunter gesperrt der
      // Leitsatz, unten rechts der kurze Titel.
      body = (
        <>
          {photo(styles.fill)}
          <span className={styles.scrimBoth} aria-hidden="true" />
          {flatLogo('#fff', { left: q(4), right: q(4), top: q(4) })}
          {meta(
            SLOGAN,
            {
              left: 0,
              right: 0,
              top: q(36.5),
              textAlign: 'center',
              color: '#fff',
              letterSpacing: '.34em',
            },
            styles.metaShadow
          )}
          <span
            className={styles.stack}
            style={{ right: q(6), bottom: q(7), width: q(56), textAlign: 'right', color: '#fff' }}
            aria-hidden="true"
          >
            <span
              className={`${styles.headline} ${styles.caps}`}
              style={size(fitSize(lead, 200, 3.8, 5.6))}
            >
              {lead}
            </span>
            <span className={styles.sub}>{issue ? `N° ${issue}` : month}</span>
          </span>
          {barcode({ left: q(6), bottom: q(6), width: q(4.4), height: q(17) }, true)}
          {hiddenTitle}
        </>
      );
      break;
    }
    case 'beauty': {
      // Nach Beauty Papers: ganz nah ans Motiv, das Logo quer durch die Mitte.
      const f = focusPoint(cover);
      body = (
        <>
          {photo(styles.fill, 1.6, {
            scale: '1.6',
            transformOrigin: `${f.x}% ${f.y}%`,
            objectPosition: `${f.x}% ${f.y}%`,
          })}
          <span className={styles.dim} aria-hidden="true" />
          {meta(
            issueLine,
            {
              left: 0,
              right: 0,
              top: q(5),
              textAlign: 'center',
              color: '#fff',
              letterSpacing: '.2em',
            },
            styles.metaShadow
          )}
          <span className={styles.middle}>
            {flatLogo('rgba(255, 255, 255, 0.9)', {
              position: 'relative',
              display: 'block',
              width: '100%',
            })}
          </span>
          <span
            className={`${styles.headline} ${styles.onPhoto}`}
            style={{
              ...size(fitSize(title, 260, 3.8, 5)),
              left: q(10),
              right: q(10),
              bottom: q(7),
              textAlign: 'center',
            }}
          >
            {title}
          </span>
        </>
      );
      break;
    }
    case 'silver': {
      // Nach 032c, Ausgabe 49: das Logo in Silber, Leitsatz, die Schlagzeile
      // gross unten links über dem Strichcode. Ansagen 03.10.2026: „besser zu
      // lesen, etwas grösser"; „in die Mitte geklatscht würde ein Magazin
      // nicht machen"; der rote Rücken links gefiel nicht.
      body = (
        <>
          {photo(styles.fill)}
          <span className={styles.scrimSilver} aria-hidden="true" />
          <span className={styles.logoShadow}>
            {flatLogo('var(--silver)', { left: q(6), right: q(3), top: q(3) })}
          </span>
          <span className={styles.slogan} style={{ top: q(35) }} aria-hidden="true">
            {SLOGAN}
          </span>
          <span
            className={`${styles.headline} ${styles.caps} ${styles.onPhotoStrong}`}
            style={{
              ...size(fitSize(title, 270, 4.6, 6.8)),
              left: q(7),
              right: q(12),
              bottom: q(14),
            }}
          >
            {title}
          </span>
          {barcode({ left: q(7), bottom: q(4), width: q(15), height: q(6) })}
          {meta(
            [issue ? `No. ${issue}` : '', month, 'Berlin'].filter(Boolean).join(' · '),
            { right: q(4), bottom: q(4.6), color: '#fff' },
            styles.metaShadow
          )}
        </>
      );
      break;
    }
    case 'redlogo': {
      // Nach 032c, Ausgabe 45: das Logo rot mitten im Foto.
      body = (
        <>
          {photo(styles.fill)}
          <span className={styles.dim} aria-hidden="true" />
          {meta(
            <>
              {issue ? (
                <>
                  No. {issue}
                  <br />
                </>
              ) : null}
              {month}
            </>,
            { left: q(7), top: q(5), color: '#fff' },
            styles.metaShadow
          )}
          {flatLogo('var(--et-red)', { left: q(6), right: q(2), top: q(52) })}
          <span
            className={`${styles.headline} ${styles.onPhoto}`}
            style={{
              ...size(fitSize(title, 260, 4, 5.4)),
              left: q(14),
              right: q(10),
              top: q(87),
              textAlign: 'center',
            }}
          >
            {title}
          </span>
          {spine}
          {barcode({ left: q(7), bottom: q(4), width: q(15), height: q(6) })}
        </>
      );
      break;
    }
    case 'purple': {
      // Nach Purple: weisser Rahmen, das Logo schwarz, das Foto als Quadrat.
      body = (
        <>
          {flatLogo('var(--et-ink)', { left: q(9), right: q(9), top: q(6) })}
          {meta(issueLine, { left: 0, right: 0, top: q(35), textAlign: 'center' })}
          {photo(styles.square, 0.74)}
          <span
            className={`${styles.headline} ${styles.lower}`}
            style={{ ...size(3.8), left: q(10), right: q(10), top: q(117), textAlign: 'center' }}
          >
            {title}
          </span>
        </>
      );
      break;
    }
    case 'face': {
      // Nach The Face: das Logo im roten Block oben links, das ganze Foto.
      body = (
        <>
          {photo(styles.fill)}
          <span className={styles.scrimBottom} aria-hidden="true" />
          <span className={styles.redBlock}>{logo({ width: q(52) }, styles.logoInBlock)}</span>
          {meta(
            issueStack,
            { right: q(5), top: q(5), textAlign: 'right', color: '#fff' },
            styles.metaShadow
          )}
          <span
            className={`${styles.headline} ${styles.caps} ${styles.onPhoto}`}
            style={{
              ...size(fitSize(title, 420, 5.4, 8.6)),
              left: q(5),
              right: q(8),
              bottom: q(6),
              lineHeight: 1.04,
            }}
          >
            {title}
          </span>
        </>
      );
      break;
    }
    case 'plate': {
      // Teller: farbiges Papier mit rundem Loch, die Schlagzeile gerade
      // darunter (Ansage: „der Text im Kreis ist schwer zu lesen").
      tone = plateTone(issue);
      const rubric = locale === 'de' ? 'Auf dem Teller' : 'On the plate';
      body = (
        <>
          {meta(
            [rubric, issueLine].filter(Boolean).join(' · '),
            { left: 0, right: 0, top: q(3.6), textAlign: 'center' },
            styles.metaWide
          )}
          {logo({ top: q(8), width: q(56) })}
          <span className={styles.hole} aria-hidden="true">
            {photo('', 0.6)}
          </span>
          <span
            className={styles.headline}
            style={{
              ...size(fitSize(title, 360, 4.6, 6.4)),
              left: q(8),
              right: q(8),
              bottom: q(6),
              textAlign: 'center',
            }}
          >
            {title}
          </span>
        </>
      );
      break;
    }
    default: {
      // Rote Fläche nach Carnale und 032c: das Foto im farbigen Rahmen,
      // darunter die Schlagzeile, das Logo unten links. Erst lief das Logo
      // über die ganze Breite — „viel zu gross, man kann die Headline nicht
      // richtig lesen" (Ansage 03.10.2026).
      tone = altTone(issue, ['red', 'yellow']);
      body = (
        <>
          {photo(styles.framed, 0.86)}
          <span className={styles.fieldRow}>
            <span
              className={`${styles.headline} ${styles.caps}`}
              style={size(fitSize(title, 300, 4.6, 7))}
            >
              {title}
            </span>
            <span className={styles.fieldMeta} aria-hidden="true" data-cover-folio="">
              {issueStack}
            </span>
          </span>
          {logo({ left: q(7), bottom: q(5), width: q(52) }, styles.logoAt)}
        </>
      );
    }
  }

  // Der Look steht nur im Datenattribut, nicht als Klasse: Klassennamen
  // wie `band` gehören hier den Bauteilen.
  const className = [styles.cover, tone ? TONES[tone] : '', compact ? styles.compact : '']
    .filter(Boolean)
    .join(' ');

  return (
    // `data-magazine-cover`: MagazineLink opens exactly this cover.
    <span
      className={className}
      data-magazine-cover=""
      data-cover-look={look}
      data-cover-issue={issue ?? undefined}
    >
      {body}
      <span className={styles.sheen} aria-hidden="true" />
    </span>
  );
}
