'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import SiteFooter from './SiteFooter';
import type { MustEatAlbumCard } from '@/lib/types';

interface Props {
  isActive?: boolean;
  cards: MustEatAlbumCard[];
}

const TOTAL_SLOTS = 150;
const MAX_SHARP = 50;

type Slot =
  | { kind: 'sharp'; card: MustEatAlbumCard; sourceIndex: number }
  | { kind: 'empty' };

// Mirrors the legacy _renderAlbum distribution: at most MAX_SHARP sharp slots
// (capped by card count), spread evenly across TOTAL_SLOTS via stride rounding.
function buildSlots(cards: MustEatAlbumCard[]): Slot[] {
  const sharpCount = Math.min(cards.length, MAX_SHARP);
  const slots: Slot[] = Array.from({ length: TOTAL_SLOTS }, () => ({ kind: 'empty' as const }));
  if (sharpCount === 0) return slots;
  for (let w = 0; w < sharpCount; w++) {
    const pos = Math.min(
      TOTAL_SLOTS - 1,
      Math.round((w + 0.5) * (TOTAL_SLOTS / sharpCount))
    );
    slots[pos] = { kind: 'sharp', card: cards[w], sourceIndex: w };
  }
  return slots;
}

export default function MustsSection({ isActive = false, cards }: Props) {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLDivElement>(null);
  const slots = buildSlots(cards);
  const progCount = Math.min(cards.length, TOTAL_SLOTS);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleSlotActivate = (target: EventTarget | null) => {
      const slot = (target as HTMLElement | null)?.closest('.album-slot') as HTMLElement | null;
      if (!slot) return;
      if (slot.classList.contains('sharp')) {
        const bg = slot.querySelector('.album-slot-bg') as HTMLElement | null;
        const url = bg?.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/)?.[1] ?? '';
        const dish = slot.dataset.dish ?? '';
        const opener = (window as unknown as { _openMustCard?: (el: HTMLElement, u: string, d: string) => void })._openMustCard;
        if (opener) opener(slot, url, dish);
        return;
      }
      // empty slot: shake, then open login modal after shake completes
      slot.classList.add('shake');
      window.setTimeout(() => {
        slot.classList.remove('shake');
        const w = window as unknown as {
          _currentUser?: unknown;
          openWelcomeModal?: () => void;
          openLoginModal?: () => void;
        };
        if (!w._currentUser) {
          (w.openWelcomeModal ?? w.openLoginModal)?.();
        }
      }, 1000);
    };

    const onClick = (e: MouseEvent) => handleSlotActivate(e.target);
    grid.addEventListener('click', onClick);
    return () => {
      grid.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div className={`app-page${isActive ? ' active' : ''}`} data-page="musts" suppressHydrationWarning>
      <section className="must-eats-section" id="must-eats">
        <div className="must-eats-header">
          <p className="section-label reveal">{t('musts.sectionLabel')}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/logo2.webp"
            alt="EAT THIS"
            className="must-eats-logo-img"
            width={1815}
            height={576}
            loading="lazy"
            decoding="async"
          />
          <div className="album-head-count">
            <span className="album-head-n" id="albumProgCount">{progCount}</span>
            <span className="album-head-total">/ {TOTAL_SLOTS}</span>
          </div>
        </div>

        <div className="album-grid" id="albumGrid" ref={gridRef} data-rsc="1">
          {slots.map((slot, i) =>
            slot.kind === 'sharp' ? (
              <div
                key={i}
                className="album-slot sharp"
                data-card-index={i}
                data-dish={slot.card.dish}
                data-restaurant={slot.card.restaurant}
                data-source-index={slot.sourceIndex}
              >
                <div className="album-slot-inner">
                  <div
                    className="album-slot-bg"
                    style={{ backgroundImage: `url(${slot.card.imageUrl})` }}
                  />
                </div>
              </div>
            ) : (
              <div key={i} className="album-slot empty" data-card-index={i}>
                <div className="album-slot-inner">
                  <div className="album-slot-back" />
                </div>
              </div>
            )
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
