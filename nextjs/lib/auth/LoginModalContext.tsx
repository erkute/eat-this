'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { LoginIntent } from './loginContinueUrl';

type LoginModalMode = 'starter' | 'signin';

interface LoginModalValue {
  isOpen: boolean;
  mode: LoginModalMode;
  /**
   * Was der Leser eigentlich wollte, als der Login dazwischenkam. Das Modal
   * selbst tut damit nichts — LoginPanel haengt es an die Continue-URL des
   * Magic-Links, damit die Absicht den Posteingang ueberlebt.
   */
  intent: LoginIntent | null;
  open: (mode?: LoginModalMode, intent?: LoginIntent) => void;
  close: () => void;
}

const LoginModalContext = createContext<LoginModalValue | null>(null);

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<LoginModalMode>('starter');
  const [intent, setIntent] = useState<LoginIntent | null>(null);
  const open = useCallback((nextMode: LoginModalMode = 'starter', nextIntent?: LoginIntent) => {
    setMode(nextMode);
    setIntent(nextIntent ?? null);
    setIsOpen(true);
  }, []);
  /* Die Absicht geht mit dem Modal: wer abbricht und spaeter ueber das
     Burger-Menue hereinkommt, soll nicht den Spot von vorhin geherzt bekommen. */
  const close = useCallback(() => {
    setIsOpen(false);
    setIntent(null);
  }, []);
  const value = useMemo(
    () => ({ isOpen, mode, intent, open, close }),
    [isOpen, mode, intent, open, close]
  );
  return <LoginModalContext.Provider value={value}>{children}</LoginModalContext.Provider>;
}

export function useLoginModal(): LoginModalValue {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used inside <LoginModalProvider>');
  return ctx;
}
