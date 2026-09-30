// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { LoginModalProvider, useLoginModal } from '../LoginModalContext';
import { takePendingStarterCard } from '../pendingStarterCard';

const mount = () => renderHook(() => useLoginModal(), { wrapper: LoginModalProvider });

describe('LoginModalContext', () => {
  it('startet geschlossen, ohne Grund und ohne Absicht', () => {
    const { result } = mount();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.reason).toBeNull();
    expect(result.current.intent).toBeNull();
  });

  it('öffnet ohne Argument — das Starter Pack', () => {
    const { result } = mount();
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.reason).toBeNull();
  });

  /* Die verdeckte Karte, die ein Gast angetippt hat: sie muss den Weg zum
     Konto überleben — das Starter Pack legt sie garantiert offen hinein. */
  it('macht aus der angetippten Karte die Absicht fürs Pack', () => {
    const { result } = mount();
    act(() => result.current.open({ kind: 'card', mustEatId: 'me-9' }));
    expect(result.current.reason).toEqual({ kind: 'card', mustEatId: 'me-9' });
    expect(result.current.intent).toEqual({ starterMustEatId: 'me-9' });
  });

  /* Der zweite Träger neben der Continue-URL: Google meldet im selben
     Dokument an, der Magic-Link nicht. Bis 30.09.2026 musste jeder Auslöser
     die Karte selbst merken, bevor er öffnete — drei Stellen. */
  it('merkt sich die angetippte Karte für die Anmeldung per Google', () => {
    const { result } = mount();
    act(() => result.current.open({ kind: 'card', mustEatId: 'me-7' }));
    expect(takePendingStarterCard()).toBe('me-7');
  });

  it('macht aus dem Herz die Absicht, den Spot zu herzen', () => {
    const { result } = mount();
    act(() => result.current.open({ kind: 'heart', restaurantId: 'sofi', name: 'Sofi' }));
    expect(result.current.intent).toEqual({ heartRestaurantId: 'sofi' });
  });

  /* Der Grund geht mit dem Modal: wer abbricht und später über das
     Burger-Menü hereinkommt, soll nicht den Spot von vorhin geherzt bekommen. */
  it('vergisst Grund und Absicht beim Schliessen', () => {
    const { result } = mount();
    act(() => result.current.open({ kind: 'heart', restaurantId: 'sofi', name: 'Sofi' }));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.reason).toBeNull();
    expect(result.current.intent).toBeNull();
  });

  it('überschreibt einen alten Grund beim erneuten Öffnen ohne neuen', () => {
    const { result } = mount();
    act(() => result.current.open({ kind: 'heart', restaurantId: 'sofi', name: 'Sofi' }));
    act(() => result.current.open());
    expect(result.current.reason).toBeNull();
    expect(result.current.intent).toBeNull();
  });

  it('sagt deutlich, wenn der Provider fehlt', () => {
    expect(() => renderHook(() => useLoginModal())).toThrow(
      /useLoginModal must be used inside <LoginModalProvider>/
    );
  });
});
