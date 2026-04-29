'use client';

import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { MustEatAlbumCard } from '@/lib/types';

const PACK_SIZE = 10;

// Fisher–Yates over the cards that have an order field, take the first
// PACK_SIZE ids. Falls back to whatever is available if the catalogue
// has fewer than 10 ordered cards (early-stage seeding).
export function pickRandomMustEatIds(cards: MustEatAlbumCard[]): string[] {
  const eligible = cards.filter((c) => typeof c.order === 'number');
  const pool = eligible.length >= PACK_SIZE ? eligible : cards;
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, PACK_SIZE).map((c) => c._id);
}

// Create the welcome pack for the current user. Idempotent at the rules
// level: if a doc exists, the create rule fails — which surfaces as a
// permission-denied error and is safe to swallow (snapshot subscription
// will already see the existing doc).
export async function createWelcomePack(
  uid: string,
  mustEats: MustEatAlbumCard[],
  packId = 'welcome',
): Promise<void> {
  const ref = doc(db, 'users', uid, 'packs', packId);
  const ids = pickRandomMustEatIds(mustEats);
  if (ids.length === 0) {
    throw new Error('no-cards-available');
  }
  await setDoc(ref, {
    opened:     false,
    openedAt:   null,
    mustEatIds: ids,
    createdAt:  serverTimestamp(),
    source:     'client-fallback',
  });
}

// Open the welcome pack — flips opened: false → true with a server
// timestamp. Rules permit this update only if the prior state was unopened.
export async function openWelcomePack(uid: string, packId = 'welcome'): Promise<void> {
  const ref = doc(db, 'users', uid, 'packs', packId);
  await updateDoc(ref, {
    opened:   true,
    openedAt: serverTimestamp(),
  });
}
