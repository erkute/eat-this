'use client';

import { useRef, useState } from 'react';
import { useFavorites, type FavoriteEntry } from '@/lib/map/useFavorites';
import { Link } from '@/i18n/navigation';
import styles from './ProfileRestaurants.module.css';

interface Props {
  uid: string;
}

export default function ProfileRestaurants({ uid }: Props) {
  const { favorites, loading, toggle, updateNote } = useFavorites(uid);

  if (loading) {
    return (
      <div className={styles.placeholder}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }
  if (favorites.length === 0) {
    return (
      <p className={styles.empty}>
        Du hast noch keine Restaurants gespeichert. Tippe auf das Herz an einer Map-Karte.
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {favorites.map((f) => (
        <RestaurantRow
          key={f.restaurantId}
          uid={uid}
          entry={f}
          onRemove={() => toggle({ _id: f.restaurantId, name: f.name, photo: f.photo, district: f.district })}
          onSaveNote={(note) => updateNote(f.restaurantId, note)}
        />
      ))}
    </ul>
  );
}

interface RowProps {
  uid: string;
  entry: FavoriteEntry;
  onRemove: () => void;
  onSaveNote: (note: string) => void;
}

function RestaurantRow({ entry: f, onRemove, onSaveNote }: RowProps) {
  const [noteOpen, setNoteOpen] = useState(!!f.note);
  const [noteValue, setNoteValue] = useState(f.note ?? '');
  const savedNote = useRef(f.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleNoteBlur() {
    const trimmed = noteValue.trim();
    if (trimmed !== savedNote.current) {
      savedNote.current = trimmed;
      onSaveNote(trimmed);
    }
  }

  return (
    <li className={styles.row}>
      <div className={styles.main}>
        {f.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.photo} alt="" className={styles.thumb} loading="lazy" />
        ) : (
          <div className={styles.thumbPlaceholder} aria-hidden="true">🍽</div>
        )}

        <div className={styles.info}>
          <span className={styles.name}>{f.name}</span>
          {f.district && <span className={styles.district}>{f.district}</span>}
        </div>

        <div className={styles.actions}>
          <Link
            href={f.slug ? `/map?r=${encodeURIComponent(f.slug)}` : '/map'}
            className={styles.mapBtn}
            aria-label={`${f.name} auf der Karte zeigen`}
            title="Auf der Karte zeigen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          </Link>

          <button
            type="button"
            className={`${styles.noteToggle}${noteOpen ? ` ${styles.noteToggleActive}` : ''}`}
            onClick={() => setNoteOpen((v) => !v)}
            aria-label="Notiz hinzufügen"
            title="Notiz"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          <button
            type="button"
            className={styles.removeBtn}
            aria-label={`${f.name} entfernen`}
            onClick={() => setConfirmDelete(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className={styles.confirmRow}>
          <span className={styles.confirmText}>Wirklich löschen?</span>
          <button type="button" className={styles.confirmYes} onClick={onRemove}>Ja</button>
          <button type="button" className={styles.confirmNo} onClick={() => setConfirmDelete(false)}>Nein</button>
        </div>
      )}

      {noteOpen && (
        <textarea
          className={styles.noteArea}
          value={noteValue}
          placeholder="Notiz…"
          rows={2}
          onChange={(e) => setNoteValue(e.target.value)}
          onBlur={handleNoteBlur}
        />
      )}
    </li>
  );
}
