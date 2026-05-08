'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface LoginModalValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const LoginModalContext = createContext<LoginModalValue | null>(null);

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  return <LoginModalContext.Provider value={value}>{children}</LoginModalContext.Provider>;
}

export function useLoginModal(): LoginModalValue {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used inside <LoginModalProvider>');
  return ctx;
}
