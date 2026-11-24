'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLoginModal } from '@/lib/auth';
import { trackEvent } from '@/lib/analytics';
import { useDialogFocus } from '@/lib/useDialogFocus';
import LoginBoard, { LoginSceneArt } from './LoginBoard';
import styles from './LoginPanel.module.css';

interface LoginPanelProps {
  onBack: () => void;
}

/**
 * Das Anmelde-Modal: LoginBoard in einem Rahmen mit Kreuz, ueber der Seite,
 * auf der die Anmeldung angefangen hat.
 *
 * Das Bild zeigt immer das Starter Pack. Anlass und Login-Intent bleiben
 * für Texte und die Aktion nach der Anmeldung erhalten.
 */
export default function LoginPanel({ onBack }: LoginPanelProps) {
  const t = useTranslations('modals.login');
  const { reason, intent } = useLoginModal();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  useDialogFocus(true, panelRef, triggerRef);

  const sceneKind = reason?.kind ?? 'pack';
  useEffect(() => {
    /* Der Anlass als Zaehler-Qualifier: login_view_pack / _card / _heart
       (lib/analytics.ts). */
    trackEvent('login_view', { surface: 'modal', context: sceneKind });
  }, [sceneKind]);

  let title = t('packTitle');
  let lead = t('packLead');
  if (reason?.kind === 'card') {
    title = t('cardTitle');
    lead = t('cardLead');
  } else if (reason?.kind === 'heart') {
    title = t('heartTitle');
    lead = t('heartLead');
  }

  return (
    <div
      ref={panelRef}
      className={styles.frame}
      data-red-sheet=""
      data-login-panel=""
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onBack();
      }}
    >
      <button type="button" className={styles.close} onClick={onBack} aria-label={t('backBtn')}>
        <span aria-hidden="true">×</span>
      </button>

      <div className={styles.content}>
        <span className={styles.srOnly}>{t('heroHeadline')}</span>
        <LoginBoard
          art={<LoginSceneArt />}
          title={title}
          lead={lead}
          intent={intent}
          googleWarmup={reason?.kind === 'map-prompt' ? 'intent' : 'mount'}
        />
      </div>
    </div>
  );
}
