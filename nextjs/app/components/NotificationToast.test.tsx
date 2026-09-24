// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (key: string) => key, setLang: vi.fn() }),
}));

import NotificationToast from './NotificationToast';
import { notify } from '@/lib/notice';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function card() {
  return document.querySelector('.notification') as HTMLElement;
}

describe('NotificationToast — die eine Infoflaeche', () => {
  it('zeigt eine Meldung aus dem Katalog mit Kicker, Titel und Zeile', () => {
    render(<NotificationToast />);

    act(() => {
      notify('spotSaved', 'de');
    });

    expect(card().className).toContain('show');
    expect(card().dataset.tone).toBeUndefined();
    expect(screen.getByText('Spot')).toBeTruthy();
    expect(screen.getByText('Gespeichert')).toBeTruthy();
    expect(screen.getByText('Noch einer für deine Liste.')).toBeTruthy();
  });

  /* Bis 24.09.2026 las die Karte freie Saetze nach Stichworten: „Konnte
     nicht gespeichert werden." enthielt „gespeichert" und kam als
     Erfolgsmeldung an. Ein Fehler ist jetzt eine eigene Meldung. */
  it('zeigt einen Fehler als Fehler, nie als Bestaetigung', () => {
    render(<NotificationToast />);

    act(() => {
      notify('actionFailed', 'de');
    });

    expect(card().dataset.tone).toBe('error');
    expect(screen.getByText('Hat nicht geklappt')).toBeTruthy();
    expect(screen.queryByText('Gespeichert')).toBeNull();
  });

  it('faehrt nach der Standzeit wieder zu, bleibt aber im Dokument', () => {
    render(<NotificationToast />);

    act(() => {
      notify('spotSaved', 'de');
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Die Huelle ist der aria-live-Bereich und der Rahmen des Uebergangs —
    // sie bleibt stehen, nur `show` faellt weg.
    expect(card()).toBeTruthy();
    expect(card().className).not.toContain('show');
  });

  /* iOS 26 Safari faerbt seine Leisten nach jeder fixierten Huelle an der
     Viewport-Kante, auch einer unsichtbaren. Fixiert (data-open) ist die
     Huelle deshalb nur, solange eine Karte steht — sie geht ohne Ausfahren,
     wie Onboarding und Anmelde-Layer. */
  it('fixiert die Huelle nur, solange die Karte steht', () => {
    render(<NotificationToast />);
    const layer = () => document.querySelector('.notification-layer') as HTMLElement;

    expect(layer().hasAttribute('data-open')).toBe(false);

    act(() => {
      notify('spotSaved', 'de');
    });
    expect(layer().hasAttribute('data-open')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(card().className).not.toContain('show');
    expect(layer().hasAttribute('data-open')).toBe(false);
  });

  /* Die Huelle ist zugeklappt display: none — die Ansage fuer Screenreader
     kommt deshalb aus einer eigenen, immer gerenderten Live-Region. */
  it('sagt die Karte in einer eigenen Live-Region an und leert sie danach', () => {
    render(<NotificationToast />);
    const live = () => document.querySelector('.notification-live') as HTMLElement;

    expect(live().getAttribute('aria-live')).toBe('polite');
    expect(live().textContent).toBe('');
    expect(card().hasAttribute('aria-live')).toBe(false);

    act(() => {
      notify('spotSaved', 'de');
    });
    expect(live().textContent).toContain('Gespeichert');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(live().textContent).toBe('');
  });

  it('gibt der Standort-Meldung Knoepfe und laesst sie stehen', () => {
    render(<NotificationToast />);
    const retry = vi.fn();

    act(() => {
      window.showNotice?.({
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
        eyebrow: 'Standort',
        title: 'Standort nicht gefunden',
        duration: 0,
      });
    });
    act(() => {
      notify('spotSaved', 'de');
    });
    act(() => {
      release?.();
    });

    expect(card().className).toContain('show');
    expect(screen.getByText('Gespeichert')).toBeTruthy();
  });

  /* Eine Meldung mit Knoepfen wartet auf eine Antwort und liegt als Layer
     ueber der Seite: ein Tipp daneben darf nichts in der Seite ausloesen,
     sondern raeumt die Karte weg. */
  it('legt einer Meldung mit Knoepfen einen Scrim unter, der sie beim Tipp abraeumt', () => {
    render(<NotificationToast />);
    const onDismiss = vi.fn();

    act(() => {
      window.showNotice?.({
        eyebrow: 'Standort',
        title: 'Blockiert',
        onDismiss,
        duration: 0,
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
    expect(document.querySelector('.notification-scrim')).toBeNull();
  });

  it('laesst die kurze Bestaetigung ohne Scrim durch', () => {
    render(<NotificationToast />);

    act(() => {
      notify('spotSaved', 'de');
    });

    expect(document.querySelector('.notification-scrim')).toBeNull();
    expect(document.querySelector('.notification-layer')?.hasAttribute('data-layer')).toBe(false);
  });

  /* Der gelbe Knopf sitzt rechts — also als letzter. */
  it('stellt „Alles klar" vor die Aktion und macht die Aktion gelb', () => {
    render(<NotificationToast />);

    act(() => {
      window.showNotice?.({
        eyebrow: 'Standort',
        title: 'Blockiert',
        action: { label: 'Nochmal', onClick: vi.fn() },
        onDismiss: vi.fn(),
        duration: 0,
      });
    });

    const labels = Array.from(document.querySelectorAll('.notification-actions button')).map(
      (b) => b.textContent
    );
    expect(labels).toEqual(['Alles klar', 'Nochmal']);
    expect(document.querySelector('.notification-primary')?.textContent).toBe('Nochmal');
  });

  it('macht „Alles klar" gelb, wenn es die einzige Antwort ist', () => {
    render(<NotificationToast />);

    act(() => {
      notify('locationBlocked', 'de', { onDismiss: vi.fn(), duration: 0 });
    });

    const buttons = document.querySelectorAll('.notification-actions button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].className).toBe('notification-primary');
    expect(buttons[0].textContent).toBe('Alles klar');
  });

  it('raeumt den Layer mit Escape ab', () => {
    render(<NotificationToast />);
    const onDismiss = vi.fn();

    act(() => {
      window.showNotice?.({
        eyebrow: 'Standort',
        title: 'Blockiert',
        onDismiss,
        duration: 0,
      });
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(card().className).not.toContain('show');
  });
});
