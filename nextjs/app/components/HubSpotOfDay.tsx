import type { CSSProperties } from 'react';
import { normalizeName } from '@/lib/normalizeName';
import type { HomeSpot } from '@/lib/home/getHomeData';
import { CELL, calendarMonth, sketchGrid } from '@/lib/home/calendarMonth';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import MapIntentLink from './MapIntentLink';
import styles from './HubSpotOfDay.module.css';

type Locale = 'de' | 'en';

interface Props {
  spot: HomeSpot;
  /** Server date (YYYY-MM-DD) the pick is keyed to. */
  today: string;
  locale: Locale;
}

const COPY = {
  de: { title: 'Spot des Tages', notes: 'Notizen:', map: 'auf der Map' },
  en: { title: 'Spot of the day', notes: 'Notes:', map: 'on the map' },
};

/** Formatted at noon UTC so no zone or DST shift can move a label off its day. */
function formatDay(day: string, locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`));
}

/** Mo … So — 5 to 11 January 2026 run Monday to Sunday. */
function weekdays(locale: Locale) {
  return [5, 6, 7, 8, 9, 10, 11].map((d) =>
    formatDay(`2026-01-${String(d).padStart(2, '0')}`, locale, { weekday: 'short' }).replace(
      '.',
      ''
    )
  );
}

/**
 * Spot des Tages als Wandkalender (01.10.2026, nach einer Vorlage des
 * Betreibers): eine Tafel wie Starter Pack und Frag Remy, oben das Foto des
 * Spots, darüber hinweg der Monat in weißen Versalien, das Jahr senkrecht
 * daneben, darunter das Monatsraster mit Linien wie von Hand. Vergangene Tage
 * treten zurück, heute ist ein gelbes Feld, das beim Hereinscrollen wie ein
 * Stempel aufsetzt. Name und warum stehen oben auf derselben Tafel, über dem
 * Kalender (Ansage 01.10.: „drin und drüber"). Kein Knopf: die ganze Tafel —
 * und damit der Tag — führt zur Map.
 *
 * Verworfen (01.10.): ein graues Blatt mit grellen Linien, ein weißes Blatt,
 * ein Blatt vom Vormonat, das an der Bindung wegklappt („billig"), der
 * Knopf „Zur Map", ein gelber Marker hinter dem Bezirk, der Bezirk selbst,
 * ein Pin im heutigen Feld und ein gelber Monat.
 */
export default function HubSpotOfDay({ spot, today, locale }: Props) {
  const t = COPY[locale];
  const month = calendarMonth(today);
  const monthName = formatDay(today, locale, { month: 'long' });
  const name = normalizeName(spot.name);
  const headStyle = { '--letters': monthName.length } as CSSProperties;

  return (
    <section id="hub-spot" className="homeV2 hv-section hv-wrap" data-hub-spot="">
      <article className={styles.spot}>
        <div className={`hv-head ${styles.titleRow}`}>
          <h2 className="hv-title">
            <span className="hv-mk" aria-hidden="true" />
            {t.title}
          </h2>
        </div>
        <MapIntentLink
          href={`/map?r=${spot.slug}`}
          rel="nofollow"
          className={styles.card}
          aria-label={`${name}, ${t.map}`}
        >
          <span className={styles.board} data-calendar-board="">
            <span className={styles.body}>
              <span className={styles.name}>{name}</span>
              {/* The reason this spot is the day's pick. */}
              {spot.sub && <span className={styles.sub}>{spot.sub}</span>}
            </span>

            <span className={styles.head} style={headStyle}>
              <span className={styles.top}>
                {spot.image ? (
                  <span className={`hv-photo ${styles.photo}`}>
                    {/* Sanity serves the responsive, format-negotiated variants
                        directly; the App Hosting image proxy would redo them. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.image}
                      src={sanityImageLoader({ src: spot.image, width: 960, quality: 75 })}
                      srcSet={sanitySrcSet(spot.image, [640, 750, 960, 1280], 75)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width:767.98px) 84vw, 40vw"
                    />
                  </span>
                ) : (
                  <span className={styles.photoBlank} />
                )}
                <span className={styles.year} aria-hidden="true">
                  {String(month.year)
                    .split('')
                    .map((digit, i) => (
                      <span key={i}>{digit}</span>
                    ))}
                </span>
              </span>
              <time className={styles.month} dateTime={today}>
                <span aria-hidden="true">{monthName}</span>
                <span className={styles.srOnly}>
                  {formatDay(today, locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </time>
            </span>

            <span className={styles.calendar} aria-hidden="true">
              <span className={styles.weekdays}>
                {weekdays(locale).map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </span>
              <span className={styles.days} style={{ '--rows': month.rows } as CSSProperties}>
                <svg
                  className={styles.lines}
                  viewBox={`0 0 ${7 * CELL} ${month.rows * CELL}`}
                  preserveAspectRatio="none"
                >
                  <path d={sketchGrid(month)} />
                </svg>
                {month.leading >= 2 && (
                  <span
                    className={styles.notes}
                    style={{ gridColumn: `1 / span ${month.leading}` }}
                  >
                    {t.notes}
                  </span>
                )}
                {Array.from({ length: month.days }, (_, i) => i + 1).map((day) => {
                  const kind =
                    day === month.today
                      ? styles.today
                      : day < month.today
                        ? styles.past
                        : styles.day;
                  return (
                    <span
                      key={day}
                      className={kind}
                      style={
                        day === 1 && month.leading
                          ? { gridColumnStart: month.leading + 1 }
                          : undefined
                      }
                    >
                      {day}
                    </span>
                  );
                })}
              </span>
            </span>

            <span className={styles.binding} aria-hidden="true" />
          </span>
        </MapIntentLink>
      </article>
    </section>
  );
}
