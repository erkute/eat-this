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

/* Ob die Identitaetsseite kommt, fragt die Tour bei Firebase — hier gesteuert. */
const identityStep = vi.hoisted(() => ({
  identityStepPrefill: vi.fn(),
  saveIdentity: vi.fn(),
}));
vi.mock('@/lib/auth/identityStep', () => identityStep);

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
  identityStep.identityStepPrefill.mockReset().mockResolvedValue(null);
  identityStep.saveIdentity.mockReset().mockResolvedValue(undefined);
});

/* Die Tour geht erst auf, wenn feststeht, ob sie nach Name und Charakter
   fragt — das ist ein Promise, also asynchron warten. */
async function arrive() {
  await act(async () => finishStarterPackCheck(true));
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Ankunft nach der Anmeldung', () => {
  it('erscheint, wenn das Starter Pack vergeben wurde — ohne Zustandswechsel im Dokument', async () => {
    render(<SignInReward />);
    expect(screen.queryByText(/Willkommen bei Eat This/)).toBeNull();

    /* Genau das, was nach einem Magic-Link passiert: frisch geladene Seite,
       niemand war hier je abgemeldet, die Vergabe meldet sich. */
    await act(async () => {
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

  it('bleibt sichtbar, bis der Nutzer selbst weitergeht', async () => {
    render(<SignInReward />);
    await arrive();
    act(() => void vi.advanceTimersByTime(60000));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading').textContent).toBe('Öffne dein Starter Pack.');
  });

  it('öffnet zuerst das Pack, führt dann durch die Funktionen und endet an zwei Türen', async () => {
    render(<SignInReward />);
    await arrive();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }));
    expect((screen.getByRole('button', { name: 'Öffnet …' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    act(() => void vi.advanceTimersByTime(2100));
    /* Der Text wartet auf den Klick — erst der naechste Schritt erklaert die
       zwei Stapel. */
    expect(screen.getByRole('heading').textContent).toBe('Öffne dein Starter Pack.');
    expect(screen.getByText('10 verdeckt').getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByRole('heading').textContent).toBe('Deine ersten 20 Karten.');
    expect(screen.getByText('10 offen').getAttribute('aria-hidden')).toBe('false');
    expect(screen.getByText('10 verdeckt').getAttribute('aria-hidden')).toBe('false');

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
    expect(screen.getByRole('link', { name: 'Deck' }).getAttribute('href')).toBe('/profile');
    fireEvent.click(screen.getByRole('link', { name: 'Map' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('fuehrt auf der Sammel-Seite das Aufdecken vor: verdeckt, dann umgedreht, antippbar', async () => {
    render(<SignInReward />);
    await arrive();
    fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }));
    act(() => void vi.advanceTimersByTime(2100));
    for (let step = 0; step < 4; step++)
      fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByRole('heading').textContent).toBe('Hingehen. Aufdecken. Sammeln.');
    const flipper = screen.getByTestId('tour-flipper');
    expect(flipper.className).toContain('flipped');
    act(() => void vi.advanceTimersByTime(800));
    expect(flipper.className).not.toContain('flipped');

    fireEvent.click(screen.getByRole('button', { name: 'Karte umdrehen' }));
    expect(flipper.className).toContain('flipped');
  });

  it('startet nicht unter dem Wartescreen — der ist fast deckend', async () => {
    const screenView = render(<AuthScreen mode="in" />);
    render(<SignInReward />);
    await arrive();

    /* The tour must wait until the sign-in screen is gone. */
    expect(screen.queryByText(/Willkommen bei Eat This/)).toBeNull();

    await act(async () => screenView.unmount());
    expect(screen.getByText(/Willkommen bei Eat This/)).toBeTruthy();
  });

  it('laesst sich vorher wegklicken', async () => {
    render(<SignInReward />);
    await arrive();
    fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }));
    act(() => void vi.advanceTimersByTime(240));
    expect(screen.queryByText(/Willkommen bei Eat This/)).toBeNull();
  });
});

describe('Wer bist du? — fuer Konten ohne Charakter (Google)', () => {
  it('fragt zuerst nach Name und Charakter, speichert und oeffnet dann das Pack', async () => {
    identityStep.identityStepPrefill.mockResolvedValue({ name: 'Alex' });
    render(<SignInReward />);
    await arrive();

    expect(screen.getByRole('heading').textContent).toBe('Wer bist du?');
    expect(screen.getByText('1 / 7')).toBeTruthy();
    const name = screen.getByLabelText('Dein Name') as HTMLInputElement;
    expect(name.value).toBe('Alex');

    fireEvent.click(screen.getByRole('radio', { name: 'Pizza-Pate' }));
    expect(screen.getByRole('radio', { name: 'Pizza-Pate' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    fireEvent.change(name, { target: { value: '  Alexa ' } });
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Weiter' })));

    expect(identityStep.saveIdentity).toHaveBeenCalledWith('Alexa', 3);
    expect(screen.getByRole('heading').textContent).toBe('Öffne dein Starter Pack.');
    expect(screen.getByText('2 / 7')).toBeTruthy();
  });

  it('laesst ohne Namen nicht weiter', async () => {
    identityStep.identityStepPrefill.mockResolvedValue({ name: '' });
    render(<SignInReward />);
    await arrive();
    expect((screen.getByRole('button', { name: 'Weiter' }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('bleibt auf der Seite und sagt es, wenn das Speichern scheitert', async () => {
    identityStep.identityStepPrefill.mockResolvedValue({ name: 'Alex' });
    identityStep.saveIdentity.mockRejectedValue(new Error('offline'));
    render(<SignInReward />);
    await arrive();
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Weiter' })));

    expect(screen.getByRole('heading').textContent).toBe('Wer bist du?');
    expect(screen.getByRole('alert').textContent).toMatch(/schiefgelaufen/);
  });

  it('laeuft ohne die Seite, wenn die Abfrage scheitert', async () => {
    identityStep.identityStepPrefill.mockRejectedValue(new Error('offline'));
    render(<SignInReward />);
    await arrive();
    expect(screen.getByRole('heading').textContent).toBe('Öffne dein Starter Pack.');
    expect(screen.getByText('1 / 6')).toBeTruthy();
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
