'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import styles from './SignInReward.module.css';

/** How long the message stays before it slides back out. The countdown bar in
 *  the button drains over exactly this, so the reader can see it coming rather
 *  than have it vanish mid-sentence. */
const DONE_VISIBLE_MS = 5000;
/** Must match the leaving keyframes — the card stays mounted while it goes. */
const LEAVE_MS = 240;

const copy = {
  de: {
    kicker: 'Starter Pack eingelöst',
    headline: 'Karten liegen im Album',
    body: 'Dein Starter Pack ist da. Jede weitere Karte drehst du vor Ort selbst um — steh vor dem Laden, tipp sie an.',
    cardAlt: 'Eat This Starter Pack',
    action: 'Weiter zur Map',
  },
  en: {
    kicker: 'Starter Pack claimed',
    headline: 'Cards in your album',
    body: 'Your Starter Pack has landed. Every other card you turn over on site yourself — stand at the spot, tap it.',
    cardAlt: 'Eat This Starter Pack',
    action: 'Back to the map',
  },
} as const;

interface Props {
  /** Eine Anmeldung ist gerade in DIESER Sitzung durchgegangen. Nicht „ein
   *  angemeldeter Besucher öffnet die Karte" — das ist kein Ereignis und
   *  bekommt keine Einblendung. */
  justSignedIn: boolean;
}

/**
 * Was die Anmeldung wert war, gesagt, wo es nicht zu übersehen ist.
 *
 * Bis zum 06.09.2026 zählte dieser Schirm Spots: „Deine Map ist gewachsen",
 * fünfzig neue Punkte, dazu der eine Spot, den die Anmeldung freischaltete.
 * Das ist weg, weil die Map nicht mehr wächst — sie liegt für jeden ganz da.
 *
 * Was eine Anmeldung heute ändert, ist das Album: aufgedeckte Karten bleiben.
 * Also sagt der Schirm genau das, und er nennt dabei KEINE Zahl. Der Stand
 * gehört auf die Spielerkarte im Profil; eine Zahl hier hieße, den Fortschritt
 * an zwei Orten zu führen, und der zweite ist immer der veraltete (siehe die
 * Berlin-Zahl, die aus demselben Grund am 04.09.2026 entfiel).
 *
 * Der Schleier fängt keine Klicks: die Karte darunter bleibt bedienbar. Das
 * ist eine Meldung, kein Dialog — der Knopf ist die Höflichkeit, sie früher
 * wegzuräumen, keine Schranke.
 */
export default function SignInReward({ justSignedIn }: Props) {
  const locale = useLocale();
  const t = copy[locale === routing.defaultLocale ? 'de' : 'en'];

  const [phase, setPhase] = useState<'idle' | 'done' | 'leaving'>('idle');

  useEffect(() => {
    if (justSignedIn) setPhase('done');
  }, [justSignedIn]);

  useEffect(() => {
    if (phase === 'done') {
      const id = window.setTimeout(() => setPhase('leaving'), DONE_VISIBLE_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === 'leaving') {
      const id = window.setTimeout(() => setPhase('idle'), LEAVE_MS);
      return () => window.clearTimeout(id);
    }
  }, [phase]);

  if (phase === 'idle') return null;
  const leaving = phase === 'leaving';

  return (
    <div
      className={`${styles.layer}${leaving ? ` ${styles.layerLeaving}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={`${styles.panel}${leaving ? ` ${styles.panelLeaving}` : ''}`}>
        {/* Das Objekt, das der Leser gerade eingelöst hat — dasselbe Pack, das
            ihm die Anmeldung angeboten hat. Es überlappt die Oberkante, damit
            das Panel wie etwas aussieht, das gerade ankommt. */}
        <span className={styles.pack} aria-hidden="true">
          <Image
            className={styles.packImg}
            src="/pics/booster/booster_free.webp"
            alt=""
            fill
            sizes="92px"
          />
        </span>

        <span className={styles.kicker}>{t.kicker}</span>
        <p className={styles.headline}>{t.headline}</p>
        <p className={styles.body}>{t.body}</p>

        <div className={styles.actionWrap}>
          <button type="button" className={styles.action} onClick={() => setPhase('leaving')}>
            {t.action}
          </button>
          {/* Läuft genau so lange wie die Meldung steht — eine Zahl, zwei
              Orte, deshalb aus derselben Konstante. */}
          <span
            className={styles.countdown}
            style={{ animationDuration: `${DONE_VISIBLE_MS}ms` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
