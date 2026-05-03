'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { type AvatarChoice } from '@/lib/firebase/useUserProfile';
import styles from './onboarding.module.css';

// Five visually distinct Must-Eat card PNGs from Sanity production for the
// Trust-step fan visual.
const SAMPLE_CARDS = [
  'https://cdn.sanity.io/images/ehwjnjr2/production/b4d268a43fe8bf62708f6da1c36de049a17c225a-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/5c11f85f893be7f80dc1b57abc5ac20725a2c479-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/70e13f906df3aa37dd062fc6d83034ded924b1ae-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/1f84f4db53a6812e1f0790f0bb3fbefc8470ee4e-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/eb92a901eb444f36cb17f4ad7667c69f4227421a-1449x2163.png?w=600&auto=format&q=80',
];

const AVATAR_CHOICES: AvatarChoice[] = [1, 2, 3];
const TOTAL_STEPS = 5;
const FINAL_STEP  = 4;

// mulberry32-derived deterministic RNG for fly-in offsets (server/client safe).
function seedRand(seed: number, i: number, salt: number): number {
  let t = ((seed + 1) * 1000003 + i * 337 + salt * 7 + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface OnboardingFlowProps {
  initialName:   string;
  initialAvatar: AvatarChoice;
  onUpdateName:  (name: string) => Promise<void> | void;
  onSetAvatar:   (choice: AvatarChoice) => Promise<void> | void;
  onFinish:      () => Promise<void> | void;
}

export default function OnboardingFlow({
  initialName,
  initialAvatar,
  onUpdateName,
  onSetAvatar,
  onFinish,
}: OnboardingFlowProps) {
  const reduced = useReducedMotion();
  const [step, setStep]             = useState(0);
  const [name, setName]             = useState(initialName);
  const [avatarPick, setAvatarPick] = useState<AvatarChoice>(initialAvatar);

  const goTo        = useCallback((s: number) => setStep(s), []);
  const skipToFinal = useCallback(() => setStep(FINAL_STEP), []);

  const handleIdentitySubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed !== initialName) {
      try { await onUpdateName(trimmed); } catch { /* non-fatal */ }
    }
    // Always persist the avatar — even if it equals the UID-derived default,
    // we want it explicitly saved so later reads return the user's choice
    // instead of falling back to defaultAvatarFromUid which can read as
    // "random" if the user expected their selection to stick.
    try { await onSetAvatar(avatarPick); } catch { /* non-fatal */ }
    goTo(4);
  }, [name, avatarPick, initialName, onUpdateName, onSetAvatar, goTo]);

  const ctaIdentityDisabled = !name.trim();

  return (
    <div
      className={`${styles.overlay} ${styles.overlayVisible}`}
      data-step={step === 0 ? 'hook' : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Eat This onboarding"
    >
      {step === 0 && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/login/Black screen.webp"
            alt=""
            className={styles.hookFullBg}
            draggable={false}
          />
          <div className={styles.hookFullDarken} aria-hidden="true" />
        </>
      )}

      <BrandHeader />

      <div className={styles.progress} aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span key={i} className={`${styles.dot} ${step === i ? styles.dotActive : ''}`} />
        ))}
      </div>

      {step >= 1 && step < FINAL_STEP && (
        <button type="button" className={styles.skip} onClick={skipToFinal}>
          Überspringen
        </button>
      )}

      <AnimatePresence mode="wait" initial={false}>

        {/* ── 1. Hook (full-bleed image at overlay level, text overlay) ───── */}
        {step === 0 && (
          <StepShell key="hook">
            <div className={styles.hookSpacer} aria-hidden="true" />
            <StepContent>
              <Eyebrow>Berlin&apos;s Must Eats</Eyebrow>
              <Title className={styles.titleLarge}>We tell you<br />what to eat</Title>
            </StepContent>
            <Footer>
              <button type="button" className={styles.cta} onClick={() => goTo(1)}>Weiter</button>
            </Footer>
          </StepShell>
        )}

        {/* ── 2. Map ──────────────────────────────────────────────────────── */}
        {step === 1 && (
          <StepShell key="map">
            <div className={styles.mapStage}>
              <div className={styles.mapPair}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pics/map-teaser/map_must-eat.png"
                  alt="Must-Eat Karte"
                  className={`${styles.mapImg} ${styles.mapImgLeft}`}
                  draggable={false}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pics/map-teaser/map_liste.png"
                  alt="Karte mit Restaurant-Liste"
                  className={`${styles.mapImg} ${styles.mapImgRight}`}
                  draggable={false}
                />
              </div>
            </div>
            <StepContent>
              <Eyebrow>Die Map</Eyebrow>
              <Title>Dein persönlicher<br />Food Guide für Berlin</Title>
              <Body>
                Über 200 kuratierte Restaurants, Cafes und Bars. Entdecke die
                Must Eats und vervollständige dein Deck.
              </Body>
            </StepContent>
            <Footer>
              <button type="button" className={styles.cta} onClick={() => goTo(2)}>Weiter</button>
            </Footer>
          </StepShell>
        )}

        {/* ── 3. Trust (the deck — wider fan, varied cards) ───────────────── */}
        {step === 2 && (
          <StepShell key="trust">
            <CardFlyIn reduced={!!reduced} />
            <StepContent>
              <Eyebrow>Das Deck</Eyebrow>
              <Title>Bestell es.<br />Iss es. Sammel es.</Title>
              <Body>
                Jedes Must Eat in deiner Sammlung steht für eine Empfehlung,
                hinter der wir stehen.
              </Body>
            </StepContent>
            <Footer>
              <button type="button" className={styles.cta} onClick={() => goTo(3)}>Weiter</button>
            </Footer>
          </StepShell>
        )}

        {/* ── 4. Identity (Name + Avatar) ─────────────────────────────────── */}
        {step === 3 && (
          <StepShell key="identity">
            <div className={styles.avatarHero}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={avatarPick}
                  src={`/pics/avatar/${avatarPick}.webp`}
                  alt=""
                  className={styles.avatarHeroImg}
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -8 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                />
              </AnimatePresence>
            </div>
            <StepContent>
              <Eyebrow>Player One</Eyebrow>
              <Title>Wähl deinen<br />Character</Title>
              <input
                className={styles.nameInput}
                type="text"
                placeholder="Dein Vorname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !ctaIdentityDisabled) {
                    e.preventDefault();
                    void handleIdentitySubmit();
                  }
                }}
                autoFocus
                autoComplete="given-name"
                maxLength={40}
              />
              <div className={styles.avatarRow} role="radiogroup" aria-label="Avatar auswählen">
                {AVATAR_CHOICES.map((choice) => {
                  const isActive = choice === avatarPick;
                  return (
                    <button
                      key={choice}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      aria-label={`Avatar ${choice}`}
                      className={`${styles.avatarChoice}${isActive ? ` ${styles.avatarChoiceActive}` : ''}`}
                      onClick={() => setAvatarPick(choice)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/pics/avatar/${choice}.webp`} alt="" />
                    </button>
                  );
                })}
              </div>
            </StepContent>
            <Footer>
              <button
                type="button"
                className={styles.cta}
                disabled={ctaIdentityDisabled}
                onClick={() => void handleIdentitySubmit()}
              >
                Weiter
              </button>
            </Footer>
          </StepShell>
        )}

        {/* ── 5. Starter Pack — final CTA. Pack-open animation TBD next pass. */}
        {step === 4 && (
          <StepShell key="pack">
            <div className={styles.packStage}>
              <motion.img
                src="/pics/booster/booster1.webp"
                alt=""
                className={styles.packVisual}
                animate={reduced ? {} : { y: [0, -10, 0], rotate: [-1.5, 1.5, -1.5] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                draggable={false}
              />
            </div>
            <StepContent>
              <Eyebrow>Deine ersten 10 Must Eats</Eyebrow>
              <Title>Öffne dein<br />Starter Pack</Title>
              <Body>
                Sammle alle 150+ Must Eats, erkunde die Map und meistere die
                Berliner Food-Szene.
              </Body>
            </StepContent>
            <Footer>
              <button type="button" className={`${styles.cta} ${styles.ctaLarge}`} onClick={() => onFinish()}>
                Pack öffnen
              </button>
            </Footer>
          </StepShell>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Brand chrome ─────────────────────────────────────────────────────────────

function BrandHeader() {
  return (
    <header className={styles.brandHeader}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pics/logo2.webp" alt="EAT THIS" className={styles.brandLogo} />
    </header>
  );
}

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      className={styles.step}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

function Title({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h1 className={`${styles.title}${className ? ` ${className}` : ''}`}>{children}</h1>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className={styles.body}>{children}</p>;
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}

function StepContent({ children }: { children: React.ReactNode }) {
  return <div className={styles.stepContent}>{children}</div>;
}

// ── Slide 2 — Card fly-in (lab pattern, scaled-up centerpiece) ───────────────

function CardFlyIn({ reduced }: { reduced: boolean }) {
  const seed = 42;
  // 5 distinct cards — one per fan slot for full visual variety.
  const cards = SAMPLE_CARDS;
  // Wider rotation spread → bigger fan opening.
  const fanRotations = [-26, -13, 0, 13, 26];

  const [maxDim, setMaxDim] = useState(1400);
  useEffect(() => {
    const measure = () => setMaxDim(Math.max(window.innerWidth, window.innerHeight));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const startDelay = 0.32;

  return (
    <div className={styles.cardStage}>
      {cards.map((src, i) => {
        const flyAngle = seedRand(seed, i, 51) * Math.PI * 2;
        const flyDist  = maxDim * (1.15 + seedRand(seed, i, 52) * 0.25);
        const flyX     = Math.round(Math.cos(flyAngle) * flyDist);
        const flyY     = Math.round(Math.sin(flyAngle) * flyDist);
        const flyRot   = Math.round((seedRand(seed, i, 53) - 0.5) * 240);
        const slotRot  = fanRotations[i] ?? 0;
        const slotZ    = i;
        // Tight stride so cards overlap more — enables larger card width
        // while keeping the fan fully inside a phone viewport.
        const slotX    = (i - 2) * 28;
        const slotY    = Math.abs(i - 2) * 6;

        return (
          <motion.div
            key={i}
            className={styles.cardFly}
            initial={
              reduced
                ? { x: slotX, y: slotY, rotate: slotRot, scale: 1, opacity: 1 }
                : { x: flyX, y: flyY, rotate: flyRot, scale: 1, opacity: 1 }
            }
            animate={{ x: slotX, y: slotY, rotate: slotRot, scale: 1, opacity: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 160,
                    damping:   22,
                    mass:      0.9,
                    delay:     startDelay + (i * 90) / 1000,
                  }
            }
            style={{ zIndex: slotZ }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} />
          </motion.div>
        );
      })}
    </div>
  );
}

