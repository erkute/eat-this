'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { AvatarChoice } from '@/lib/firebase/useUserProfile';
import { useDialogFocus } from '@/lib/useDialogFocus';
import styles from '../Tour.module.css';
import own from './AvatarPickerModal.module.css';

interface Props {
  current: AvatarChoice;
  onApply: (c: AvatarChoice) => Promise<void> | void;
  onClose: () => void;
}

const CHOICES: AvatarChoice[] = [1, 2, 3];

/**
 * Charakter wechseln — ein Tipp auf die Spielerkarte im Profil.
 *
 * Seit dem 24.09.2026 in der Huelle der Einfuehrungs-Layer (Tour.module.css),
 * nicht mehr als eigenes weisses Modal (Nutzer: „waehle deinen Charakter muss
 * in meinem Layout-Design"). Es ist derselbe Schritt wie „Wer bist du?" in der
 * Tour nach der Anmeldung (SignInReward): dieselben drei Figuren auf Ink,
 * dieselbe gelbe Kante fuer die Wahl, derselbe gelbe Knopf — aber kompakt,
 * so hoch wie der Inhalt, mit einem X statt „Schliessen" (Nutzer: „zu gross
 * und X, nicht Schliessen").
 */
export default function AvatarPickerModal({ current, onApply, onClose }: Props) {
  const t = useTranslations('profile');
  const [selected, setSelected] = useState<AvatarChoice>(current);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useDialogFocus(true, panelRef, triggerRef);

  /* Wie in der Tour: der Fokus liegt auf der Ueberschrift, damit Vorleser den
     Layer ansagen — nicht auf „Schliessen", das sonst mit Fokusring oben in
     der Ecke leuchtet. */
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
      className={styles.layer}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`${styles.panel} ${own.picker}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('avatarModalTitle')}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <header className={styles.header}>
          <span>{t('avatarModalTitle')}</span>
          <button
            type="button"
            className={own.close}
            aria-label={t('avatarModalClose')}
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M3 3l12 12M15 3L3 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className={own.intro}>
          <p className={styles.kicker}>{t('avatarModalKicker')}</p>
          <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>
            {t('avatarModalHeadline')}
          </h2>
        </div>
        <div className={own.choices}>
          <div className={styles.avatars} role="radiogroup" aria-label={t('avatarModalTitle')}>
            {CHOICES.map((c) => {
              const checked = selected === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className={checked ? `${styles.avatar} ${styles.avatarActive}` : styles.avatar}
                  onClick={() => setSelected(c)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.avatarImg} src={`/pics/avatar/${c}.webp?v=4`} alt="" />
                  <span className={styles.avatarName}>{t(`avatarChoice${c}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={`${styles.actions} ${own.actions}`}>
          <button
            type="button"
            className={styles.action}
            disabled={saving}
            onClick={() => void apply()}
          >
            {t('avatarApply')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
