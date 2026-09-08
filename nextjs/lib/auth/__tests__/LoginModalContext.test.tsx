// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { LoginModalProvider, useLoginModal } from '../LoginModalContext';

const mount = () => renderHook(() => useLoginModal(), { wrapper: LoginModalProvider });

describe('LoginModalContext', () => {
  it('startet geschlossen, im Starter-Modus, ohne Absicht', () => {
    const { result } = mount();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.mode).toBe('starter');
    expect(result.current.intent).toBeNull();
  });

  it('öffnet ohne Argument im Starter-Modus', () => {
    const { result } = mount();
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('starter');
  });

  it('schaltet auf den Einloggen-Modus und wieder zurück', () => {
    const { result } = mount();
    act(() => result.current.open('signin'));
    expect(result.current.mode).toBe('signin');

    act(() => result.current.close());
    act(() => result.current.open('starter'));
    expect(result.current.mode).toBe('starter');
  });

  /* Die verdeckte Karte, die ein Gast angetippt hat: sie muss den Weg zum
     Konto überleben — die Anmelde-Tafel verspricht „diese ist dabei". */
  it('trägt die angetippte Karte als Absicht mit', () => {
    const { result } = mount();
    act(() => result.current.open('starter', { starterMustEatId: 'me-9' }));
    expect(result.current.intent).toEqual({ starterMustEatId: 'me-9' });
  });

  /* Die Absicht geht mit dem Modal: wer abbricht und später über das
     Burger-Menü hereinkommt, soll nicht den Spot von vorhin geherzt bekommen. */
  it('vergisst die Absicht beim Schliessen', () => {
    const { result } = mount();
    act(() => result.current.open('starter', { heartRestaurantId: 'sofi' }));
    expect(result.current.intent).toEqual({ heartRestaurantId: 'sofi' });

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.intent).toBeNull();
  });

  it('überschreibt eine alte Absicht beim erneuten Öffnen ohne neue', () => {
    const { result } = mount();
    act(() => result.current.open('starter', { heartRestaurantId: 'sofi' }));
    act(() => result.current.open('signin'));
    expect(result.current.intent).toBeNull();
  });

  it('sagt deutlich, wenn der Provider fehlt', () => {
    expect(() => renderHook(() => useLoginModal())).toThrow(
      /useLoginModal must be used inside <LoginModalProvider>/
    );
  });
});
