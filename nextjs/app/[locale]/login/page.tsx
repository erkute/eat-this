'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import LoginPanel from '@/app/components/LoginPanel';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  // ?ctx=musteat — arrived from an in-range must-eat reveal as a guest. Read
  // after mount (not useSearchParams) so SSG markup stays identical and the
  // sub line swaps in on hydration.
  const [mustEatGate, setMustEatGate] = useState(false);
  useEffect(() => {
    setMustEatGate(new URLSearchParams(window.location.search).get('ctx') === 'musteat');
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  return (
    <main className={styles.page} data-menu>
      <LoginPanel onBack={handleBack} mustEatGate={mustEatGate} />
    </main>
  );
}
