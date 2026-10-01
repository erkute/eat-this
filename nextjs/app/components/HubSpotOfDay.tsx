'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { normalizeName } from '@/lib/normalizeName';
import type { HomeSpot } from '@/lib/home/getHomeData';
import { previousDay } from '@/lib/home/pickSpotOfDay';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import MapIntentLink from './MapIntentLink';
import styles from './HubSpotOfDay.module.css';

gsap.registerPlugin(useGSAP);

interface Props {
  spot: HomeSpot;
  /** Yesterday's pick, printed on the sheet that tears off. */
  yesterday: HomeSpot | null;
  /** Server date (YYYY-MM-DD) the pick is keyed to. */
  today: string;
  locale: 'de' | 'en';
}

const COPY = {
  de: { title: 'Spot des Tages', cta: 'Zur Map' },
  en: { title: 'Spot of the day', cta: 'To the map' },
};

/** The calendar sheet's head: month, day, weekday. Pinned to noon UTC so no
 *  zone or DST shift can move the label off the day it labels. */
function sheetDate(day: string, locale: 'de' | 'en') {
  const date = new Date(`${day}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
      ...options,
      timeZone: 'UTC',
    }).format(date);
  return {
    month: format({ month: 'long' }),
    day: format({ day: 'numeric' }),
    weekday: format({ weekday: 'long' }),
  };
}

function SheetHead({ day, locale }: { day: string; locale: 'de' | 'en' }) {
  const { month, day: number, weekday } = sheetDate(day, locale);
  return (
    <span className={styles.head}>
      <span className={styles.month}>{month}</span>
      <span className={styles.day}>{number}</span>
      <span className={styles.weekday}>{weekday}</span>
    </span>
  );
}

/** One day's sheet below the date: the photo, where, what, why, and the
 *  way to the map. Today's and yesterday's sheet share it. */
function SheetPage({ spot, cta, eager = false }: { spot: HomeSpot; cta: string; eager?: boolean }) {
  return (
    <span className={`${styles.page} ${spot.image ? '' : styles.pageTextOnly}`}>
      {spot.image && (
        <span className={`hv-photo ${styles.photo}`}>
          {/* Sanity serves the responsive, format-negotiated variants
              directly; the App Hosting image proxy would redo them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.image}
            src={sanityImageLoader({ src: spot.image, width: 960, quality: 75 })}
            srcSet={sanitySrcSet(spot.image, [640, 750, 960, 1280], 75)}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            sizes="(max-width:767.98px) 92vw, 45vw"
          />
        </span>
      )}
      <span className={styles.body}>
        {spot.district && <span className={`hv-kicker ${styles.kicker}`}>{spot.district}</span>}
        <span className={styles.name}>{normalizeName(spot.name)}</span>
        {/* The reason this spot is the day's pick. */}
        {spot.sub && <span className={styles.sub}>{spot.sub}</span>}
        <span className={styles.cta} data-press="">
          {cta}
        </span>
      </span>
    </span>
  );
}

/**
 * Spot des Tages als Abreisskalender (30.09.2026): der ganze Spot steht auf
 * dem Blatt von heute — Foto, Bezirk, Name, Grund, der Weg zur Map. Kommt die Tafel ins Bild, reisst das Blatt von gestern ab,
 * kippt weg und faellt heraus. Ohne JS, mit reduzierter Bewegung oder wenn
 * die Tafel beim Laden schon zu sehen ist, liegt einfach das heutige Blatt da.
 */
export default function HubSpotOfDay({ spot, yesterday, today, locale }: Props) {
  const t = COPY[locale];
  const calendarRef = useRef<HTMLDivElement>(null);
  const tornRef = useRef<HTMLSpanElement>(null);
  // Only mounted on the client, and only when there is a tear to watch.
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (calendar.getBoundingClientRect().top < window.innerHeight) return;
    setCovered(true);
  }, []);

  useGSAP(
    () => {
      const calendar = calendarRef.current;
      const sheet = tornRef.current;
      if (!covered || !calendar || !sheet) return;
      const tear = gsap
        .timeline({ paused: true, onComplete: () => setCovered(false) })
        .set(sheet, { transformOrigin: '0% 0%', transformPerspective: 900 })
        // A tug: the sheet lifts off the pad towards the viewer…
        .to(sheet, { rotationX: 20, rotation: -2, duration: 0.24, ease: 'power2.out' })
        // …rips free at the binding and swings down on its left corner…
        .to(sheet, { rotationX: 8, rotation: 10, y: 14, duration: 0.2, ease: 'power2.in' })
        // …and drops out of the picture.
        .to(sheet, {
          y: () => window.innerHeight + sheet.offsetHeight,
          x: 60,
          rotation: 28,
          rotationX: 0,
          duration: 0.95,
          ease: 'power2.in',
        });
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          tear.play();
        },
        { rootMargin: '0px 0px -35% 0px' }
      );
      io.observe(calendar);
      return () => io.disconnect();
    },
    { dependencies: [covered], scope: calendarRef }
  );

  return (
    <section className="homeV2 hv-section hv-wrap" data-hub-spot="">
      <article className={styles.spot}>
        <div className={`hv-head ${styles.titleRow}`}>
          <h2 className="hv-title">
            <span className="hv-mk" aria-hidden="true" />
            {t.title}
          </h2>
        </div>
        {/* Everything about the pick is on today's sheet: the photo, where,
            what, why, and the way to the map. The whole sheet is the link. */}
        <MapIntentLink href={`/map?r=${spot.slug}`} rel="nofollow" className={styles.card}>
          <div ref={calendarRef} className={styles.calendar}>
            <span className={styles.sheet}>
              <time dateTime={today}>
                <SheetHead day={today} locale={locale} />
              </time>
              <SheetPage spot={spot} cta={t.cta} />
            </span>
            {covered && (
              <span ref={tornRef} className={`${styles.sheet} ${styles.torn}`} aria-hidden="true">
                <SheetHead day={previousDay(today)} locale={locale} />
                {yesterday ? (
                  // Lies on top first: its photo must not still be loading.
                  <SheetPage spot={yesterday} cta={t.cta} eager />
                ) : (
                  <span className={styles.blank} />
                )}
              </span>
            )}
            <span className={styles.binding} aria-hidden="true" />
          </div>
        </MapIntentLink>
      </article>
    </section>
  );
}
