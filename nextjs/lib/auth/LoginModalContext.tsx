'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { LoginIntent } from './loginContinueUrl';

/**
 * Wonach der Gast gegriffen hat, als der Login dazwischenkam.
 *
 * Das Modal zeigt genau das: die angetippte Karte, den Spot mit dem Herz.
 * Ohne Grund (Burger-Menü, Starter-Pack-Tafel) steht das Starter Pack da.
 *
 * Einen eigenen Einloggen-Modus gibt es nicht mehr. Der Server weiß beim
 * Absenden, ob die Adresse schon ein Konto hat, und schickt entsprechend die
 * Anmelde- oder die Login-Mail (lib/auth/sendMagicLink.ts). Die Frage „neu
 * oder schon dabei?" musste der Gast vorher selbst beantworten — und bekam
 * beim Herz auf einem Spot „Dein Deck wartet", ohne je ein Deck gehabt zu
 * haben.
 */
export type LoginReason =
  | { kind: 'card'; mustEatId: string }
  | {
      kind: 'heart';
      restaurantId: string;
      name: string;
      photo?: string;
    };

interface LoginModalValue {
  isOpen: boolean;
  reason: LoginReason | null;
  /**
   * Die Absicht hinter dem Grund, in der Form, die den Posteingang überlebt:
   * LoginPanel hängt sie an die Continue-URL des Magic-Links.
   */
  intent: LoginIntent | null;
  open: (reason?: LoginReason) => void;
  close: () => void;
}

const LoginModalContext = createContext<LoginModalValue | null>(null);

function intentFor(reason: LoginReason | null): LoginIntent | null {
  if (reason?.kind === 'card') return { starterMustEatId: reason.mustEatId };
  if (reason?.kind === 'heart') return { heartRestaurantId: reason.restaurantId };
  return null;
}

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<LoginReason | null>(null);
  const open = useCallback((nextReason?: LoginReason) => {
    setReason(nextReason ?? null);
    setIsOpen(true);
  }, []);
  /* Der Grund geht mit dem Modal: wer abbricht und spaeter ueber das
     Burger-Menue hereinkommt, soll nicht den Spot von vorhin geherzt bekommen. */
  const close = useCallback(() => {
    setIsOpen(false);
    setReason(null);
  }, []);
  const value = useMemo(
    () => ({ isOpen, reason, intent: intentFor(reason), open, close }),
    [isOpen, reason, open, close]
  );
  return <LoginModalContext.Provider value={value}>{children}</LoginModalContext.Provider>;
}

export function useLoginModal(): LoginModalValue {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used inside <LoginModalProvider>');
  return ctx;
}
