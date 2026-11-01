'use client';

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocale } from 'next-intl';
import { mustEatMapHref } from '@/lib/map/mustEatMapHref';
import type { MapMustEat } from '@/lib/types';
import MapIntentLink from './MapIntentLink';
import LazyMustEatImageLightbox from './map/LazyMustEatImageLightbox';

interface Selection {
  key: string;
  card: MapMustEat;
  imageUrl: string;
  imageAlt: string;
  rect: DOMRect;
  placeholderUrl: string | null;
  trigger: HTMLButtonElement;
  uid: string | null;
}
interface ZoomContext {
  hiddenKey: string | null;
  restoreKey: string | null;
  open: (selection: Omit<Selection, 'uid'>) => void;
}
const Zoom = createContext<ZoomContext | null>(null);

/** Ein gemeinsamer Profil-Zoom für Fächer und Galerie der Must-Eat-Seite. */
export function MustEatCardZoomProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const lang = useLocale();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hidden, setHidden] = useState<{ key: string; uid: string | null } | null>(null);
  const [restoreKey, setRestoreKey] = useState<string | null>(null);
  const currentRef = useRef(selection);
  currentRef.current = selection;
  // Ein Kontowechsel schließt private Motive sofort, auch während des Rückflugs.
  const authorized = uid === null || !authLoading;
  const current = authorized && selection?.uid === uid ? selection : null;
  const hiddenKey = authorized && hidden?.uid === uid ? hidden.key : null;
  const previousViewer = useRef({ uid, authorized });
  useEffect(() => {
    const previous = previousViewer.current;
    previousViewer.current = { uid, authorized };
    if (previous.uid !== uid || previous.authorized !== authorized) {
      setSelection(null);
      setHidden(null);
      setRestoreKey(null);
    }
  }, [uid, authorized]);
  const open = useCallback((next: Omit<Selection, 'uid'>) => {
    setRestoreKey(null);
    setSelection({ ...next, uid });
  }, [uid]);
  const close = useCallback(() => {
    setRestoreKey(currentRef.current?.key ?? null);
    setSelection(null);
  }, []);
  const onOpenReady = useCallback(() => {
    const next = currentRef.current;
    if (next) setHidden({ key: next.key, uid: next.uid });
  }, []);
  const onExitComplete = useCallback(() => {
    if (!currentRef.current) setHidden(null);
  }, []);

  return (
    <Zoom.Provider value={{ hiddenKey, restoreKey, open }}>
      {children}
      <LazyMustEatImageLightbox
        active={Boolean(current || hiddenKey)}
        imageUrl={current?.imageUrl ?? null}
        placeholderUrl={current?.placeholderUrl ?? null}
        alt={current?.imageAlt ?? 'Must Eat'}
        originRect={current?.rect ?? null}
        restoreFocusTo={current?.trigger}
        onClose={close}
        onOpenReady={onOpenReady}
        onExitComplete={onExitComplete}
        action={current ? (
          <MapIntentLink href={mustEatMapHref(current.card)} className="et-btn et-btn-alt" onClick={close}>
            {lang === 'de' ? 'Zum Spot' : 'View spot'}
          </MapIntentLink>
        ) : null}
      />
    </Zoom.Provider>
  );
}

type CardProps = Omit<ComponentPropsWithoutRef<'button'>, 'onClick' | 'type'> & {
  card: MapMustEat;
  imageUrl: string;
  imageAlt?: string;
};

export function MustEatZoomCard({ card, imageUrl, imageAlt = 'Must Eat', children, style, ...props }: CardProps) {
  const zoom = useContext(Zoom);
  const key = useId();
  const button = useRef<HTMLButtonElement>(null);
  const wasHidden = useRef(false);
  const hidden = zoom?.hiddenKey === key;
  const restore = zoom?.restoreKey === key;
  // Fokus erst nach dem DOM-Commit zurückgeben: Chrome ignoriert focus(),
  // solange die zurückfliegende Ursprungskarte noch visibility:hidden trägt.
  useLayoutEffect(() => {
    if (wasHidden.current && !hidden && restore) button.current?.focus({ preventScroll: true });
    wasHidden.current = hidden;
  }, [hidden, restore]);
  if (!zoom) throw new Error('MustEatZoomCard requires MustEatCardZoomProvider');
  return (
    <button {...props} ref={button} type="button" aria-haspopup="dialog"
      style={{ ...style, visibility: hidden ? 'hidden' : undefined }}
      onClick={event => zoom.open({
        key, card, imageUrl, imageAlt,
        trigger: event.currentTarget,
        rect: event.currentTarget.getBoundingClientRect(),
        placeholderUrl: event.currentTarget.querySelector('img')?.currentSrc ?? null,
      })}
    >
      {children}
    </button>
  );
}
