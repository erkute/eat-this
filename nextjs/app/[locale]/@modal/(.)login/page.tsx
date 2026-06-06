'use client';

import { useRouter } from 'next/navigation';
import LoginPanel from '@/app/components/LoginPanel';
import LoginModalBarLock from '@/app/components/LoginModalBarLock';
import styles from './modal.module.css';

export default function LoginModal() {
  const router = useRouter();
  const dismiss = () => router.back();

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <LoginModalBarLock />
      <LoginPanel onBack={dismiss} modal />
    </div>
  );
}
