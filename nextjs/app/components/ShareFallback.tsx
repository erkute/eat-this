'use client';
import { useLocale } from 'next-intl';
import styles from './ShareFallback.module.css';

export default function ShareFallback({ url }: { url: string | null }) {
  const de = useLocale() === 'de';
  if (!url) return null;
  return <span className={styles.fallback}>
    <span role="alert">{de ? 'Kopieren nicht möglich. Kopiere den Link aus diesem Feld:' : 'Could not copy. Copy the link from this field:'}</span>
    <input aria-label={de ? 'Link zum Kopieren' : 'Link to copy'} readOnly value={url} onFocus={event => event.currentTarget.select()} />
  </span>;
}
