declare global {
  interface Window {
    openLoginModal?: () => void;
    closeLoginModal?: () => void;
  }
}

export function openLoginModal(): void {
  if (typeof window !== 'undefined') window.openLoginModal?.();
}

export function closeLoginModal(): void {
  if (typeof window !== 'undefined') window.closeLoginModal?.();
}
