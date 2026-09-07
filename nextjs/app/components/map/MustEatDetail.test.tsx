// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import type { MustEatDetailState } from './useMustEatDetailState';

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

  it('shows the Starter Pack layer for a guest, whose button opens the login', () => {
    const onUnlock = vi.fn().mockResolvedValue(true);
    const showNotice = vi.fn();
    window.showNotice = showNotice;

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

    /* Erst die Tafel als Layer (Betreiber, 07.09.2026: „als Layer nach einem
       Klick"), nicht sofort das Login. */
    expect(openLoginModal).not.toHaveBeenCalled();
    expect(showNotice).toHaveBeenCalledOnce();
    const notice = showNotice.mock.calls[0][0];
    expect(notice).toMatchObject({
      layer: true,
      duration: 0,
      eyebrow: 'Gratis',
      title: 'Starter Pack',
      detail: 'Melde dich an und bekomm 20 Must Eats. Diese ist dabei.',
    });
    expect(notice.action.label).toBe('Starter Pack holen');

    /* Der gelbe Knopf oeffnet das Login — mit der angetippten Karte als
       Absicht: die Tafel verspricht „diese ist dabei", und
       /api/starter-pack loest das ein. */
    notice.action.onClick();
    expect(openLoginModal).toHaveBeenCalledWith('starter', { starterMustEatId: 'must-eat-1' });
    expect(onUnlock).not.toHaveBeenCalled();
    delete window.showNotice;
  });
});

/* Verweigert ist kein Zustand der Karte, sondern eine Meldung: der Tipp auf die
   verdeckte Karte ruft dieselbe Info-Karte, die Map und Startseite für eine
   verweigerte Berechtigung zeigen — mit denselben Worten aus
   lib/map/locationStatus.ts (Nutzer, 02.09.2026: „soll eine Meldung sein wie
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
      tone: 'warning',
      icon: 'pin',
      eyebrow: 'Standort',
      title: 'Blockiert',
      detail: 'Im Browser erlauben, dann nochmal tippen.',
    });
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
