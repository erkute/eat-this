'use client';

import { useRouter } from 'next/navigation';
import LoginPanel from '@/app/components/LoginPanel';
import styles from './modal.module.css';

export default function LoginModal() {
  const router = useRouter();
  const dismiss = () => router.back();

  return (
    <div className={styles.overlay} onClick={dismiss}>
      {/* stopPropagation prevents backdrop click from closing when tapping the card itself */}
      <div onClick={(e) => e.stopPropagation()}>
        <LoginPanel onBack={dismiss} />
      </div>
    </div>
  );
}
