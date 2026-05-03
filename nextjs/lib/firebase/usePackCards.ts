'use client';

import { useEffect, useState } from 'react';
import { client } from '@/lib/sanity';

export type PackCardsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; images: string[] }
  | { status: 'error'; error: Error };

interface CardImageRow {
  _id:      string;
  imageUrl: string;
}

// Resolves an ordered array of mustEat document IDs to their image URLs,
// preserving the input order. Used by the onboarding pack-open choreography
// to show the user's actual 10 starter cards (not the trust-step samples).
export function usePackCards(ids: readonly string[] | null | undefined): PackCardsState {
  const [state, setState] = useState<PackCardsState>(
    ids && ids.length > 0 ? { status: 'loading' } : { status: 'idle' }
  );

  // Stable key — only refetch when the actual ID set changes, not on every
  // parent re-render that builds a new array.
  const key = ids ? ids.join('|') : '';

  useEffect(() => {
    if (!ids || ids.length === 0) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });

    client
      .fetch<CardImageRow[]>(
        `*[_type == "mustEat" && _id in $ids]{
           _id,
           "imageUrl": image.asset->url + "?w=600&auto=format&q=80"
         }`,
        { ids: [...ids] },
      )
      .then((rows) => {
        if (cancelled) return;
        const byId = new Map(rows.map((r) => [r._id, r.imageUrl]));
        const images = ids
          .map((id) => byId.get(id))
          .filter((u): u is string => typeof u === 'string');
        setState({ status: 'ready', images });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ status: 'error', error: err });
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `ids` is wrapped via `key`
  }, [key]);

  return state;
}
