'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './onboarding.module.css';

// Slide-4 pack-open choreography. Phases: idle → zoom → impact → flyThrough.
//
// 1. idle       — pack hovers in upper portion of stage.
// 2. zoom       — pack slams TOWARD the two yellow cards in the man's hand
//                 at extreme scale, so the camera reads as diving INTO the
//                 pack artwork.
// 3. impact     — pack lands and vibrates aggressively (the "Wucht"). Stage
//                 shakes alongside. A bright warm-white flash and a radial
//                 bloom from the focus point fire DURING the vibration so
//                 they're felt as part of the impact, not as a fade-out.
// 4. flyThrough — pack SNAPS invisible the instant this phase begins (no
//                 fade); cards start flying in immediately. Each card flies
//                 from a RANDOM off-screen angle at close-camera scale 3.5
//                 with strong tilt (per memory feedback_card_flyin_pattern),
//                 lands centred with backOut overshoot, dwells briefly,
//                 exits off-screen right. Strictly sequential.

interface Props {
  cards:            string[];          // image URLs (used for length only — cards render face-down)
  triggerOpen:      boolean;           // parent flips this true to start the open
  onRevealComplete: () => void;        // fires after the last card has exited the stage
}

type Phase = 'idle' | 'zoom' | 'impact' | 'flyThrough';

// Transform-origin on the pack (also where the zoom translates to
// viewport centre at peak). Higher Y% means more of the pack ends up
// ABOVE viewport centre, i.e. the cards visually shift UP. iPhone 16
// Safari peak frame had the cards too low — bumped from 39 → 44 to
// lift them clearly into the upper-centre.
const PACK_FOCUS_X_PCT = 48;
const PACK_FOCUS_Y_PCT = 44;

// Pack idle position. Lower than the lab default — the pack now needs to sit
// roughly where the previous slide-rendered idle pack used to so the eyebrow
// + title + body + CTA below have room.
const PACK_TOP_PCT        = 4;     // minimal upward nudge; sits within Row-1 placeholder
const ZOOM_DURATION_MS    = 520;   // smooth, decisive build-up
const IMPACT_DURATION_MS  = 320;   // cracks form + flash + shake (pack already gone)

// Per-card timings. Snappier — short dwell so cards keep moving but
// still readable mid-flight.
const CARD_FLY_IN_MS  = 230;   // off-screen → centre
const CARD_DWELL_MS   = 130;   // brief beat at centre
const CARD_EXIT_MS    = 180;   // centre → off-screen right
const CARD_TOTAL_MS   = CARD_FLY_IN_MS + CARD_DWELL_MS + CARD_EXIT_MS; // 540
const CARD_STAGGER_MS = CARD_TOTAL_MS;

// Card's start scale per memory `feedback_card_flyin_pattern.md` — close
// to camera, big, rotated, on a direct trajectory to centre.
const CARD_POP_SCALE  = 3.5;

// Pack peak — much bigger than before so the printed cards in the man's
// hand fill more of the viewport at impact.
const PACK_PEAK_SCALE = 22;

// Pack sized off stage HEIGHT so on tall portrait viewports the pack feels
// hero-sized while still leaving deterministic room below for the text + CTA.
function computePackWidth(stageW: number, stageH: number): number {
  const fromHeight = (stageH * 0.50) / 1.5; // pack height = 50% of stage; aspect 2:3
  return Math.max(220, Math.min(fromHeight, stageW * 0.85, 400));
}

// Single shared AudioContext for all sound effects. Browsers cap the
// number of concurrent AudioContexts (~6) — creating one per trigger
// caused the later card whooshes to silently fail. One context, lazily
// created, never closed (the browser handles cleanup on page unload).
let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudioCtx) return sharedAudioCtx;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try { sharedAudioCtx = new AudioCtx(); } catch { return null; }
  return sharedAudioCtx;
}

// Glass-shatter sound — pre-loaded and decoded once at component mount,
// then triggered via Web Audio at impact for zero playback latency
// (HTMLAudio + new Audio()/.play() per trigger introduced 100-300 ms of
// decode delay on mobile).
let cachedGlassBuffer: AudioBuffer | null = null;
let glassAudioLoading: Promise<void> | null = null;

