// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (key: string) => key, setLang: vi.fn() }),
}));

import NotificationToast from './NotificationToast';

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function card() {
  return document.querySelector('.notification') as HTMLElement;
}

describe('NotificationToast — die eine Infoflaeche', () => {
  it('uebersetzt eine fertige Zeile in Augenbraue, Titel und Detail', () => {
    render(<NotificationToast />);

    act(() => {
      window.showNotification?.('Spot gespeichert');
    });

    expect(card().className).toContain('show');
    expect(card().dataset.tone).toBe('success');
    expect(screen.getByText('Spot')).toBeTruthy();
    expect(screen.getByText('Gespeichert')).toBeTruthy();
  });

  it('faehrt nach der Standzeit wieder zu, bleibt aber im Dokument', () => {
    render(<NotificationToast />);

    act(() => {
      window.showNotification?.('Spot gespeichert');
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Die Huelle ist der aria-live-Bereich und der Rahmen des Uebergangs —
    // sie bleibt stehen, nur `show` faellt weg.
    expect(card()).toBeTruthy();
    expect(card().className).not.toContain('show');
  });

  it('gibt der Standort-Meldung Knoepfe und laesst sie stehen', () => {
    render(<NotificationToast />);
    const retry = vi.fn();

    act(() => {
      window.showNotice?.({
        tone: 'warning',
        icon: 'pin',
        eyebrow: 'Standort',
        title: 'Standort nicht gefunden',
        action: { label: 'Nochmal', onClick: retry },
        onDismiss: vi.fn(),
        duration: 0,
      });
    });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(card().className).toContain('show');

    act(() => {
      screen.getByText('Nochmal').click();
    });
    expect(retry).toHaveBeenCalledOnce();
    expect(card().className).not.toContain('show');
  });

  /* Der Selbstabgang einer Standort-Meldung darf nicht die Bestaetigung
     abraeumen, die kurz vorher an ihre Stelle getreten ist. */
  it('raeumt nur die eigene Meldung ab, nie die nachgerueckte', () => {
    render(<NotificationToast />);

    let release: (() => void) | void;
    act(() => {
      release = window.showNotice?.({
        tone: 'warning',
        icon: 'pin',
        eyebrow: 'Standort',
        title: 'Standort nicht gefunden',
        duration: 0,
      });
    });
    act(() => {
      window.showNotification?.('Spot gespeichert');
    });
    act(() => {
      release?.();
    });

    expect(card().className).toContain('show');
    expect(screen.getByText('Gespeichert')).toBeTruthy();
  });

  /* Standort-Meldungen liegen als Layer ueber der Seite: ein Tipp daneben
     darf nichts in der Seite ausloesen, sondern raeumt die Karte weg. */
  it('legt der Layer-Meldung einen Scrim unter, der sie beim Tipp abraeumt', () => {
    render(<NotificationToast />);
    const onDismiss = vi.fn();

    act(() => {
      window.showNotice?.({
        tone: 'warning',
        icon: 'pin',
        eyebrow: 'Standort',
        title: 'Blockiert',
        onDismiss,
        duration: 0,
        layer: true,
      });
    });

    const layer = document.querySelector('.notification-layer') as HTMLElement;
    expect(layer.hasAttribute('data-layer')).toBe(true);
    const scrim = document.querySelector('.notification-scrim') as HTMLElement;
    expect(scrim).toBeTruthy();

    act(() => {
      scrim.click();
    });
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(card().className).not.toContain('show');
    expect(layer.hasAttribute('data-layer')).toBe(false);
  });

  it('laesst die kurze Bestaetigung ohne Scrim durch', () => {
    render(<NotificationToast />);

    act(() => {
      window.showNotification?.('Spot gespeichert');
    });

    expect(document.querySelector('.notification-scrim')).toBeNull();
    expect(document.querySelector('.notification-layer')?.hasAttribute('data-layer')).toBe(false);
  });

  /* Rechtsbuendig sitzt der Primaerknopf ganz rechts — also als letzter. */
  it('stellt „Alles klar" vor die Aktion', () => {
    render(<NotificationToast />);

    act(() => {
      window.showNotice?.({
        tone: 'warning',
        icon: 'pin',
        eyebrow: 'Standort',
        title: 'Blockiert',
        action: { label: 'Nochmal', onClick: vi.fn() },
        onDismiss: vi.fn(),
        duration: 0,
        layer: true,
      });
    });

    const labels = Array.from(document.querySelectorAll('.notification-actions button')).map(
      (b) => b.textContent
    );
    expect(labels).toEqual(['Alles klar', 'Nochmal']);
  });

  it('raeumt den Layer mit Escape ab', () => {
    render(<NotificationToast />);
    const onDismiss = vi.fn();

    act(() => {
      window.showNotice?.({
        tone: 'info',
        icon: 'pin',
        eyebrow: 'Standort',
        title: 'Wir suchen dich',
        onDismiss,
        duration: 0,
        layer: true,
      });
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(card().className).not.toContain('show');
  });

  it('reicht eine ueber den Seitenwechsel hinterlegte Meldung nach', () => {
    sessionStorage.setItem('eatthis_toast', 'Du bist angemeldet');
    render(<NotificationToast />);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(card().className).toContain('show');
    expect(screen.getByText('Du bist drin')).toBeTruthy();
    expect(sessionStorage.getItem('eatthis_toast')).toBeNull();
  });
});
