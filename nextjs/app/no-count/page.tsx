import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { NO_COUNT_COOKIE } from '@/lib/analytics/noCount';
import { setCounting } from './actions';
import { toolLocale } from './locale';
import styles from './page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await toolLocale()) === 'en' ? 'Exclude this browser' : 'Nicht mitzählen',
    robots: { index: false, follow: false },
  };
}

/** Deliberately outside [locale]: opening the opt-out must not itself count
 * a visit, load GA, or ask for analytics consent. Root layout is a pass-through. */
export default async function NoCountPage({
  searchParams,
}: {
  searchParams: Promise<{ choice?: string }>;
}) {
  const locale = await toolLocale();
  const en = locale === 'en';
  const off = (await cookies()).get(NO_COUNT_COOKIE)?.value === '1';
  const { choice } = await searchParams;
  const failed = (choice === 'exclude' && !off) || (choice === 'include' && off);

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p><span className="et-label-title">EAT THIS</span></p>
        <h1>{en ? 'Exclude this browser' : 'Nicht mitzählen'}</h1>
        <p>
          {en
            ? 'Exclude your visits from our statistics. This choice applies to this browser and is saved in a cookie for one year. No login needed.'
            : 'Nimm deine Besuche aus unserer Statistik. Die Wahl gilt für diesen Browser und wird ein Jahr lang in einem Cookie gespeichert. Ohne Anmeldung.'}
        </p>
        <p role="status">
          {off
            ? en ? 'This browser is excluded from the statistics.' : 'Dieser Browser wird nicht mitgezählt.'
            : en ? 'This browser has not been excluded.' : 'Dieser Browser ist noch nicht ausgeschlossen.'}
        </p>
        {off && <p className={styles.cookie}><code>eatthis_nocount=1</code></p>}
        {failed && (
          <p role="alert">
            {en
              ? 'Your browser did not save the choice. Allow cookies for this site and try again.'
              : 'Dein Browser hat die Wahl nicht gespeichert. Erlaube Cookies für diese Seite und versuche es erneut.'}
          </p>
        )}
        <form action={setCounting}>
          <input type="hidden" name="locale" value={locale} />
          <button className="et-btn" name="choice" value={off ? 'include' : 'exclude'}>
            {off ? en ? 'Count me again' : 'Wieder mitzählen' : en ? 'Exclude this browser' : 'Nicht mitzählen'}
          </button>
        </form>
        <p>{en ? 'This settings page itself is not counted.' : 'Diese Einstellungsseite selbst wird nicht mitgezählt.'}</p>
        <NextIntlClientProvider locale={locale} messages={{}} timeZone="Europe/Berlin">
          <nav className={styles.links} aria-label={en ? 'More' : 'Weitere Links'}>
            <Link className="et-btn et-btn-alt et-btn-sm" href="/" locale={en ? 'en' : undefined} prefetch={false}>{en ? 'Home' : 'Zur Startseite'}</Link>
            <Link className="et-btn et-btn-alt et-btn-sm" href="/no-count" locale={en ? 'de' : 'en'} prefetch={false} target="_top">{en ? 'Deutsch' : 'English'}</Link>
          </nav>
        </NextIntlClientProvider>
      </div>
    </main>
  );
}