// Public warm-up: call this from a click handler BEFORE rendering the
// choreography. Resumes the AudioContext synchronously in user-gesture
// context (which iOS Safari requires for low-latency playback) and primes
// the output pipeline by playing a 1-sample silent buffer. Without this,
// the first real sound on mobile lands 100-300ms late.
export function warmUpOnboardingAudio(): void {
  preloadGlassAudio();
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  try {
    const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = silent;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
}

function preloadGlassAudio(): void {
  if (typeof window === 'undefined') return;
  if (cachedGlassBuffer || glassAudioLoading) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  glassAudioLoading = fetch('/audio/glass-shatter.mp3')
    .then((r) => r.arrayBuffer())
    .then((arr) => ctx.decodeAudioData(arr))
    .then((buffer) => {
      cachedGlassBuffer = buffer;
      glassAudioLoading = null;
    })
    .catch(() => { glassAudioLoading = null; });
}

function playGlassShatter(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  if (cachedGlassBuffer) {
    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = cachedGlassBuffer;
    gain.gain.value = 0.7;
    src.connect(gain).connect(ctx.destination);
    src.start(0);
    return;
  }
  // Fallback if the buffer hasn't decoded yet — HTMLAudio (slight delay
  // possible, but won't be silent).
  try {
    const audio = new Audio('/audio/glass-shatter.mp3');
    audio.volume = 0.7;
    void audio.play().catch(() => {});
  } catch { /* ignore */ }
}

// Card whoosh — short bandpass-filtered noise burst with a frequency
// sweep, giving each fly-in a soft "card cutting through air" cue.
// Uses the shared AudioContext so all 10 triggers fire reliably (one
// context-per-trigger hit the browser cap and dropped the later cards).
function playCardWhoosh(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const now = ctx.currentTime;
  const sr  = ctx.sampleRate;

  // Short white-noise burst, ~180 ms with quick decay.
  const buf = ctx.createBuffer(1, Math.floor(sr * 0.18), sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = Math.exp(-i / (sr * 0.06));
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  // Bandpass sweep low → high gives the doppler "swooshing past" feel.
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(700, now);
  bp.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
  bp.Q.value = 1.4;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  src.connect(bp).connect(gain).connect(ctx.destination);
  src.start(now);
}

// mulberry32-derived deterministic RNG — server/client safe.
function seedRand(seed: number, i: number, salt: number): number {
  let t = ((seed + 1) * 1000003 + i * 337 + salt * 7 + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export default function PackOpenChoreography({ cards, triggerOpen, onRevealComplete }: Props) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  // Index of the highest-mounted card. Cards aren't rendered until their
  // turn — at scale 3.5 their off-screen entry positions still peek into
  // the viewport at certain angles, and the user wants nothing visible
  // before each card actively flies in.
  const [activeCardIndex, setActiveCardIndex] = useState(-1);
  // Pack visibility flag — flipped to false the instant the glass cracks
  // appear (cracksReady) so pack-disappear and shatter land together.
  const [packVisible, setPackVisible] = useState(true);
  // Cracks-early flag — flipped true ~80ms before the impact phase
  // change, so the glass visibly shatters slightly ahead of the
  // perceived pack-at-peak moment instead of trailing it.
  const [cracksReady, setCracksReady] = useState(false);

  // Single unified default for desktop and mobile — no device branching.
  // Pack zooms in, hits the cards on the man's hand, glass shatters,
  // pack snaps invisible, sound lands. All at one perceptual moment.
  const zoomMs        = ZOOM_DURATION_MS;
  const peakScale     = PACK_PEAK_SCALE;
  const impactOffsetMs = zoomMs;
  const focusXPct     = PACK_FOCUS_X_PCT;
  const focusYPct     = PACK_FOCUS_Y_PCT;

  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 380, h: 676 });
  // Viewport-relative position of stage and viewport dimensions — used by
  // the cracks portal so they cover the FULL viewport (not just the
  // choreoStage area, which sits below the brand header and is clipped by
  // overflow:hidden + the parent's transform).
  const [vp, setVp] = useState({ w: 0, h: 0, stageLeft: 0, stageTop: 0 });
  // SSR safety — only enable the body-level portal once we're on the client.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  // Pre-decode the glass-shatter mp3 ASAP so impact playback is in sync
  // with the visual on mobile (HTMLAudio decoding mid-trigger added a
  // 100-300ms delay before).
  useEffect(() => { preloadGlassAudio(); }, []);

  const seed = 7;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      setStage({ w: el.offsetWidth, h: el.offsetHeight });
      const rect = el.getBoundingClientRect();
      setVp({
        w:         window.innerWidth,
        h:         window.innerHeight,
        stageLeft: rect.left,
        stageTop:  rect.top,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, []);

  // idle → zoom when the parent says so.
  useEffect(() => {
    if (triggerOpen && phase === 'idle') setPhase('zoom');
  }, [triggerOpen, phase]);

  // zoom → impact → flyThrough. Audio is scheduled via Web Audio's clock
  // at a time that COMPENSATES FOR OUTPUT LATENCY: mobile speakers add
  // 30-100ms between src.start() and the actual sound reaching the ear,
  // so the audio is launched correspondingly EARLIER than the visual
  // impact moment. End result: bang and shatter land in the same instant
  // perceptually.
  const glassScheduledRef = useRef(false);
  useEffect(() => {
    if (phase === 'zoom') {
      if (!glassScheduledRef.current) {
        glassScheduledRef.current = true;
        const ctx = getAudioCtx();
        if (ctx && cachedGlassBuffer) {
          if (ctx.state === 'suspended') void ctx.resume();
          const src  = ctx.createBufferSource();
          const gain = ctx.createGain();
          src.buffer      = cachedGlassBuffer;
          gain.gain.value = 0.7;
          src.connect(gain).connect(ctx.destination);
          // Output-latency compensation. ctx.outputLatency (where
          // exposed) reports the buffer-to-speaker delay in seconds;
          // baseLatency is the processing latency. Sum is the total
          // we need to play AHEAD of the visual.
          const ctxAny  = ctx as AudioContext & { outputLatency?: number; baseLatency?: number };
          const outLat  = (ctxAny.outputLatency  ?? 0) * 1000;
          const baseLat = (ctxAny.baseLatency    ?? 0) * 1000;
          const reportedLatency = outLat + baseLat;
          // Single default for all devices: if the browser exposes
          // output latency (Chrome/Firefox/newer Safari), use 1.3× as
          // the head-start; otherwise fall back to 80ms.
          const compMs = Math.min(
            impactOffsetMs - 40,
            reportedLatency > 5
              ? Math.max(40, reportedLatency * 1.3)
              : 80,
          );
          const playAt = ctx.currentTime + (impactOffsetMs - compMs) / 1000;
          src.start(Math.max(ctx.currentTime, playAt));
        }
      }
      // Cracks paint ahead of the impact phase change so the shatter
      // is visible the instant the pack lands. 140ms head-start covers
      // iOS Safari's slower paint pipeline — without it, the crack
      // visibly trails the impact on iPhone.
      const tCracks = window.setTimeout(
        () => setCracksReady(true),
        Math.max(0, impactOffsetMs - 140),
      );
      const t = window.setTimeout(() => setPhase('impact'), impactOffsetMs);
      return () => {
        clearTimeout(tCracks);
        clearTimeout(t);
      };
    }
    if (phase === 'impact') {
      // Fallback only — if the buffer hadn't decoded at zoom time, fire
      // now so the moment still has sound (slight delay possible).
      if (!cachedGlassBuffer) playGlassShatter();
      const t = window.setTimeout(() => setPhase('flyThrough'), IMPACT_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [phase, zoomMs, impactOffsetMs]);

  // Background music — starts the moment the user clicks "Pack öffnen"
  // (phase advances to 'zoom'). Loops at low volume through the entire
  // choreography. Drop a track at /public/audio/pack-music.mp3 and it
  // plays automatically; without the file the .play() promise just
  // rejects silently, so this is safe to ship empty too.
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (phase !== 'zoom' || bgAudioRef.current) return;
    try {
      const bg = new Audio('/audio/pack-music.mp3');
      bg.loop = true;
      bg.volume = 0.35;
      void bg.play().catch(() => { /* missing file or autoplay block */ });
      bgAudioRef.current = bg;
    } catch { /* ignore */ }
  }, [phase]);
  useEffect(() => {
    // Stop the music when the component unmounts (i.e., when onboarding
    // navigates away to /profile).
    return () => {
      const bg = bgAudioRef.current;
      if (bg) {
        bg.pause();
        bg.src = '';
        bgAudioRef.current = null;
      }
    };
  }, []);

  // Pack snaps invisible the instant the glass shatters. Cracks, pack
  // disappearance, and sound all land at the same perceptual moment —
  // pack hits glass, glass breaks, pack is gone. One event, one beat.
  useEffect(() => {
    if (cracksReady) setPackVisible(false);
  }, [cracksReady]);

  // Mount each card at its turn — keeps un-flown cards out of the DOM so
  // they can't visually peek into the stage from off-screen. Each mount
  // also fires a whoosh, in sync with the card entering the viewport.
  useEffect(() => {
    if (phase !== 'flyThrough') {
      setActiveCardIndex(-1);
      return;
    }
    const timers: number[] = [];
    for (let i = 0; i < cards.length; i++) {
      timers.push(window.setTimeout(() => {
        setActiveCardIndex(i);
        playCardWhoosh();
      }, i * CARD_STAGGER_MS));
    }
    return () => { timers.forEach(clearTimeout); };
  }, [phase, cards.length]);

  // Notify parent once the last card has exited stage right.
  const revealNotifiedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'flyThrough' || revealNotifiedRef.current) return;
    revealNotifiedRef.current = true;
    const lastCardEndsMs = (cards.length - 1) * CARD_STAGGER_MS + CARD_TOTAL_MS;
    const t = window.setTimeout(onRevealComplete, lastCardEndsMs);
    return () => clearTimeout(t);
  }, [phase, cards.length, onRevealComplete]);

  const sw = stage.w;
  const sh = stage.h;
  const packW       = computePackWidth(sw, sh);
  const packH       = packW * 1.5;
  const packLeft    = (sw - packW) / 2;
  const packTop     = sh * (PACK_TOP_PCT / 100);
  const packCenterX = packLeft + packW / 2;
  const packCenterY = packTop  + packH / 2;

  // Card slot reference point — stage centre. Card transforms are deltas
  // from there.
  const centerX = sw / 2;
  const centerY = sh / 2;
  // Card resting size at centre. Bumped up — only one card on stage at a
  // time, so it can take a generous slice of the viewport (especially on
  // mobile where there's lots of vertical space between header and footer).
  const cardW = Math.max(190, Math.min(sw * 0.70, sh * 0.42, 340));
  const cardH = cardW * 1.5;

  // Cards must enter from beyond the VIEWPORT edge (not the stage edge).
  // On desktop the choreoStage is often narrower than the viewport, so a
  // stage-relative fly-in distance leaves cards visibly already on screen
  // when they "appear". SSR fallback to stage dims while vp is unmeasured.
  const vpW = vp.w || sw;
  const vpH = vp.h || sh;
  const cardDescriptors = useMemo(() => {
    return cards.map((_, i) => {
      // Per-card start state from memory `feedback_card_flyin_pattern.md`:
      // random off-screen angle (full 360°), slightly varied distance, and
      // a strong tilt up to ±110°. The settle pass uses backOut for the
      // soft-overshoot landing the spring would have produced.
      const flyInAngle = seedRand(seed, i, 51) * Math.PI * 2;
      const flyInDist  = Math.max(vpW, vpH) * (1.1 + seedRand(seed, i, 52) * 0.5);
      const flyInX     = Math.round(Math.cos(flyInAngle) * flyInDist);
      const flyInY     = Math.round(Math.sin(flyInAngle) * flyInDist);
      const flyInRot   = Math.round((seedRand(seed, i, 53) - 0.5) * 220);
      const midRot     = (seedRand(seed, i, 54) - 0.5) * 6;
      const outYJitter = (seedRand(seed, i, 55) - 0.5) * 50;
      const outRot     = 10 + Math.round(seedRand(seed, i, 56) * 22);
      return { flyInX, flyInY, flyInRot, midRot, outYJitter, outRot };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed is stable
  }, [cards.length, vpW, vpH]);

  // Focus point on the pack image (the printed cards in the man's hand).
  // Used both as transformOrigin for the zoom AND to compute the
  // translation that brings the focus point to viewport centre at peak.
  const focusX = packLeft + packW * (focusXPct / 100);
  const focusY = packTop  + packH * (focusYPct / 100);
  // Explosion spot for burst FX = focus point (where we're looking when
  // the boom hits).
  const explosionX = focusX;
  const explosionY = focusY;
  // Pack-translation deltas to bring focus to viewport centre at peak.
  // Framer applies translate AFTER scale (default order in transform-style
  // is `translate3d ... scale ...`), so these deltas are screen pixels.
  const peakShiftX = centerX - focusX;
  const peakShiftY = centerY - focusY;

  // Card slot is positioned at stage-centre; transforms below are deltas
  // from there. Cards enter from random off-screen positions and exit
  // beyond the right VIEWPORT edge. Stage may be narrower than the viewport
  // on desktop — using stage width alone leaves cards visibly stopping
  // mid-screen on wide displays.
  const offEdgePad = cardW + 60;
  const cardCenterVpX = vp.stageLeft + centerX;
  const outDeltaX  = (vpW - cardCenterVpX) + offEdgePad;

  const t1 = CARD_FLY_IN_MS / CARD_TOTAL_MS;
  const t2 = (CARD_FLY_IN_MS + CARD_DWELL_MS) / CARD_TOTAL_MS;

  // Bloom size — radial light burst that expands from the explosion spot.
  // Sized off the larger viewport dimension so it covers the screen at peak.
  const bloomSize = Math.max(sw, sh) * 1.6;

  // Cracks are generated in VIEWPORT coordinates (not stage coords) so
  // they can be portaled to body and cover the entire screen — including
  // the area above choreoStage (brand header / dots), which would
  // otherwise stay un-cracked.
  const vpExplosionX = vp.stageLeft + explosionX;
  const vpExplosionY = vp.stageTop  + explosionY;
  const vpMaxDim     = Math.max(vp.w, vp.h);

  // Glass cracks — modelled on the reference photo of a smashed phone
  // screen: a near-WHITE "crater" of pulverised glass at the impact
  // point (radial bloom + 70+ tiny radiating shards), thinner long
  // primaries fanning outward to the viewport edges, lots of fine
  // branches, and densely packed concentric rings near the impact.
  const cracks = useMemo(() => {
    const mainCount   = 32;   // many fine radials, thin
    const shardCount  = 70;   // dense shards in the crater
    const branchCount = 64;   // mid-distance fill
    const ringCount   = 38;   // many small concentric rings near impact

    // 1. PRIMARY RADIALS — thin, jagged polylines from impact to edges.
    const main = Array.from({ length: mainCount }, (_, i) => {
      const baseAngle = (i / mainCount) * Math.PI * 2;
      const angle     = baseAngle + (seedRand(seed, i, 71) - 0.5) * 0.35;
      const length    = vpMaxDim * (0.80 + seedRand(seed, i, 72) * 0.65);
      const segCount  = 2 + Math.floor(seedRand(seed, i, 73) * 2);
      const points: Array<{ x: number; y: number }> = [{ x: vpExplosionX, y: vpExplosionY }];
      let curX = vpExplosionX, curY = vpExplosionY, curAngle = angle;
      for (let s = 0; s < segCount; s++) {
        const segLen = (length / segCount) * (0.75 + seedRand(seed, i, 74 + s) * 0.5);
        curAngle += (seedRand(seed, i, 76 + s) - 0.5) * 0.55;
        curX += Math.cos(curAngle) * segLen;
        curY += Math.sin(curAngle) * segLen;
        points.push({ x: curX, y: curY });
      }
      return {
        points,
        // Thinner overall — every 4th radial is slightly thicker for
        // hierarchy, but no fat primary lines like before.
        width: i % 4 === 0
          ? 1.0 + seedRand(seed, i, 73) * 0.9
          : 0.5 + seedRand(seed, i, 73) * 0.7,
        angle,
      };
    });

    // 2. INNER SHARDS — 70 very fine short cracks clustered tightly at
    // impact, evenly distributed angularly. This is what reads as the
    // bright "starburst" centre of a real shatter.
    const innerShards = Array.from({ length: shardCount }, (_, i) => {
      const angle = (i / shardCount) * Math.PI * 2 + (seedRand(seed, i, 111) - 0.5) * 0.18;
      const length = vpMaxDim * (0.025 + seedRand(seed, i, 112) * 0.14);
      const angleJitter = angle + (seedRand(seed, i, 113) - 0.5) * 0.18;
      // Optional small offset from the exact centre so shards don't all
      // start at one infinitesimal point — gives the crater texture.
      const startOffset = vpMaxDim * 0.005 * seedRand(seed, i, 115);
      const sx = vpExplosionX + Math.cos(angleJitter) * startOffset;
      const sy = vpExplosionY + Math.sin(angleJitter) * startOffset;
      return {
        x1: sx, y1: sy,
        x2: sx + Math.cos(angleJitter) * length,
        y2: sy + Math.sin(angleJitter) * length,
        width: 0.4 + seedRand(seed, i, 114) * 0.7,
      };
    });

    // 3. BRANCHES — short forks off the primary radials.
    const branches = Array.from({ length: branchCount }, (_, b) => {
      const parentIdx = b % mainCount;
      const parent    = main[parentIdx];
      const segIdx    = Math.floor(seedRand(seed, b, 81) * (parent.points.length - 1));
      const tInSeg    = 0.20 + seedRand(seed, b, 82) * 0.65;
      const a = parent.points[segIdx];
      const c = parent.points[segIdx + 1];
      const startX = a.x + (c.x - a.x) * tInSeg;
      const startY = a.y + (c.y - a.y) * tInSeg;
      const segAngle = Math.atan2(c.y - a.y, c.x - a.x);
      const branchAngle = segAngle + (seedRand(seed, b, 83) - 0.5) * Math.PI * 0.85;
      const len = vpMaxDim * (0.04 + seedRand(seed, b, 84) * 0.20);
      return {
        x1: startX, y1: startY,
        x2: startX + Math.cos(branchAngle) * len,
        y2: startY + Math.sin(branchAngle) * len,
        width: 0.4 + seedRand(seed, b, 85) * 0.7,
      };
    });

    // 4. CONCENTRIC RINGS — heavy bias toward inner area (most rings
    // near impact, a few further out). Squaring the random sample
    // concentrates them near 0.
    const concentric = Array.from({ length: ringCount }, (_, c) => {
      const i1 = c % mainCount;
      const i2 = (i1 + 1) % mainCount;
      const tRaw = seedRand(seed, c, 91);
      const t = 0.05 + (tRaw * tRaw) * 0.70;
      const p1 = main[i1].points[main[i1].points.length - 1];
      const p2 = main[i2].points[main[i2].points.length - 1];
      const x1 = vpExplosionX + (p1.x - vpExplosionX) * t + (seedRand(seed, c, 92) - 0.5) * 8;
      const y1 = vpExplosionY + (p1.y - vpExplosionY) * t + (seedRand(seed, c, 93) - 0.5) * 8;
      const x2 = vpExplosionX + (p2.x - vpExplosionX) * t + (seedRand(seed, c, 94) - 0.5) * 8;
      const y2 = vpExplosionY + (p2.y - vpExplosionY) * t + (seedRand(seed, c, 95) - 0.5) * 8;
      return {
        x1, y1, x2, y2,
        width: 0.4 + seedRand(seed, c, 96) * 0.55,
      };
    });

    return { main, innerShards, branches, concentric };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed is stable
  }, [vpExplosionX, vpExplosionY, vpMaxDim]);

  // Crack overlay — portaled to body so it covers the FULL viewport.
  // All cracks appear in a SINGLE FRAME the moment phase becomes impact
  // (no path-length draw animation, no per-line stagger) so glass-break,
  // pack-impact, vibration, and sound all land at the same instant.
  const cracksOverlay = portalReady && vp.w > 0 ? createPortal(
    <motion.svg
      className={styles.choreoCracks}
      viewBox={`0 0 ${vp.w} ${vp.h}`}
      width={vp.w}
      height={vp.h}
      animate={
        cracksReady || phase === 'impact' || phase === 'flyThrough'
          ? { opacity: 1 }
          : { opacity: 0 }
      }
      transition={{ duration: 0 }}
    >
      {cracks.main.map((c, i) => (
        <polyline
          key={`crack-main-${i}`}
          points={c.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
          fill="none"
          stroke="rgba(255, 255, 255, 0.92)"
          strokeWidth={c.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {cracks.innerShards.map((s, i) => (
        <line
          key={`crack-shard-${i}`}
          x1={s.x1} y1={s.y1}
          x2={s.x2} y2={s.y2}
          stroke="rgba(255, 255, 255, 0.95)"
          strokeWidth={s.width}
          strokeLinecap="round"
        />
      ))}
      {cracks.branches.map((b, i) => (
        <line
          key={`crack-branch-${i}`}
          x1={b.x1} y1={b.y1}
          x2={b.x2} y2={b.y2}
          stroke="rgba(255, 255, 255, 0.7)"
          strokeWidth={b.width}
          strokeLinecap="round"
        />
      ))}
      {cracks.concentric.map((s, i) => (
        <line
          key={`crack-stress-${i}`}
          x1={s.x1} y1={s.y1}
          x2={s.x2} y2={s.y2}
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth={s.width}
          strokeLinecap="round"
        />
      ))}
    </motion.svg>,
    document.body,
  ) : null;

  return (
    <>
    {cracksOverlay}
    <motion.div
      ref={stageRef}
      className={styles.choreoStage}
      animate={
        phase === 'impact'
          // Decaying screen-shake — fewer keyframes, smoother eases.
          // The pack itself doesn't vibrate any more (it just settles
          // from the zoom overshoot to peak), so the entire pack moves
          // coherently with the stage instead of compound-jittering.
          ? {
              x: [0, -9, 4, -2, 0],
              y: [0, 5, -3, 1, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={
        phase === 'impact'
          ? {
              duration: IMPACT_DURATION_MS / 1000,
              ease:     [0.25, 0.46, 0.45, 0.94], // smooth easeOutQuad
            }
          : { duration: 0.1 }
      }
    >
      {/* Warm-white flash at impact — kept subtle (peak 0.35) so the pack
       *  stays clearly visible underneath. The cracks + sound carry the
       *  punch; this is just a kiss of light. */}
      <motion.div
        className={styles.choreoFlash}
        animate={
          phase === 'impact'
            ? { opacity: [0.35, 0.12, 0] }
            : { opacity: 0 }
        }
        transition={
          phase === 'impact'
            ? { duration: IMPACT_DURATION_MS / 1000, ease: 'easeOut', times: [0, 0.18, 0.5] }
            : { duration: 0.05 }
        }
      />

      {/* Radial bloom — light ring expanding from the focus point. Lower
       *  peak so the pack remains visible during the wackeln. */}
      <motion.div
        className={styles.choreoBloom}
        style={{
          width:  `${bloomSize}px`,
          height: `${bloomSize}px`,
          left:   `${explosionX - bloomSize / 2}px`,
          top:    `${explosionY - bloomSize / 2}px`,
        }}
        animate={
          phase === 'impact'
            ? { opacity: [0, 0.45, 0.18, 0], scale: [0.15, 0.85, 1.15, 1.4] }
            : { opacity: 0, scale: 0.15 }
        }
        transition={
          phase === 'impact'
            ? { duration: IMPACT_DURATION_MS / 1000, ease: 'easeOut', times: [0, 0.20, 0.55, 1] }
            : { duration: 0.05 }
        }
      />

      {/* Cards — each one is mounted only at its turn (see activeCardIndex
       *  effect above) so nothing's visible before its fly-in starts. From
       *  random off-screen angle at scale 3.5 with strong tilt, lands at
       *  stage centre with a soft overshoot, dwells briefly, slides
       *  off-screen right. Strictly sequential. */}
      {phase === 'flyThrough' && cardDescriptors.map((d, i) => {
        if (i > activeCardIndex) return null;
        const slotLeft = centerX - cardW / 2;
        const slotTop  = centerY - cardH / 2;
        return (
          <motion.div
            key={`card-${i}`}
            className={styles.passCard}
            style={{
              width:  `${cardW}px`,
              height: `${cardH}px`,
              left:   `${slotLeft}px`,
              top:    `${slotTop}px`,
              zIndex: 30 + i,
            }}
            initial={{
              x:      d.flyInX,
              y:      d.flyInY,
              scale:  CARD_POP_SCALE,
              rotate: d.flyInRot,
            }}
            animate={{
              x:      [d.flyInX, 0, 0, outDeltaX],
              y:      [d.flyInY, 0, 0, d.outYJitter],
              scale:  [CARD_POP_SCALE, 1, 1, 1],
              rotate: [d.flyInRot, d.midRot, d.midRot, d.outRot],
            }}
            transition={{
              duration: CARD_TOTAL_MS / 1000,
              times:    [0, t1, t2, 1],
              // Cubic-bezier on each segment for ultra-smooth deceleration
              // into centre and acceleration out — replaces the previous
              // 'easeOut'/'easeIn' which had a slight ruckeln at the
              // segment boundary. (0.22, 1, 0.36, 1) is Apple-style smooth
              // out; (0.55, 0.06, 0.68, 0.19) is its mirror for in.
              ease: [
                [0.22, 1, 0.36, 1],
                'linear',
                [0.55, 0.06, 0.68, 0.19],
              ],
            }}
          />
        );
      })}

      {/* Pack — same DOM node from idle through zoom. Idle hover loops while
       *  phase === 'idle'; zoom is a wind-up (slight pull-back) then a hard
       *  push toward camera. At flyThrough the pack fades quickly while the
       *  first card pops out at the same screen position and scale. */}
      <motion.div
        className={styles.packImage}
        style={{
          width:  `${packW}px`,
          height: `${packH}px`,
          left:   `${packLeft}px`,
          top:    `${packTop}px`,
          // Zoom focuses on the printed cards in the man's hand. At peak
          // scale the viewport is essentially INSIDE that artwork.
          transformOrigin: `${focusXPct}% ${focusYPct}%`,
        }}
        animate={
          phase === 'idle' && !reduced
            ? { x: 0, y: [0, -8, 0], rotate: [-1, 1, -1], scale: 1, opacity: 1 }
          : phase === 'idle'
            ? { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
          : phase === 'zoom'
            // Wind-up (1 → 0.92) then slam PAST peak (overshoots by 6%)
            // so the pack arrives at impact with downward-settling velocity
            // — no zero-velocity "stop" before the cracks fire.
            ? {
                x:       [0, 0, peakShiftX],
                y:       [0, 0, peakShiftY],
                rotate:  0,
                scale:   [1, 0.92, peakScale * 1.06],
                opacity: 1,
              }
          : phase === 'impact'
            // Pack stays at peak — opacity is owned by the packVisible
            // state (snapped via the device-specific timer above).
            ? {
                x:       peakShiftX,
                y:       peakShiftY,
                rotate:  0,
                scale:   peakScale,
                opacity: packVisible ? 1 : 0,
              }
          // flyThrough — pack stays at peak coords; opacity follows
          // packVisible (touch devices may still want it visible briefly).
            : {
                x:       peakShiftX,
                y:       peakShiftY,
                rotate:  0,
                scale:   peakScale,
                opacity: packVisible ? 1 : 0,
              }
        }
        transition={
          phase === 'idle' && !reduced
            ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          : phase === 'zoom'
            ? { duration: zoomMs / 1000, ease: 'easeIn', times: [0, 0.16, 1] }
          : phase === 'impact'
            // Settle scale/x/y smoothly during impact, but opacity always
            // SNAPS (no fade) — when packVisible flips, it's instant.
            ? {
                duration: IMPACT_DURATION_MS / 1000,
                ease:     'easeOut',
                opacity:  { duration: 0 },
              }
          : phase === 'flyThrough'
            ? { duration: 0 }
            : { duration: 0 }
        }
      />
    </motion.div>
    </>
  );
}
