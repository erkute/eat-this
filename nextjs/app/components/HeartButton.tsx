'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/map/useFavorites';
import { useHeartCount } from '@/lib/map/useHeartCount';
import { heartLabel } from '@/lib/map/heartLabel';
import HeartDraw from '@/app/components/HeartDraw';
import styles from './HeartButton.module.css';

interface HeartButtonProps {
  restaurantId: string;
  /** Der Name, wie er in den Favoriten landet (Sanity). */
  name: string;
  /** Der Name, wie er auf der Seite steht („Ich ♥ <Name>"). */
  displayName: string;
  slug?: string;
  photo?: string;
  district?: string;
  locale: string;
}

/** Der Tipp, bevor der Server ihn bestätigt hat: Herz und Zahl stehen schon
 *  so da, wie sie gleich sein werden. `base` ist die Zahl beim Tippen. */
interface Optimistic {
  hearted: boolean;
  base: number;
  settled: boolean;
}

/* Bestätigt der Server, kommt die neue Zahl über den Live-Zähler meist gleich
   hinterher. Bewegt er sich nicht — etwa weil dasselbe Herz schon von einem
   anderen Gerät stand —, gilt nach dieser Frist wieder der Zähler. */
const SETTLE_MS = 4000;

// Personal "heart this spot" toggle for the SEO restaurant page (a client
// island on an otherwise-static page). A heart IS a saved spot — reuses
// useFavorites, so the same toggle drives the map detail too, and hearting here
// bumps the public count (live via useHeartCount, hidden below 1).
// Seit 07.10.2026 ein Satz: „Ich ♥ <Name>" — das Herz ist das Verb, wie bei
// I ♥ NY, und gilt damit eindeutig dem Spot (gewählt im Herz-Labor; am Foto,
// am Bezirk und am Namen über den Angaben war es abgelehnt). Es steht nach
// dem Steckbrief, über „Im Magazin". Beim eigenen Tipp zeichnet es sich
// selbst (HeartDraw).
// Optimistisch: Herz und Zahl springen beim Tippen um, nicht erst nach
// /api/heart; schlägt der Aufruf fehl, springen sie zurück. Solange einer
// läuft, zählt kein zweiter Tipp.
// Anon tap opens the shared login modal (handled inside useFavorites).
// See docs/specs/2026-06-09-hearts-design.md.
export default function HeartButton({
  restaurantId,
  name,
  displayName,
  slug,
  photo,
  district,
  locale,
}: HeartButtonProps) {
  const de = locale !== 'en';
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const { favoriteIds, toggle } = useFavorites(user?.uid ?? null);
  const { count } = useHeartCount(restaurantId);
  const [optimistic, setOptimistic] = useState<Optimistic | null>(null);
  // Zählt die eigenen Tipps dieses Besuchs: nur sie lassen das Herz sich
  // zeichnen und die Zahl einstempeln — nicht das Laden der Favoriten.
  const [taps, setTaps] = useState(0);

  // Hat sich der Live-Zähler nach der Bestätigung bewegt, gilt er wieder.
  const live = optimistic && !(optimistic.settled && count !== optimistic.base) ? optimistic : null;
  const hearted = live ? live.hearted : favoriteIds.has(restaurantId);
  const shown = live ? Math.max(0, live.base + (live.hearted ? 1 : -1)) : count;
  const pending = Boolean(optimistic && !optimistic.settled);

  useEffect(() => {
    if (!optimistic?.settled) return;
    const t = window.setTimeout(() => setOptimistic(null), SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [optimistic]);

  const onTap = async () => {
    const spot = { _id: restaurantId, name, slug, photo, district };
    // Ohne Konto entscheidet useFavorites: Login-Modal, das Herz wartet.
    if (!signedIn) {
      void toggle(spot);
      return;
    }
    if (pending) return;
    setOptimistic({ hearted: !hearted, base: count, settled: false });
    setTaps((n) => n + 1);
    const ok = await toggle(spot);
    setOptimistic((o) => (ok && o ? { ...o, settled: true } : null));
  };

  const countLabel = heartLabel(shown, locale);
  const action = hearted
    ? de
      ? `Herz für ${displayName} entfernen`
      : `Remove heart for ${displayName}`
    : de
      ? `${displayName} herzen`
      : `Heart ${displayName}`;

  return (
    <section className={styles.love} aria-label={de ? 'Herz' : 'Heart'}>
      {/* „Ich ♥" bleibt beisammen, der Name rutscht als Ganzes in die nächste
          Zeile — nie „ICH ♥ KOLO / COFFEE". */}
      <p className={styles.line}>
        <span className={styles.keep}>
          {de ? 'Ich' : 'I'}{' '}
          <button
            type="button"
            className={styles.btn}
            aria-pressed={hearted}
            aria-busy={pending || undefined}
            aria-label={countLabel ? `${action}, ${countLabel}` : action}
            onClick={() => {
              void onTap();
            }}
          >
            <HeartDraw hearted={hearted} play={taps} className={styles.glyph} />
          </button>
        </span>{' '}
        <span className={styles.name}>{displayName}</span>
      </p>
      {countLabel && (
        <p
          key={taps}
          className={taps > 0 ? `${styles.count} ${styles.stamp}` : styles.count}
          data-heart-count=""
        >
          {countLabel}
        </p>
      )}
    </section>
  );
}
