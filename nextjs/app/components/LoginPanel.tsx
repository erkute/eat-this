'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth, useLoginModal } from '@/lib/auth';
import { trackEvent } from '@/lib/analytics';
import LoginBoard, { LoginSceneArt } from './LoginBoard';
import styles from './LoginPanel.module.css';

interface LoginPanelProps {
  onBack: () => void;
}

/**
 * Das Anmelde-Modal: LoginBoard in einem Rahmen mit Kreuz, ueber der Seite,
 * auf der die Anmeldung angefangen hat.
 *
 * Die Szene folgt dem Grund, mit dem das Modal geoeffnet wurde (siehe
 * LoginReason): die angetippte Karte vor dem Pack, der Spot mit dem Herz vor
 * dem Pack — ohne Anlass das Starter Pack allein.
 */
export default function LoginPanel({ onBack }: LoginPanelProps) {
  const t = useTranslations('modals.login');
  const { user, loading } = useAuth();
  const { reason, intent } = useLoginModal();

  const sceneKind = reason?.kind ?? 'pack';
  useEffect(() => {
    /* Der Anlass als Zaehler-Qualifier: login_view_pack / _card / _heart
       (lib/analytics.ts). */
    trackEvent('login_view', { surface: 'modal', context: sceneKind });
  }, [sceneKind]);

  /* Der Kicker sagt, wozu der Griff da war — „Decke deine Must Eats auf",
     „Speichere deine Spots". Den Bezirk dort wollte der Betreiber nicht
     (24.09.2026). */
  let kicker = t('packKicker');
  let title = t('packTitle');
  let lead = t('packLead');
  if (reason?.kind === 'card') {
    kicker = t('cardKicker');
    title = t('cardTitle');
    lead = t('cardLead');
  } else if (reason?.kind === 'heart') {
    kicker = t('heartKicker');
    title = t('heartTitle');
    lead = t('heartLead');
  }

  return (
    <div className={styles.frame}>
      <button type="button" className={styles.close} onClick={onBack} aria-label={t('backBtn')}>
        <span aria-hidden="true">×</span>
      </button>

      <span className={styles.srOnly}>{t('heroHeadline')}</span>

      <LoginBoard
        art={<LoginSceneArt reason={reason} />}
        kicker={kicker}
        title={title}
        lead={lead}
        intent={intent}
        googleWarmup="mount"
        /* Ein Login, der waehrend des offenen Modals durchgeht, haelt den
           Wartescreen, bis BridgeAuth das Modal nach der Haltezeit schliesst. */
        holdScreen={!loading && Boolean(user)}
      />
    </div>
  );
}
