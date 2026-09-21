// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

/* Die Einblendung selbst ist Bild + drei Zeilen; interessant ist allein, WANN
   sie kommt. next-intl und next/image stehen dem im Weg, also raus damit. */
vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('next/image', () => ({
  default: () => null,
}));
/* Der Wartescreen wird echt gerendert — nur seine Texte sind hier egal. */
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (key: string) => key }),
}));

import SignInReward from './SignInReward';
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
    expect(screen.queryByText(/Starter Pack eingelöst/)).toBeNull();

    /* Genau das, was nach einem Magic-Link passiert: frisch geladene Seite,
       niemand war hier je abgemeldet, die Vergabe meldet sich. */
    act(() => {
      startStarterPackCheck();
      finishStarterPackCheck(true);
    });

    expect(screen.getByText(/Starter Pack eingelöst/)).toBeTruthy();
  });

  it('bleibt bei einem Wiederkehrer aus — `already_claimed` ist keine Ankunft', () => {
    render(<SignInReward />);
    act(() => {
      startStarterPackCheck();
      finishStarterPackCheck(false);
    });
    expect(screen.queryByText(/Starter Pack eingelöst/)).toBeNull();
  });

  it('geht nach fünf Sekunden von allein', () => {
    render(<SignInReward />);
    act(() => finishStarterPackCheck(true));
    expect(screen.getByText(/Starter Pack eingelöst/)).toBeTruthy();

    act(() => void vi.advanceTimersByTime(5000));
    act(() => void vi.advanceTimersByTime(240));
    expect(screen.queryByText(/Starter Pack eingelöst/)).toBeNull();
  });

  it('startet nicht unter dem Wartescreen — der ist fast deckend', () => {
    const screenView = render(<AuthScreen mode="in" />);
    render(<SignInReward />);
    act(() => finishStarterPackCheck(true));

    /* Das Pack ist da, aber der Schleier liegt darueber: die fuenf Sekunden
       duerfen noch nicht laufen. */
    expect(screen.queryByText(/Starter Pack eingelöst/)).toBeNull();

    act(() => screenView.unmount());
    expect(screen.getByText(/Starter Pack eingelöst/)).toBeTruthy();
  });

  it('laesst sich vorher wegklicken', () => {
    render(<SignInReward />);
    act(() => finishStarterPackCheck(true));
    fireEvent.click(screen.getByRole('button'));
    act(() => void vi.advanceTimersByTime(240));
    expect(screen.queryByText(/Starter Pack eingelöst/)).toBeNull();
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
