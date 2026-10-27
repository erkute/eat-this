'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale } from 'next-intl';
import { auth, getDb } from '@/lib/firebase/config';
import { useLoginModal } from '@/lib/auth';
import { rememberPendingHeart, settlePendingHeart } from './pendingHeart';
import { notify } from '@/lib/notice';

/* Beim Speichern sagt das gefuellte Herz alles (Betreiber, 27.10.2026). Nur
   der allererste Spot erfaehrt einmal, dass die gespeicherten Spots im Profil
   liegen — die Map markiert sie sonst nirgends. Gemerkt pro Geraet im
   localStorage: ein Profilflag kostete fuer einen Satz einen Schreibvorgang
   mehr, und auf einem neuen Geraet kommt der Hinweis ohnehin nur, wenn die
   Liste dort leer ist. Ohne Speicher lieber kein Hinweis als jedes Mal einer. */
const PROFILE_HINT_KEY = 'eatthis_saved_spots_hint';

function profileHintSeen(): boolean {
  try {
    return window.localStorage.getItem(PROFILE_HINT_KEY) === '1';
  } catch {
    return true;
  }
}

function markProfileHintSeen(): void {
  try {
    window.localStorage.setItem(PROFILE_HINT_KEY, '1');
  } catch {
    /* unavailable storage */
  }
}

interface FavoriteEntry {
  restaurantId: string;
  name: string;
  slug?: string;
  photo?: string;
  district?: string;
  note?: string;
  /** „War da" statt „will hin" — die zweite eigene Anmerkung neben der
   *  Notiz. Fehlt auf jedem Spot, der vor dem 06.09.2026 gespeichert wurde,
   *  und das heisst dasselbe wie `false`: gespeichert, aber noch offen. */
  visited?: boolean;
}

interface UseFavoritesResult {
  favoriteIds: Set<string>;
  favorites: FavoriteEntry[];
  /** `true`, sobald das Herz auf dem Server steht oder entfernt ist; `false`
   *  ohne Konto (dann geht das Login-Modal auf) und bei einem Fehler. */
  toggle: (r: {
    _id: string;
    name: string;
    slug?: string;
    photo?: string;
    district?: string;
  }) => Promise<boolean>;
  updateNote: (restaurantId: string, note: string) => Promise<void>;
  setVisited: (restaurantId: string, visited: boolean) => Promise<void>;
  loading: boolean;
}

interface FavoritesState {
  ownerUid: string | null;
  favoriteIds: Set<string>;
  favorites: FavoriteEntry[];
  loading: boolean;
}

function parseFavoriteEntry(value: unknown, restaurantIdOverride?: string): FavoriteEntry | null {
  if (typeof value !== 'object' || value === null) return null;

  const record = value as Record<string, unknown>;
  const restaurantId = restaurantIdOverride ?? record.restaurantId;
  if (typeof restaurantId !== 'string' || !restaurantId) return null;
  if (typeof record.name !== 'string' || !record.name) return null;

  const optionalKeys = ['slug', 'photo', 'district', 'note'] as const;
  for (const key of optionalKeys) {
    if (record[key] !== undefined && typeof record[key] !== 'string') return null;
  }
  if (record.visited !== undefined && typeof record.visited !== 'boolean') return null;

  return {
    restaurantId,
    name: record.name,
    slug: record.slug as string | undefined,
    photo: record.photo as string | undefined,
    district: record.district as string | undefined,
    note: record.note as string | undefined,
    visited: record.visited as boolean | undefined,
  };
}

function parseFavoriteCache(value: unknown): FavoriteEntry[] | null {
  if (!Array.isArray(value)) return null;

  const entries: FavoriteEntry[] = [];
  for (const item of value) {
    const entry = parseFavoriteEntry(item);
    if (!entry) return null;
    entries.push(entry);
  }
  return entries;
}

function emptyState(ownerUid: string | null, loading: boolean): FavoritesState {
  return { ownerUid, favoriteIds: new Set(), favorites: [], loading };
}

