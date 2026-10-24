import type { ReactNode } from 'react';
import SiteFooter from './SiteFooter';
import styles from './InfoPage.module.css';

/** Shared reading layout for contact and legal information. */
export default function InfoPage({
  slug,
  title,
  contact,
  children,
}: {
  slug: string;
  title: string;
  contact?: ReactNode;
  children: ReactNode;
}) {
  const id = `staticPage${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  return (
    <main className={styles.page} data-page={slug} id={id}>
      <div className={styles.inner}>
        <h1 className={styles.title} id={`${id}-title`}>{title}</h1>
        {contact && <div className={styles.contact}>{contact}</div>}
        <div className={styles.body} id={`${id}-body`}>{children}</div>
      </div>
      <SiteFooter />
    </main>
  );
}
