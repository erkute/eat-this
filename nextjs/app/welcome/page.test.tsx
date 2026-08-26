// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

const fb = vi.hoisted(() => ({
  isSignInWithEmailLink: vi.fn(() => true),
  signInWithEmailLink: vi.fn(),
  applyActionCode: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock('firebase/auth', () => fb);
vi.mock('@/lib/firebase/config', () => ({ auth: {}, getDb: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ handoffEvent: vi.fn() }));
// Stabile Instanz: der Effekt der Seite hängt an [params] — ein Mock, der pro
// Aufruf ein neues URLSearchParams liefert, dreht ihn in eine Endlosschleife.
const searchParams = new URLSearchParams(
  'mode=signIn&oobCode=abc&continueUrl=' +
    encodeURIComponent('https://staging.example/map?r=spot&claim=1&e=test%40example.com')
);
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

import AuthActionPage from './page';

beforeEach(() => {
  fb.signInWithEmailLink.mockReset();
  fb.signInWithEmailLink.mockResolvedValue({ user: { displayName: 'Wer' } });
  localStorage.clear();
});

describe('/welcome mit Sign-in-Link', () => {
  it('löst den Code beim LADEN nicht ein — Scanner rendern diese Seite mit JS', async () => {
    /* Der einmalige Code ging auf Staging zweimal an einen Postfach-Scanner
       verloren, der den alten Auto-Sign-in komplett selbst ausführte
       (26.08.2026, auth/invalid-action-code auf sekundenfrische Codes). Ein
       Button klickt sich nicht von allein — das ist die ganze Abwehr. */
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<AuthActionPage />));
    });
    expect(fb.signInWithEmailLink).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Jetzt anmelden');
    // Der Klick beantwortet eine echte Frage: als WER melde ich mich an?
    expect(container.textContent).toContain('test@example.com');
    // Der Faden zum Spot reisst nicht ab.
    expect(container.textContent).toContain('Dein Spot wartet schon.');
  });

  it('meldet erst nach dem Klick an', async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<AuthActionPage />));
    });
    const btn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Jetzt anmelden')
    )!;
    await act(async () => {
      btn.click();
    });
    expect(fb.signInWithEmailLink).toHaveBeenCalledTimes(1);
    expect(fb.signInWithEmailLink.mock.calls[0][1]).toBe('test@example.com');
  });

  it('zeigt die Sackgasse, wenn der Code beim Klick schon verbraucht ist', async () => {
    fb.signInWithEmailLink.mockRejectedValue({ code: 'auth/invalid-action-code' });
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<AuthActionPage />));
    });
    const btn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Jetzt anmelden')
    )!;
    await act(async () => {
      btn.click();
    });
    expect(container.textContent).toContain('Dieser Link geht nicht mehr');
  });
});
