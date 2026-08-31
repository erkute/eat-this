'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import MapIntentLink from '@/app/components/MapIntentLink';
import { useFavorites } from '@/lib/map/useFavorites';
import { normalizeName } from '@/lib/normalizeName';
import styles from './Profile.module.css';

// Saved spots (Firestore favorites) as full-image cards → tap opens the map.
// Each card carries a remove button so spots can be un-saved here too (not
// only via the heart toggle on the map / restaurant page).
export default function ProfileSpots({
  uid,
  restaurantSlugs,
}: {
  uid: string;
  restaurantSlugs: ReadonlyMap<string, string>;
}) {
  const t = useTranslations('profile');
  const { favorites, loading, toggle, updateNote } = useFavorites(uid);

  if (loading) return null;

  if (favorites.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyLine}>{t('emptySpots')}</p>
        <Link href="/map" className={`hv-btn ${styles.emptyCta}`}>
          {t('toMap')}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.spotsCards}>
      {favorites.map((f) => {
        const slug = restaurantSlugs.get(f.restaurantId) ?? f.slug;
        return (
          <div key={f.restaurantId} className={styles.spotCardWrap}>
            <MapIntentLink
              href={slug ? `/map?r=${encodeURIComponent(slug)}` : '/map'}
              className={`hv-photo ${styles.spotCard}`}
              rel="nofollow"
            >
              {f.photo && (
                <div className={styles.spotImg} style={{ backgroundImage: `url(${f.photo})` }} />
              )}
              <div className={styles.spotBody}>
                <h3 className={styles.spotName}>{normalizeName(f.name)}</h3>
                {f.district && <div className={styles.spotMeta}>{f.district}</div>}
              </div>
            </MapIntentLink>
            <button
              type="button"
              className={styles.spotRemove}
              aria-label={t('removeSaved', { name: normalizeName(f.name) })}
              onClick={() =>
                void toggle({
                  _id: f.restaurantId,
                  name: f.name,
                  slug: f.slug,
                  photo: f.photo,
                  district: f.district,
                })
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
            <SpotNote
              initialNote={f.note ?? ''}
              label={t('spotNoteLabel', { name: normalizeName(f.name) })}
              placeholder={t('spotNotePlaceholder')}
              saveError={t('spotNoteError')}
              onSave={(note) => updateNote(f.restaurantId, note)}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Die Notiz ist das Persoenlichste auf dieser Seite — und war das Einzige,
 * das nicht ganz zu sehen war. Das Feld nahm 180 Zeichen an und zeigte zwei
 * Zeilen (`rows={value ? 2 : 1}`): eine volle Notiz brach mitten im Satz ab,
 * ohne Auslassung, ohne Scrollbalken, ohne irgendein Zeichen, dass da noch
 * etwas steht. Wer den Rest lesen wollte, musste ins Feld klicken und
 * blaettern.
 *
 * Jetzt waechst das Feld mit seinem Inhalt. Es bleibt ein <textarea>, damit
 * das Schreiben ohne Moduswechsel geht — der Zeilenumbruch ist der einzige
 * Unterschied zu vorher, und er ist der ganze Punkt.
 */
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
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialNote);
    setLastSaved(initialNote);
  }, [initialNote]);

  /* Auf die eigene Hoehe wachsen: erst zurueck auf `auto`, sonst kennt
     scrollHeight nur den bisherigen Stand und das Feld schrumpft beim
     Loeschen nie wieder. Vor dem Zeichnen, damit eine lange Notiz nicht
     erst zweizeilig erscheint und dann aufspringt — die Notizen haengen an
     Firestore und rendern ohnehin nie auf dem Server. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

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
    <textarea
      ref={ref}
      className={styles.spotNote}
      value={value}
      aria-label={label}
      rows={1}
      maxLength={180}
      placeholder={placeholder}
      onChange={(e) => setValue(e.currentTarget.value)}
      onBlur={() => void save()}
    />
  );
}
