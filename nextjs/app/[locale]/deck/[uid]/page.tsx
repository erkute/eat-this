import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { checkRateLimit } from '@/lib/rateLimit';
import { clientIpFromXff } from '@/lib/clientIp';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getPublicDeck } from '@/lib/profile/publicDeck.server';
import styles from '@/app/components/profile/Profile.module.css';
import ProfilePlayerCard from '@/app/components/profile/ProfilePlayerCard';
import deck from './Deck.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';

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

  return (
    <main className={`homeV2 ${styles.page} ${deck.page}`} data-menu>
      {/* Derselbe Kopf wie im eigenen Profil: Spielerkarte neben der
          Ueberschrift. Hier stand bis zum 04.09.2026 eine Ink-Tafel aus
          `.bank*` und `.city*` — die Klassen sind mit dem Profil-Umbau am
          selben Tag aus Profile.module.css verschwunden, und React rendert
          fuer ein unbekanntes CSS-Modul-Kuerzel stumm gar kein
          class-Attribut. Die Seite, auf der jeder geteilte Link landet, lief
          seitdem ohne einen einzigen ihrer Stile: die Figur 250 px hoch und
          rahmenlos, „Berlin467von 467 Spots" in einer Zeile. */}
      <section className={`hv-section hv-wrap ${styles.section} ${styles.firstSection}`}>
        <div className={deck.masthead}>
          <ProfilePlayerCard
            name={data.name ?? t('anonymous')}
            avatarIdx={data.avatar}
            done={data.revealed}
            total={data.total}
          />

          {/* Kein `hv-head`: das Vokabular stellt Titel und Zaehler auf die
              beiden Enden einer Zeile, und hier stuende die Ueberschrift damit
              am rechten Bildrand, der Kicker 1000 px daneben. */}
          <div className={deck.headCopy}>
            {/* Der Name gehoert in die Ueberschrift, nicht „Ein Deck bei Eat
                This" (Nutzer, 04.09.2026: „da muss halt der Name stehen,
                Ersans Deck bei Eat This"). Wer einen geteilten Link oeffnet,
                will zuerst wissen, WESSEN Deck er ansieht — die Marke sagt
                die Zeile darunter, und das Logo steht ohnehin oben. */}
            <h1 className="hv-title">
              {data.name ? t('deckHeadingNamed', { name: data.name }) : t('deckHeading')}
            </h1>
            {/* Wie das Spiel geht, in einem Satz. „Aufgedeckt wird vor Ort"
                stand bisher nur im Werbeblock ganz unten und sagte nicht,
                WAS man tut (Nutzer, 04.09.2026: „das ist nicht so richtig
                ersichtlich"). Hier steht der Handgriff: hingehen, antippen,
                umdrehen — dieselben Worte, die die Karte auf der Map selbst
                benutzt („Jetzt aufdecken. Tipp auf die Karte."). */}
            <p className={deck.howTo}>{t('howTo')}</p>
          </div>
        </div>

        {data.slots.length === 0 ? (
          <p className={styles.emptyLine}>{t('empty')}</p>
        ) : (
          <>
            {/* Die Karten selbst, nicht ihr Zahlenschatten (Nutzer,
                04.09.2026: „wenn man sein Deck zeigt, dann muss man die
                Karten zeigen"). Hier standen bis dahin nur Balken je Bezirk,
                in der Annahme, eine Wand gleicher Ruecken zeige nichts — sie
                zeigte dafuer gar keine Karte.

                Drei Zustaende, dieselbe Sprache wie im eigenen Album: eine
                Karte, die ohnehin jeder Anonyme sehen darf, liegt offen da;
                jede andere aufgedeckte liegt als Rueckseite AUF dem Album;
                ein fehlender Platz liegt eingelassen DARIN, mit seiner
                Nummer. Der Unterschied ist auf einen Blick zu sehen, und
                nichts Bezahltes verlaesst dabei den Server. */}
            <ul className={deck.cards}>
              {data.slots.map((slot, i) => (
                <li
                  className={[
                    deck.slot,
                    slot.collected ? deck.slotOpen : deck.slotEmpty,
                    slot.collected && !slot.image ? deck.slotBack : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={slot.no ?? `slot-${i}`}
                >
                  {slot.image ? (
                    /* Nur der oeffentliche Satz — die Route liefert genau
                       diese Bilder ohne Cookie aus. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.image} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={CARD_BACK} alt="" loading="lazy" decoding="async" />
                      {!slot.collected && slot.no && (
                        <span className={deck.slotNo} aria-hidden="true">
                          {slot.no}
                        </span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>

            <ul className={deck.groups}>
              {data.groups.map((group) => (
                <li className={deck.group} key={group.district}>
                  {/* Wo noch etwas fehlt — die Karten oben sagen wie viel,
                      die Bezirke sagen wo. */}
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
          </>
        )}
      </section>

      {/* Der einzige Weg von hier weiter: die eigene Map. Ohne `?ref` — wer
          schon hier ist, hat das Cookie von der Middleware bekommen. */}
      <section className={`hv-section hv-wrap ${styles.section}`}>
        <div className={styles.invite}>
          <div className={styles.inviteCopy}>
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
