'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import styles from './onboarding.module.css';

// Sanity card previews used in step 3. CDN-public URLs, narrow viewport
// requested via ?w=400. If a specific dish goes out of catalog the image
// 404s gracefully (alt text takes over).
const PREVIEW_CARDS = [
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=400&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/a12687e545c871243fe9e7648e1d649d03fe4a8a-1449x2163.png?w=400&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/f56c68c3f207f5a62a85ad6dfd2db1eed95c2188-1449x2163.png?w=400&auto=format&q=80',
];

const TOTAL_STEPS = 5; // 0..4

export default function OnboardingOverlay() {
  const { user, updateDisplayName } = useAuth();
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);
  const [name, setName]       = useState('');

  const goTo = useCallback((s: number) => setStep(s), []);

  const show = useCallback(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('onboardingComplete')) return;
    setStep(user?.displayName ? 1 : 0);
    setName('');
    setVisible(true);
  }, [user]);

  const skipToFinal = useCallback(() => {
    setStep(4);
  }, []);

  const finish = useCallback(() => {
    setVisible(false);
    localStorage.setItem('onboardingComplete', '1');
    const profileHref = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
    window.location.assign(profileHref);
  }, [locale]);

  useEffect(() => {
    window._obGoTo        = goTo;
    window.showOnboarding = show;
  }, [goTo, show]);

  // Auto-show after auth resolves (replaces the auth:magicLinkComplete
  // dispatch which got broken when /welcome strips signIn URL params).
  useEffect(() => {
    if (!user) return;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('onboardingComplete')) return;
    show();
  }, [user, show]);

  const handleNameSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await updateDisplayName(trimmed);
    } catch {
      // non-fatal — still advance
    }
    goTo(1);
  }, [name, updateDisplayName, goTo]);

  if (!visible) return null;

  const initial = (name.trim() || user?.displayName || '?').charAt(0).toUpperCase();

  return (
    <div className={`${styles.overlay} ${styles.overlayVisible}`} role="dialog" aria-modal="true" aria-label="Eat This onboarding">
      {/* Progress dots — show on steps 1..4, not on the name step */}
      {step > 0 && (
        <div className={styles.progress} aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${step === i + 1 ? styles.dotActive : ''}`}
            />
          ))}
        </div>
      )}

      {/* Skip — visible on steps 1..3 */}
      {step >= 1 && step <= 3 && (
        <button type="button" className={styles.skip} onClick={skipToFinal}>
          Überspringen
        </button>
      )}

      {step === 0 && (
        <div className={styles.step}>
          <div className={styles.visual}>
            <div className={styles.nameVisual}>{initial}</div>
          </div>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Willkommen</p>
            <h1 className={styles.title}>Wie heißt du?</h1>
            <p className={styles.body}>
              Wir personalisieren damit deine Karten und Empfehlungen.
            </p>
          </div>
          <form onSubmit={handleNameSubmit} className={styles.nameForm}>
            <input
              className={styles.nameInput}
              type="text"
              placeholder="Dein Vorname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="given-name"
              maxLength={40}
            />
            <button type="submit" className={styles.cta} disabled={!name.trim()}>
              Weiter
            </button>
          </form>
        </div>
      )}

      {step === 1 && (
        <div className={styles.step}>
          <div className={styles.visual}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pics/hero_mobile.webp"
              alt=""
              className={styles.heroImg}
              loading="eager"
            />
          </div>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Berlin · Food Guide</p>
            <h1 className={styles.title}>Nur das Beste, was du essen kannst.</h1>
            <p className={styles.body}>
              Über 150 Must Eats, kuratiert. Keine Algorithmen, keine Sponsored Posts.
            </p>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.cta} onClick={() => goTo(2)}>
              Weiter
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.step}>
          <div className={styles.visual}>
            <div className={styles.mapVisual} aria-hidden="true">
              <span className={styles.mapPin} style={{ left: '32%', top: '38%', animationDelay: '0.05s' }}>
                <PinSvg />
              </span>
              <span className={styles.mapPin} style={{ left: '56%', top: '52%', animationDelay: '0.20s' }}>
                <PinSvg />
              </span>
              <span className={styles.mapPin} style={{ left: '72%', top: '32%', animationDelay: '0.35s' }}>
                <PinSvg />
              </span>
              <span className={styles.mapPin} style={{ left: '44%', top: '70%', animationDelay: '0.50s' }}>
                <PinSvg />
              </span>
            </div>
          </div>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Die Map</p>
            <h1 className={styles.title}>Eine Karte. Alle Spots.</h1>
            <p className={styles.body}>
              Filtere nach Bezirk, Kategorie oder was gerade offen ist.
            </p>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.cta} onClick={() => goTo(3)}>
              Weiter
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={styles.step}>
          <div className={styles.visual}>
            <div className={styles.cardStack}>
              {PREVIEW_CARDS.map((url, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={i} src={url} alt="" className={styles.cardStackItem} loading="eager" />
              ))}
            </div>
          </div>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Sammeln</p>
            <h1 className={styles.title}>Jedes Gericht ist eine Karte.</h1>
            <p className={styles.body}>
              Du startest mit 10 zufälligen Must Eats. Sammle alle, wenn du kannst.
            </p>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.cta} onClick={() => goTo(4)}>
              Weiter
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className={styles.step}>
          <div className={styles.visual}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pics/booster/booster1.webp" alt="" className={styles.packVisual} />
              <div className={styles.starburst}>
                <span className={styles.starburstNum}>10</span>
                <span>Cards</span>
              </div>
            </div>
          </div>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Geschenkt</p>
            <h1 className={styles.title}>Dein Booster Pack ist bereit.</h1>
            <p className={styles.body}>
              10 zufällige Must Eat Cards — dein persönlicher Start-Stack.
            </p>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.cta} onClick={finish}>
              Pack öffnen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PinSvg() {
  return (
    <svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path
        d="M12 0C5.373 0 0 5.373 0 12c0 7.5 12 16 12 16s12-8.5 12-16C24 5.373 18.627 0 12 0z"
        fill="#B71C1C"
      />
      <circle cx="12" cy="12" r="4.5" fill="#FFFFFF" />
    </svg>
  );
}

declare global {
  interface Window {
    _obGoTo?:        (step: number) => void;
    showOnboarding?: () => void;
  }
}
