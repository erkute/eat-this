// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import type { MustEatDetailState } from './useMustEatDetailState';
import { GUEST_SHAKE_MS } from '@/lib/guestCardShake';

const openLoginModal = vi.fn();
const lightboxProps = vi.fn();

vi.mock('@/lib/auth', () => ({
  useLoginModal: () => ({ open: openLoginModal }),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => (key === 'covered' ? 'Verdeckt' : key),
  useLocale: () => 'de',
}));
vi.mock('./MustEatRevealOverlay', () => ({ default: () => null }));
vi.mock('./LazyMustEatImageLightbox', () => ({
  default: (props: Record<string, unknown>) => {
    lightboxProps(props);
    return null;
  },
}));
vi.mock('./MustEatDetailMobile', () => ({
  default: ({ state }: { state: MustEatDetailState }) => (
    <button type="button" onClick={state.handleCardClick}>
      Reveal Must Eat
    </button>
  ),
}));

import MustEatDetail from './MustEatDetail';

const mustEat: MapMustEat = {
  _id: 'must-eat-1',
  restaurant: {
    _id: 'restaurant-1',
    name: 'Test Spot',
    slug: 'test-spot',
    lat: 52.52,
    lng: 13.405,
  },
};

describe('MustEatDetail login gate', () => {
  beforeEach(() => {
    openLoginModal.mockClear();
  });

  it('opens the sign-up form for a guest once the card has shaken, with the tapped card as intent', () => {
    vi.useFakeTimers();
    const onUnlock = vi.fn().mockResolvedValue(true);
    const showNotice = vi.fn();
    window.showNotice = showNotice;
    sessionStorage.clear();

    try {
      render(
        <MustEatDetail
          mustEat={mustEat}
          userLocation={{ lat: 52.52, lng: 13.405 }}
          isUnlocked={false}
          onUnlock={onUnlock}
          onClose={vi.fn()}
          uid={null}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Reveal Must Eat' }));
      act(() => {
        vi.advanceTimersByTime(GUEST_SHAKE_MS);
      });

      /* Das Formular, keine Tafel dazwischen (Betreiber, 07.09.2026: „soll
         sofort das Anmeldeformular oeffnen") — nur das kurze Zittern der
         Karte davor. Die Karte reist als Absicht mit — das Starter Pack legt
         sie garantiert offen hinein (/api/starter-pack, pendingStarterCard). */
      expect(showNotice).not.toHaveBeenCalled();
      expect(openLoginModal).toHaveBeenCalledOnce();
      expect(openLoginModal).toHaveBeenCalledWith({ kind: 'card', mustEatId: 'must-eat-1' });
      expect(sessionStorage.getItem('eatthis_pending_starter_card')).toContain('"must-eat-1"');
      expect(onUnlock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete window.showNotice;
      sessionStorage.clear();
    }
  });
});

/* ?revealdemo spielt nur Karten vor, die schon offen sind. Eine verdeckte
   kommt ohne Bild vom Server — umgedreht zeigte sie wieder den Rücken
   (Betreiber, 24.09.2026). */
describe('MustEatDetail reveal demo', () => {
  beforeEach(() => {
    openLoginModal.mockClear();
    sessionStorage.setItem('revealdemo', '1');
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it('leaves a covered card to its normal path instead of flipping an empty face', () => {
    vi.useFakeTimers();
    try {
      render(
        <MustEatDetail
          mustEat={mustEat}
          userLocation={null}
          isUnlocked={false}
          onUnlock={vi.fn()}
          onClose={vi.fn()}
          uid={null}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Reveal Must Eat' }));
      act(() => {
        vi.advanceTimersByTime(GUEST_SHAKE_MS);
      });
      // Ohne Demo: ein Gast landet bei der Anmeldung.
      expect(openLoginModal).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('replays an open card face-down, without the login detour', () => {
    const open: MapMustEat = { ...mustEat, dish: 'Croissant', image: '/card.webp' };
    render(
      <MustEatDetail
        mustEat={open}
        userLocation={null}
        isUnlocked
        onUnlock={vi.fn()}
        onClose={vi.fn()}
        uid={null}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reveal Must Eat' }));
    expect(openLoginModal).not.toHaveBeenCalled();
  });
});

/* Verweigert ist kein Zustand der Karte, sondern eine Meldung: der Tipp auf die
   verdeckte Karte ruft dieselbe Info-Karte, die Map und Startseite für eine
   verweigerte Berechtigung zeigen — mit denselben Worten aus
   lib/notice.ts (Nutzer, 02.09.2026: „soll eine Meldung sein wie
   auf der Startseite"). */
describe('MustEatDetail blocked location', () => {
  it('raises the shared location notice when the covered card is tapped', () => {
    const showNotice = vi.fn();
    window.showNotice = showNotice;

    /* Mit Konto: ein Gast bekaeme hier die Anmeldung, nicht die
       Standort-Meldung (useMustEatDetailState, 07.09.2026). */
    render(
      <MustEatDetail
        mustEat={mustEat}
        userLocation={null}
        locationError="denied"
        onRequestLocation={vi.fn()}
        isUnlocked={false}
        onUnlock={vi.fn()}
        onClose={vi.fn()}
        uid="u1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reveal Must Eat' }));

    expect(showNotice).toHaveBeenCalledOnce();
    expect(showNotice.mock.calls[0][0]).toMatchObject({
      eyebrow: 'Standort',
      title: 'Blockiert',
      detail: 'Im Browser erlauben, dann nochmal tippen.',
    });
    delete window.showNotice;
  });

  /* Die Karte fragt selbst nach dem Standort — und sagt dann auch, wenn das
     nichts wurde. Vorher blieb ein Fehlschlag im Detail stumm. */
  it('answers its own failed location request', () => {
    const showNotice = vi.fn();
    window.showNotice = showNotice;
    const onRequestLocation = vi.fn();
    const props = {
      mustEat,
      userLocation: null,
      onRequestLocation,
      isUnlocked: false,
      onUnlock: vi.fn(),
      onClose: vi.fn(),
      uid: 'u1',
    };
    const { rerender } = render(<MustEatDetail {...props} locationError={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reveal Must Eat' }));
    expect(onRequestLocation).toHaveBeenCalledOnce();
    expect(showNotice).not.toHaveBeenCalled();

    rerender(<MustEatDetail {...props} locationError="timeout" />);

    expect(showNotice).toHaveBeenCalledOnce();
    const notice = showNotice.mock.calls[0][0];
    expect(notice).toMatchObject({ eyebrow: 'Standort', title: 'Nicht gefunden' });
    notice.action.onClick();
    expect(onRequestLocation).toHaveBeenCalledTimes(2);
    delete window.showNotice;
  });

  it('stays quiet about an error it did not ask for', () => {
    const showNotice = vi.fn();
    window.showNotice = showNotice;

    render(
      <MustEatDetail
        mustEat={mustEat}
        userLocation={null}
        locationError="timeout"
        onRequestLocation={vi.fn()}
        isUnlocked={false}
        onUnlock={vi.fn()}
        onClose={vi.fn()}
        uid="u1"
      />
    );

    expect(showNotice).not.toHaveBeenCalled();
    delete window.showNotice;
  });
});

/* Der Zoom blättert durch denselben Stapel wie das Detail: Wisch und Pfeile
   der Lightbox rufen den Pager des Sheets, der Zähler zeigt den Stand im
   globalen Stapel. Vorher bekam die Lightbox keines dieser Felder und war im
   Zoom eine Sackgasse (Nutzer, 02.09.2026). */
describe('MustEatDetail zoom paging', () => {
  beforeEach(() => {
    lightboxProps.mockClear();
  });

  const revealed: MapMustEat = { ...mustEat, dish: 'Croissant', image: '/card.webp' };
  const neighbour: MapMustEat = { ...mustEat, _id: 'must-eat-2' };

  it('hands the sheet pager and the stack position to the lightbox', () => {
    const onPagePrev = vi.fn();
    const onPageNext = vi.fn();

    render(
      <MustEatDetail
        mustEat={revealed}
        userLocation={null}
        isUnlocked
        onUnlock={vi.fn()}
        onClose={vi.fn()}
        prevMustEat={neighbour}
        nextMustEat={null}
        onPagePrev={onPagePrev}
        onPageNext={onPageNext}
        position={{ index: 3, count: 25 }}
        uid="uid-1"
      />
    );

    const props = lightboxProps.mock.calls.at(-1)?.[0];
    expect(props.onPrev).toBe(onPagePrev);
    expect(props.onNext).toBe(onPageNext);
    expect(props.hasPrev).toBe(true);
    expect(props.hasNext).toBe(false);
    expect(props.position).toEqual({ index: 3, count: 25 });
    expect(props.imageUrl).toBe('/card.webp');
    expect(props.alt).toBe('Croissant');
  });

  /* Blättert der Zoom auf eine verdeckte Karte, zeigt er deren Rücken — wie die
     Galerie auf /must-eats. Der Server strippt dish und image, ohne Fallback
     bliebe die Lightbox auf dem vorigen Bild hängen. */
  it('shows the card back once paging lands on a covered card', () => {
    render(
      <MustEatDetail
        mustEat={mustEat}
        userLocation={null}
        isUnlocked={false}
        onUnlock={vi.fn()}
        onClose={vi.fn()}
        uid="uid-1"
      />
    );

    const props = lightboxProps.mock.calls.at(-1)?.[0];
    expect(props.imageUrl).toBe('/pics/card-back.webp?v=7');
    expect(props.alt).toBe('Verdeckt');
  });
});
