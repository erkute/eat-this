'use client';

import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import LoginPanel from '@/app/components/LoginPanel';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  return (
    <main className={styles.page} data-menu>
      <LoginPanel onBack={handleBack} />
    </main>
  );
}
