'use client';

import { useLoginModal } from '@/lib/auth';

/** Abschluss der Must-Eats-Seite für Gäste: öffnet das Anmelde-Fenster ohne
 *  Grund, also im Starter-Modus — wie „Anmelden“ auf der letzten Folie der
 *  Erklärung. Die Server-Seite kann keinen Klick-Handler tragen, daher diese
 *  Insel. */
export default function MustEatsStarterButton({ label }: { label: string }) {
  const { open } = useLoginModal();
  return (
    <button type="button" className="et-btn" onClick={() => open()}>
      {label}
    </button>
  );
}
