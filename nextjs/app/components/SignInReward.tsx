'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { authScreenActive, subscribeAuthScreen } from './AuthScreen';
import { subscribeStarterPackGranted } from '@/lib/auth/signInArrival';
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
    headline: '10 direkt im Deck. 10 weitere warten draußen in Berlin auf dich.',
    body: 'Die zehn draußen deckst du vor Ort auf — im Album stehen sie schon mit Nummer und Lokal.',
    cardAlt: 'Eat This Starter Pack',
    action: "Los geht's",
  },
  en: {
    kicker: 'Starter Pack claimed',
    headline: '10 straight into your deck. 10 more are waiting out in Berlin for you.',
    body: 'You flip those ten at the spot — the album already lists them by number and place.',
    cardAlt: 'Eat This Starter Pack',
    action: "Let's go",
  },
} as const;

/**
 * Was die Anmeldung wert war, gesagt, wo es nicht zu übersehen ist.
 *
 * Bis zum 06.09.2026 zählte dieser Schirm Spots: „Deine Map ist gewachsen",
 * fünfzig neue Punkte, dazu der eine Spot, den die Anmeldung freischaltete.
 * Das ist weg, weil die Map nicht mehr wächst — sie liegt für jeden ganz da.
 *
 * Was eine Anmeldung heute bringt, ist das Starter Pack: zehn Karten im Deck
 * und zehn, die draußen liegen. Genau diese Teilung ist die Nachricht — die
 * erste Hälfte ist das Geschenk, die zweite der Grund weiterzumachen. Ein
 * laufender Punktestand gehört dagegen NICHT hierher, sondern auf die
 * Spielerkarte im Profil: Fortschritt an zwei Orten geführt heißt, dass der
 * zweite immer der veraltete ist (siehe die Berlin-Zahl, die aus demselben
 * Grund am 04.09.2026 entfiel).
 *
 * Hängt an der Vergabe, nicht am Anmeldevorgang (siehe lib/auth/signInArrival):
 * damit erscheint die Einblendung auf JEDEM Weg — Magic-Link, Google-Popup,
 * Google-Redirect — und nur bei einem Konto, das sein Pack wirklich gerade
 * bekommen hat. Bis zum 20.09.2026 hing sie an einem Zustandswechsel im
 * selben Dokument und blieb deshalb auf allen Wegen außer dem Desktop-Popup
 * aus, während sie Wiederkehrern ein Pack meldete, das sie längst hatten.
 *
 * Steht darum auch nicht mehr in der Karte, sondern im Locale-Layout: die
 * Anmeldung endet dort, wo sie angefangen hat (Continue-URL), und das ist
 * routinemäßig die Startseite oder eine Spot-Seite, nicht /map.
 *
 * Der Schleier fängt keine Klicks: die Seite darunter bleibt bedienbar. Das
 * ist eine Meldung, kein Dialog — der Knopf ist die Höflichkeit, sie früher
 * wegzuräumen, keine Schranke.
 */
export default function SignInReward() {
  const locale = useLocale();
  const t = copy[locale === routing.defaultLocale ? 'de' : 'en'];

  const [phase, setPhase] = useState<'idle' | 'done' | 'leaving'>('idle');

  /* Die Meldung wird EINMAL verbraucht, nicht als Zustand gehalten: der Abgang
     endet wieder auf `idle`, und ein „liegt ein Pack vor?"-Effekt würde die
     Einblendung von dort aus endlos neu starten.

     Sie wartet ausserdem, falls ein Wartescreen über der Seite liegt — der ist
     fast deckend, die fünf Sekunden liefen sonst darunter ab. */
  useEffect(() => {
    let stopWaiting: (() => void) | undefined;
    const unsubscribe = subscribeStarterPackGranted(() => {
      if (!authScreenActive()) {
        setPhase('done');
        return;
      }
      stopWaiting = subscribeAuthScreen((active) => {
        if (active) return;
        stopWaiting?.();
        stopWaiting = undefined;
        setPhase('done');
      });
    });
    return () => {
      unsubscribe();
      stopWaiting?.();
    };
  }, []);

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
