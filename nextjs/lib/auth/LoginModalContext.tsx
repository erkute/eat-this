'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type LoginModalMode = 'starter' | 'signin';

interface LoginModalValue {
  isOpen: boolean;
  mode: LoginModalMode;
  open: (mode?: LoginModalMode) => void;
  close: () => void;
}

const LoginModalContext = createContext<LoginModalValue | null>(null);

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<LoginModalMode>('starter');
  const open = useCallback((nextMode: LoginModalMode = 'starter') => {
    setMode(nextMode);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, mode, open, close }), [isOpen, mode, open, close]);
  return <LoginModalContext.Provider value={value}>{children}</LoginModalContext.Provider>;
}

export function useLoginModal(): LoginModalValue {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used inside <LoginModalProvider>');
  return ctx;
}
