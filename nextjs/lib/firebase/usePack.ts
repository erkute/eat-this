'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface BoosterPack {
  id:         string;
  opened:     boolean;
  mustEatIds: string[];
  createdAt:  Timestamp | null;
  openedAt:   Timestamp | null;
  source?:    string;
}

export type PackState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; pack: BoosterPack }
  | { status: 'error'; error: Error };

// Subscribes to users/{uid}/packs/welcome. The pack is created by the
// onUserCreate Cloud Function on signup; first read after sign-up may
// briefly hit `missing` if the trigger hasn't completed yet.
export function usePack(uid: string | null, packId: string = 'welcome'): PackState {
  const [state, setState] = useState<PackState>(
    uid ? { status: 'loading' } : { status: 'idle' }
  );

  useEffect(() => {
    if (!uid) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    const ref = doc(db, 'users', uid, 'packs', packId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ status: 'missing' });
          return;
        }
        const data = snap.data() as Omit<BoosterPack, 'id'>;
        setState({
          status: 'ready',
          pack: {
            id:         snap.id,
            opened:     data.opened ?? false,
            mustEatIds: Array.isArray(data.mustEatIds) ? data.mustEatIds : [],
            createdAt:  data.createdAt ?? null,
            openedAt:   data.openedAt ?? null,
            source:     data.source,
          },
        });
      },
      (error) => setState({ status: 'error', error }),
    );
    return unsub;
  }, [uid, packId]);

  return state;
}