export function useFavorites(uid: string | null): UseFavoritesResult {
  const locale = useLocale();
  const { open: openLoginModal } = useLoginModal();
  // Per-uid localStorage cache so a returning user sees their saved spots
  // instantly on first paint instead of waiting on auth-resolve + the Firestore
  // read. The live getDocs reconciles + refreshes the cache right after.
  const [state, setState] = useState<FavoritesState>(() => emptyState(uid, !!uid));
  /* Die Sprache haengt nicht am Ladeeffekt — sie beschriftet nur die
     Fehlermeldung des eingeloesten Herzens. Ueber einen Ref, damit ein
     Sprachwechsel nicht die Favoritenliste neu liest. */
  const localeRef = useRef(locale);
  localeRef.current = locale;
  /* Spots, deren Herz gerade zum Server unterwegs ist: ein zweiter Tipp
     wuerde gegen den optimistischen Stand umschalten, nicht gegen den
     gespeicherten. */
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    if (!uid) {
      setState(emptyState(null, false));
      return;
    }
    const key = `eatthis_favorites_${uid}`;

    // 1) Atomically replace the previous owner's state with this uid's cache
    // (or a clean loading state). `ownerUid` also prevents the render between
    // a prop change and this effect from exposing the previous account.
    let cached: FavoriteEntry[] | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        cached = parseFavoriteCache(JSON.parse(raw) as unknown);
        if (!cached) window.localStorage.removeItem(key);
      }
    } catch {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* unavailable storage */
      }
    }
    setState(
      cached
        ? {
            ownerUid: uid,
            favoriteIds: new Set(cached.map((entry) => entry.restaurantId)),
            favorites: cached,
            loading: false,
          }
        : emptyState(uid, true)
    );

    // 2) Live read — show as soon as it lands.
    //    Firestore SDK is code-split (see getDb) so it stays out of first-load.
    let active = true;
    let hearted = false;
    void (async () => {
      try {
        /* Erst das Herz von vor dem Login einloesen, dann lesen: umgekehrt
           kaeme die Liste vom Stand vor dem Schreiben zurueck, und der gerade
           vergebene Spot waere im ersten Bild wieder leer. */
        hearted = await settlePendingHeart(uid, localeRef.current);
        if (!active) return;
        const [{ collection, getDocs }, db] = await Promise.all([
          import('firebase/firestore'),
          getDb(),
        ]);
        if (!active) return;
        const snap = await getDocs(collection(db, 'users', uid, 'favorites'));
        if (!active) return;
        const entries: FavoriteEntry[] = snap.docs.flatMap((d) => {
          const entry = parseFavoriteEntry(d.data() as unknown, d.id);
          return entry ? [{ ...entry, note: entry.note ?? '' }] : [];
        });
        setState({
          ownerUid: uid,
          favoriteIds: new Set(entries.map((entry) => entry.restaurantId)),
          favorites: entries,
          loading: false,
        });
        /* Die Anmeldung endet im Profil, der Spot steht dort in der Liste:
           wo gespeicherte Spots liegen, ist damit gezeigt. */
        if (hearted) markProfileHintSeen();
        try {
          window.localStorage.setItem(key, JSON.stringify(entries));
        } catch {
          /* quota */
        }
      } catch {
        if (active) {
          setState((current) =>
            current.ownerUid === uid ? { ...current, loading: false } : current
          );
          if (hearted) markProfileHintSeen();
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  const visibleState = state.ownerUid === uid ? state : emptyState(uid, !!uid);
  const { favoriteIds, favorites, loading } = visibleState;

  const toggle = useCallback(
    async (r: {
      _id: string;
      name: string;
      slug?: string;
      photo?: string;
      district?: string;
    }): Promise<boolean> => {
      if (!uid || !auth.currentUser) {
        /* Der Tap geht nicht verloren: er wartet auf das Konto und wird
           eingeloest, sobald eines da ist (siehe pendingHeart). Das Modal
           bekommt dieselbe Absicht mit, damit sie auch den Umweg ueber den
           Posteingang uebersteht. */
        rememberPendingHeart(r._id);
        openLoginModal({
          kind: 'heart',
          restaurantId: r._id,
          name: r.name,
          photo: r.photo,
        });
        return false;
      }
      // The heart write goes through /api/heart (Admin SDK), which is the single
      // writer of both the favorite doc and the public restaurants/{id}.heartCount
      // aggregate — the two move in one transaction so the count can't drift.
      // (Replaces the old client-side setDoc/deleteDoc + the removed Cloud
      // Function trigger.)
      /* Optimistisch: das Herz fuellt sich beim Tippen, nicht erst nach
         /api/heart — in der Map stand es sonst bis zur Antwort leer da.
         Scheitert der Aufruf, springt es zurueck. */
      if (inFlight.current.has(r._id)) return false;
      const adding = !favoriteIds.has(r._id);
      const previous = favorites.find((favorite) => favorite.restaurantId === r._id);
      /* Leer heisst erst nach dem Laden „noch keiner": waehrend die Liste
         laedt, lieber kein Hinweis als ein falscher. */
      const firstSpot = !loading && favoriteIds.size === 0;
      const apply = (hearted: boolean) =>
        setState((current) => {
          if (current.ownerUid !== uid) return current;
          const nextIds = new Set(current.favoriteIds);
          const rest = current.favorites.filter((favorite) => favorite.restaurantId !== r._id);
          let next = rest;
          if (hearted) {
            nextIds.add(r._id);
            next = [
              ...rest,
              previous ?? {
                restaurantId: r._id,
                name: r.name,
                slug: r.slug,
                photo: r.photo,
                district: r.district,
              },
            ];
          } else {
            nextIds.delete(r._id);
          }
          try {
            window.localStorage.setItem(`eatthis_favorites_${uid}`, JSON.stringify(next));
          } catch {
            /* quota */
          }
          return { ...current, favoriteIds: nextIds, favorites: next };
        });

      inFlight.current.add(r._id);
      apply(adding);
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/api/heart', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({
            restaurantId: r._id,
            action: adding ? 'add' : 'remove',
          }),
        });
        if (!res.ok) throw new Error(`heart ${res.status}`);
      } catch {
        apply(!adding);
        notify('actionFailed', locale);
        return false;
      } finally {
        inFlight.current.delete(r._id);
      }
      if (adding) {
        if (firstSpot && !profileHintSeen()) notify('spotSavedFirst', locale);
        markProfileHintSeen();
      }
      return true;
    },
    [uid, favoriteIds, favorites, loading, locale, openLoginModal]
  );

  const updateNote = useCallback(
    async (restaurantId: string, note: string) => {
      if (!uid) return;
      const [{ doc, updateDoc }, db] = await Promise.all([import('firebase/firestore'), getDb()]);
      const ref = doc(db, 'users', uid, 'favorites', restaurantId);
      await updateDoc(ref, { note });
      setState((current) => {
        if (current.ownerUid !== uid) return current;
        const next = current.favorites.map((favorite) =>
          favorite.restaurantId === restaurantId ? { ...favorite, note } : favorite
        );
        try {
          window.localStorage.setItem(`eatthis_favorites_${uid}`, JSON.stringify(next));
        } catch {
          /* quota */
        }
        return { ...current, favorites: next };
      });
    },
    [uid]
  );

  /* „War da" — dieselbe Mechanik wie die Notiz: ein eigenes Feld auf dem
     eigenen Dokument, mehr laesst firestore.rules dort nicht zu.

     Optimistisch, weil ein Haken, der eine halbe Sekunde ueberlegt, sich
     anfuehlt wie ein kaputter Knopf. Scheitert der Schreibvorgang, nimmt
     DIESE Funktion ihn zurueck und wirft weiter — der Aufrufer sagt es
     dann. Ein optimistischer Zustand, den niemand zurueckdreht, ist eine
     Luege, die bis zum naechsten Laden haelt. */
  const setVisited = useCallback(
    async (restaurantId: string, visited: boolean) => {
      if (!uid) return;
      const apply = (value: boolean) =>
        setState((current) => {
          if (current.ownerUid !== uid) return current;
          const next = current.favorites.map((favorite) =>
            favorite.restaurantId === restaurantId ? { ...favorite, visited: value } : favorite
          );
          try {
            window.localStorage.setItem(`eatthis_favorites_${uid}`, JSON.stringify(next));
          } catch {
            /* quota */
          }
          return { ...current, favorites: next };
        });

      apply(visited);
      try {
        const [{ doc, updateDoc }, db] = await Promise.all([import('firebase/firestore'), getDb()]);
        await updateDoc(doc(db, 'users', uid, 'favorites', restaurantId), { visited });
      } catch (err) {
        apply(!visited);
        throw err;
      }
    },
    [uid]
  );

  return { favoriteIds, favorites, toggle, updateNote, setVisited, loading };
}
