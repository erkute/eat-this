'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import LoginPanel from '@/app/components/LoginPanel';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
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
    const home = locale === routing.defaultLocale ? '/' : `/${locale}`;
    router.replace(home);
  }, [router, locale]);

  return (
    <main className={styles.page}>
      <LoginPanel onBack={handleBack} mustEatGate={mustEatGate} />
    </main>
  );
}
