'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useFavorites } from '@/lib/map/useFavorites';
import { normalizeName } from '@/lib/normalizeName';
import styles from './ProfileSlim.module.css';

// Saved spots (Firestore favorites) as full-image cards → tap opens the map.
// Each card carries a remove button so spots can be un-saved here too (not
// only via the heart toggle on the map / restaurant page).
export default function ProfileSpots({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const { favorites, loading, toggle, updateNote } = useFavorites(uid);

  if (loading) return null;

  if (favorites.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyLine}>
          {t('emptySpots')}
        </p>
        <Link href="/map" className={styles.emptyCta}>{t('toMap')}</Link>
      </div>
    );
  }

  return (
    <div className={styles.spotsCards}>
      {favorites.map((f) => (
        <div key={f.restaurantId} className={styles.spotCardWrap}>
          <Link
            href={f.slug ? `/map?r=${encodeURIComponent(f.slug)}` : '/map'}
            className={styles.spotCard}
            rel="nofollow"
          >
            {f.photo && (
              <div className={styles.spotImg} style={{ backgroundImage: `url(${f.photo})` }} />
            )}
            <div className={styles.spotBody}>
              <h3 className={styles.spotName}>{normalizeName(f.name)}</h3>
              {f.district && <div className={styles.spotMeta}>{f.district}</div>}
            </div>
          </Link>
          <button
            type="button"
            className={styles.spotRemove}
            aria-label={t('removeSaved', { name: normalizeName(f.name) })}
            onClick={() => void toggle({ _id: f.restaurantId, name: f.name, slug: f.slug, photo: f.photo, district: f.district })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
          <SpotNote
            initialNote={f.note ?? ''}
            label={t('spotNoteLabel')}
            placeholder={t('spotNotePlaceholder')}
            saveError={t('spotNoteError')}
            onSave={(note) => updateNote(f.restaurantId, note)}
          />
        </div>
      ))}
    </div>
  );
}

function SpotNote({
  initialNote,
  label,
  placeholder,
  saveError,
  onSave,
}: {
  initialNote: string;
  label: string;
  placeholder: string;
  saveError: string;
  onSave: (note: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialNote);
  const [lastSaved, setLastSaved] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialNote);
    setLastSaved(initialNote);
  }, [initialNote]);

  async function save() {
    const next = value.trim();
    if (next === lastSaved || saving) return;
    setSaving(true);
    try {
      await onSave(next);
      setValue(next);
      setLastSaved(next);
    } catch {
      window.showNotification?.(saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className={styles.spotNote}>
      <span>{label}</span>
      <textarea
        value={value}
        rows={2}
        maxLength={180}
        placeholder={placeholder}
        onChange={(e) => setValue(e.currentTarget.value)}
        onBlur={() => void save()}
      />
    </label>
  );
}
