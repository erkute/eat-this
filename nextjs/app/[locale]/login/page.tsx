'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import LoginPanel from '@/app/components/LoginPanel';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();

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
      <LoginPanel onBack={handleBack} />
    </main>
  );
}
