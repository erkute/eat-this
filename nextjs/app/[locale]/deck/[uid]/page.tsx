import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { checkRateLimit } from '@/lib/rateLimit';
import { clientIpFromXff } from '@/lib/clientIp';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getPublicDeck } from '@/lib/profile/publicDeck.server';
import styles from '@/app/components/profile/Profile.module.css';
import deck from './Deck.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* Ein Mensch, der ein geteiltes Deck ansieht, braucht eine Handvoll Aufrufe.
   30 pro Minute je IP laesst jedes echte Ansehen durch und deckelt das
   Haemmern einer bekannten URL. */
const DECK_VIEWS_PER_MINUTE = 30;

/**
 * Deckel gegen das Haemmern einer bekannten Deck-URL.
 *
 * Die uid ist mit 28 Zufallszeichen nicht zu raten, aber wer einen geteilten
 * Link hat, kann ihn abrufen, so oft er mag — und jeder Abruf kostet eine
 * Auth-Abfrage plus mehrere Firestore-Lesezugriffe.
 *
 * Die IP kommt aus `x-forwarded-for`: hinter App Hosting sind `remoteIp` und
 * der User-Agent wertlos (die Edge ersetzt beide), der drittletzte Hop des
 * XFF-Headers ist dagegen der echte Aufrufer — dieselbe Ableitung, die der
 * einwilligungsfreie Zaehler benutzt.
 *
 * Fail-OPEN, nicht fail-closed: faellt Firestore aus, faellt auch
 * `getPublicDeck` aus (es liest Entitlements von dort). Ein geschlossenes Tor
 * wuerde also nichts schuetzen, was nicht ohnehin schon kaputt waere, dafuer
 * aber geteilte Links waehrend jeder Stoerung auf 404 schicken.
 */
async function tooManyViews(): Promise<boolean> {
  const h = await headers();
  const ip = clientIpFromXff(h.get('x-forwarded-for'), h.get('x-real-ip'));
  if (!ip) return false;
  return !(await checkRateLimit(`deck:${ip}`, DECK_VIEWS_PER_MINUTE, 60_000));
}

interface PageProps {
  params: Promise<{ locale: string; uid: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, uid } = await params;
  const data = await getPublicDeck(uid);
  const t = await getTranslations({ locale, namespace: 'deck' });
  return {
    title: data?.name ? t('metaTitleNamed', { name: data.name }) : t('metaTitle'),
    /* Ein geteiltes Deck ist die Momentaufnahme eines fremden Kontos — nichts,
       was in einem Index stehen soll. Die uid ist der einzige Weg hierher und
       nicht zu raten; erschlossen werden darf sie trotzdem nicht. */
    robots: 'noindex, nofollow',
  };
}

/**
 * Ein Deck, oeffentlich und verkuerzt — die Seite, die man herumschickt.
 *
 * Sie zeigt Umfang und Verteilung: wie viel von Berlin auf dieser Map liegt
 * und wie weit die Karten je Bezirk aufgedeckt sind. Sie zeigt keine
 * Gerichte, keine Bilder, keine Spot-Namen und keine Notizen — was hier
 * steht, ist in `PublicDeck` aufgezaehlt, und was dort fehlt, verlaesst den
 * Server nicht (siehe publicDeck.server.ts).
 *
 * Die Einladung braucht dafuer keine eigene Mechanik: der Link, den das
 * Profil teilt, traegt `?ref=<uid>`, und die Middleware nimmt den Parameter
 * auf jeder Route entgegen — sie setzt das Cookie und leitet auf die saubere
 * URL um. Wer das Deck ansieht und sich danach anmeldet, ist geworben, ohne
 * dass irgendwer eine Einladung verschickt haette.
 */
export default async function DeckPage({ params }: PageProps) {
  const { locale, uid } = await params;
  setRequestLocale(locale);

  /* Derselbe 404 wie fuer eine kaputte oder unbekannte uid. Die Seite
     unterscheidet die Faelle bewusst nicht — sie soll nicht melden, welche
     Konten es gibt, und jetzt auch nicht, wo ein Deckel greift. */
  if (await tooManyViews()) notFound();

  const data = await getPublicDeck(uid);
  if (!data) notFound();

  const t = await getTranslations('deck');
  const pct = data.spotsTotal > 0 ? Math.round((data.spotsOpen / data.spotsTotal) * 100) : 0;

  return (
    <main className={`homeV2 ${styles.page} ${deck.page}`} data-menu>
      <header className="hv-wrap">
        <div className={styles.bank}>
          <div className={styles.bankCopy}>
            <p className={styles.bankKicker}>
              <span className="hv-mk" aria-hidden="true" />
              {t('kicker')}
            </p>
            <h1 className={styles.bankName}>{data.name ?? t('anonymous')}</h1>
          </div>

          <div className={styles.bankCharacter}>
            {/* Kein Knopf wie im eigenen Profil: hier aendert niemand etwas. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.bankAvatarImg}
              src={`/pics/avatar/${data.avatar}.webp?v=3`}
              alt=""
            />
          </div>

          {/* Dieselbe Tafelzeile wie im eigenen Profil, nur ohne Weg zur Map:
              die gehoert dem Besitzer, nicht dem Besucher. */}
          <div className={styles.city}>
            <span className={styles.cityKicker}>{t('cityKicker')}</span>
            <span className={styles.cityNumbers}>
              <span className={styles.cityOpen}>{data.spotsOpen}</span>
              <span className={styles.cityTotal}>{t('cityCount', { total: data.spotsTotal })}</span>
            </span>
            <span className={styles.cityBar} aria-hidden="true">
              <span className={styles.cityBarFill} style={{ width: `${pct}%` }} />
            </span>
          </div>
        </div>
      </header>

      <section className={`hv-section hv-wrap ${styles.section}`}>
        <div className={`hv-head ${styles.head} ${deck.head}`}>
          <h2 className="hv-title">{t('deckHeading')}</h2>
          {data.total > 0 && (
            <span className={deck.count}>
              <strong>{data.revealed}</strong>
              <span>{t('deckCount', { total: data.total })}</span>
            </span>
          )}
        </div>

        {data.groups.length === 0 ? (
          <p className={styles.emptyLine}>{t('empty')}</p>
        ) : (
          <ul className={deck.groups}>
            {data.groups.map((group) => (
              <li className={deck.group} key={group.district}>
                {/* Balken statt Kartenruecken: verdeckte Karten sehen alle
                    gleich aus, eine Wand aus 24 identischen Ruecken zeigt
                    nichts. Der Stand je Bezirk zeigt es. */}
                <span className={deck.groupHead}>
                  <span className={deck.groupName}>{group.district}</span>
                  <span className={deck.groupCount}>
                    <strong>{group.done}</strong>/{group.total}
                  </span>
                </span>
                <span className={deck.groupBar} aria-hidden="true">
                  <span
                    className={deck.groupBarFill}
                    style={{ width: `${Math.round((group.done / group.total) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Der einzige Weg von hier weiter: die eigene Map. Ohne `?ref` — wer
          schon hier ist, hat das Cookie von der Middleware bekommen. */}
      <section className={`hv-section hv-wrap ${styles.section}`}>
        <div className={styles.invite}>
          <div>
            <h2 className={styles.inviteTitle}>{t('ctaHeading')}</h2>
            <p className={styles.inviteLine}>
              {data.name ? t('ctaLineNamed', { name: data.name }) : t('ctaLine')}
            </p>
          </div>
          <div className={styles.inviteAction}>
            <Link href="/" className={styles.inviteButton}>
              {t('cta')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
