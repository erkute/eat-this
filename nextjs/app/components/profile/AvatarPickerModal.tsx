'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { AvatarChoice } from '@/lib/firebase/useUserProfile';
import styles from './AvatarPickerModal.module.css';

interface Props {
  current: AvatarChoice;
  onApply: (c: AvatarChoice) => Promise<void> | void;
  onClose: () => void;
}

const CHOICES: AvatarChoice[] = [1, 2, 3];

// Avatar selection lives in its own modal layer (the collector hero only shows
// the chosen character + a "Change" pill). Portal, body-scroll-lock, Escape and
// scrim-click close.
export default function AvatarPickerModal({ current, onApply, onClose }: Props) {
  const t = useTranslations('profile');
  const [selected, setSelected] = useState<AvatarChoice>(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function apply() {
    if (saving) return;
    setSaving(true);
    try {
      await onApply(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.scrim}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={t('avatarModalTitle')}
      >
        <button type="button" className={styles.x} aria-label="Close" onClick={onClose}>
          ×
        </button>
        <div className={styles.head}>
          <h2 className={styles.title}>{t('avatarModalTitle')}</h2>
          <p className={styles.sub}>{t('avatarModalSub')}</p>
        </div>
        <div className={styles.chars} role="radiogroup" aria-label={t('avatarModalTitle')}>
          {CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={selected === c}
              className={`${styles.char} ${selected === c ? styles.charOn : ''}`}
              onClick={() => setSelected(c)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/pics/avatar/${c}.webp?v=3`} alt={t('avatarChoice', { n: c })} />
              <span>{t('avatarChoice', { n: c })}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.apply}
          disabled={saving}
          onClick={() => void apply()}
        >
          {t('avatarApply')}
        </button>
      </div>
    </div>,
    document.body
  );
}
