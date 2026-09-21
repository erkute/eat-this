// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

/* Exercise the real arrival event and the user-controlled introduction. */
vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  default: () => null,
}));
/* Der Wartescreen wird echt gerendert — nur seine Texte sind hier egal. */
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (key: string) => key }),
}));

import SignInReward from './SignInReward';
import { openOnboarding } from '@/lib/onboarding';
import AuthScreen from './AuthScreen';
import {
  announceSignIn,
  finishStarterPackCheck,
  startStarterPackCheck,
} from '@/lib/auth/signInArrival';

/* Das Modul haelt seinen Zustand pro Seitenleben — zwischen zwei Faellen muss
   es frisch sein, sonst schweigt der Toast im zweiten Fall wegen des ersten. */
async function freshModule() {
  vi.resetModules();
  return import('@/lib/auth/signInArrival');
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Ankunft nach der Anmeldung', () => {
  it('erscheint, wenn das Starter Pack vergeben wurde — ohne Zustandswechsel im Dokument', () => {
    render(<SignInReward />);
    expect(screen.queryByText(/Willkommen bei Eat This/)).toBeNull();

    /* Genau das, was nach einem Magic-Link passiert: frisch geladene Seite,
       niemand war hier je abgemeldet, die Vergabe meldet sich. */
    act(() => {
      startStarterPackCheck();
      finishStarterPackCheck(true);
    });

    expect(screen.getByText(/Willkommen bei Eat This/)).toBeTruthy();
  });

  it('bleibt bei einem Wiederkehrer aus — `already_claimed` ist keine Ankunft', () => {
    render(<SignInReward />);
    act(() => {
      startStarterPackCheck();
      finishStarterPackCheck(false);
    });
    expect(screen.queryByText(/Willkommen bei Eat This/)).toBeNull();
  });

  it('bleibt sichtbar, bis der Nutzer selbst weitergeht', () => {
    render(<SignInReward />);
    act(() => finishStarterPackCheck(true));
    act(() => void vi.advanceTimersByTime(60000));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading').textContent).toBe('Öffne dein Starter Pack.');
  });

  it('öffnet zuerst das Pack, führt dann durch die Funktionen und endet an zwei Türen', () => {
    render(<SignInReward />);
    act(() => finishStarterPackCheck(true));
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }));
    expect((screen.getByRole('button', { name: 'Öffnet …' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    act(() => void vi.advanceTimersByTime(1900));
    expect(screen.getByRole('heading').textContent).toBe('Deine ersten Karten.');
    expect(screen.getByText('10 verdeckt')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByRole('heading').textContent).toBe('Die Berlin Food Map.');
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByRole('heading').textContent).toBe('Wissen, was du bestellst.');
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(screen.getByRole('heading').textContent).toBe('Die Berlin Food Map.');
    for (let step = 0; step < 3; step++)
      fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByRole('heading').textContent).toBe('Wohin zuerst?');
    expect(screen.queryByRole('button', { name: 'Weiter' })).toBeNull();
    expect(screen.getByRole('link', { name: /Deck/ }).getAttribute('href')).toBe('/profile');
    fireEvent.click(screen.getByRole('link', { name: /Map/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('lässt sich wiederholen, ohne erneut ein Pack zu behaupten', () => {
    render(<SignInReward />);
    act(() => openOnboarding());
    expect(screen.getByText('So geht’s')).toBeTruthy();
    // Kein Pack: die Wiederholung beginnt bei der Map.
    expect(screen.getByRole('heading').textContent).toBe('Die Berlin Food Map.');
    expect(screen.queryByRole('button', { name: 'Öffnen' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => openOnboarding());
    expect(screen.getByRole('heading').textContent).toBe('Die Berlin Food Map.');
  });

  it('gibt den Fokus an den Knopf zurück, der sie geöffnet hat', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    render(<SignInReward />);
    act(() => openOnboarding(trigger));
    fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }));
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('startet nicht unter dem Wartescreen — der ist fast deckend', () => {
    const screenView = render(<AuthScreen mode="in" />);
    render(<SignInReward />);
    act(() => finishStarterPackCheck(true));

    /* The tour must wait until the sign-in screen is gone. */
    expect(screen.queryByText(/Willkommen bei Eat This/)).toBeNull();

    act(() => screenView.unmount());
    expect(screen.getByText(/Willkommen bei Eat This/)).toBeTruthy();
  });

  it('laesst sich vorher wegklicken', () => {
    render(<SignInReward />);
    act(() => finishStarterPackCheck(true));
    fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }));
    act(() => void vi.advanceTimersByTime(240));
    expect(screen.queryByText(/Willkommen bei Eat This/)).toBeNull();
  });
});

describe('Einblendung und Toast schliessen einander aus', () => {
  it('haelt die Anmelde-Zeile zurueck, solange die Vergabe laeuft, und verwirft sie beim Pack', async () => {
    const arrival = await freshModule();
    const toast = vi.fn();

    arrival.startStarterPackCheck();
    arrival.announceSignIn(toast);
    expect(toast).not.toHaveBeenCalled();

    arrival.finishStarterPackCheck(true);
    expect(toast).not.toHaveBeenCalled();
  });

  it('holt die Anmelde-Zeile nach, wenn kein Pack kommt', async () => {
    const arrival = await freshModule();
    const toast = vi.fn();

    arrival.startStarterPackCheck();
    arrival.announceSignIn(toast);
    arrival.finishStarterPackCheck(false);

    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('sagt sofort Bescheid, wenn gar keine Vergabe laeuft', async () => {
    const arrival = await freshModule();
    const toast = vi.fn();
    arrival.announceSignIn(toast);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('schweigt, wenn das Pack schon gemeldet wurde, bevor die Zeile drankam', async () => {
    const arrival = await freshModule();
    const toast = vi.fn();

    arrival.startStarterPackCheck();
    arrival.finishStarterPackCheck(true);
    arrival.announceSignIn(toast);

    expect(toast).not.toHaveBeenCalled();
  });

  it('verliert die Meldung nicht, wenn sie vor dem ersten Zuhoerer kommt', async () => {
    const arrival = await freshModule();
    arrival.finishStarterPackCheck(true);

    const seen = vi.fn();
    arrival.subscribeStarterPackGranted(seen);
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

/* Referenz auf die Importe oben, damit der Linter sie nicht fuer tot haelt. */
void announceSignIn;
