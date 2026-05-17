'use client';

import { doc, setDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { MustEatAlbumCard } from '@/lib/types';

const PACK_SIZE = 20;

// Fisher–Yates over the cards that have an order field, then dedupe by
// restaurantSlug so the resulting pack maps to PACK_SIZE *distinct*
// restaurants (the map shows one pin per restaurant — we want each
// pulled card to land on its own pin, not pile up on one address).
// Falls back to the unfiltered pool if not enough ordered cards exist.
export function pickRandomMustEatIds(cards: MustEatAlbumCard[]): string[] {
  const eligible = cards.filter((c) => typeof c.order === 'number');
  const pool = eligible.length >= PACK_SIZE ? eligible : cards;
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const seenRestaurants = new Set<string>();
  const picked: string[] = [];
  for (const card of shuffled) {
    const slug = card.restaurantSlug;
    if (slug) {
      if (seenRestaurants.has(slug)) continue;
      seenRestaurants.add(slug);
    }
    picked.push(card._id);
    if (picked.length >= PACK_SIZE) break;
  }
  return picked;
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
// timestamp AND auto-unlocks each pack card on the user's map. Rules permit
// the pack update only if the prior state was unopened. The unlock writes
// run in a single batch so they either all land or none do.
export async function openWelcomePack(
  uid: string,
  mustEatIds: string[] = [],
  packId = 'welcome',
): Promise<void> {
  const packRef = doc(db, 'users', uid, 'packs', packId);
  await updateDoc(packRef, {
    opened:   true,
    openedAt: serverTimestamp(),
  });

  // Mirror the pack's cards into users/{uid}/unlockedMustEats — without this
  // the cards in the user's deck would still read as "not visited" on the
  // map, which contradicts the implicit promise of opening the pack.
  if (mustEatIds.length > 0) {
    const batch = writeBatch(db);
    for (const mustEatId of mustEatIds) {
      batch.set(
        doc(db, 'users', uid, 'unlockedMustEats', mustEatId),
        {
          source:     'starter-pack',
          unlockedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
  }
}
