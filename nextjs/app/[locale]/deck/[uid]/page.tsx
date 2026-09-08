import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { checkRateLimit } from '@/lib/rateLimit';
import { clientIpFromXff } from '@/lib/clientIp';
import { rateLimitKey } from '@/lib/rateLimitKey';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPublicDeck } from '@/lib/profile/publicDeck.server';
import { SITE_URL } from '@/lib/constants';
import { toOgLocale } from '@/lib/seo/metadata';
import styles from '@/app/components/profile/Profile.module.css';
import ProfilePlayerCard from '@/app/components/profile/ProfilePlayerCard';
import DeckJoin from './DeckJoin';
import deck from './Deck.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';
const CARD_FRONT = '/pics/card-front.webp?v=3';

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
 * Sie geht gehasht in den Schluessel, nicht roh: der Schluessel ist die
 * Dokument-ID in `_rateLimits`, und eine rohe IP hat dort nichts verloren
 * (siehe `rateLimitKey`).
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
  return !(await checkRateLimit(rateLimitKey('deck', ip), DECK_VIEWS_PER_MINUTE, 60_000));
}

interface PageProps {
  params: Promise<{ locale: string; uid: string }>;
}

/**
 * Die Herkunft, auf der diese Anfrage tatsaechlich gelandet ist.
 *
 * Alle anderen Seiten bauen ihre OG-Bild-URL aus `SITE_URL` — richtig fuer
 * gecachte Seiten, die einen kanonischen Host haben sollen. Diese hier nicht:
 * sie ist `force-dynamic`, gehoert einem Konto, und auf Staging liegt dieses
 * Konto in einem ANDEREN Firebase-Projekt. Eine Bild-URL auf die Live-Domain
 * wuerde dort auf eine uid zeigen, die es dort nicht gibt — 404, und die
 * Vorschau bleibt leer, genau da, wo man sie prueft.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return SITE_URL;
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * Was ein geteilter Link in WhatsApp, iMessage oder Signal hermacht.
 *
 * Bis zum 06.09.2026 stand hier ein Titel und sonst nichts: kein Bild, keine
 * Beschreibung. Der Link, der der einzige Kanal ohne Werbebudget ist, sah in
 * jedem Chat aus wie ein Versehen (Nutzer: „der Link, den man weitergibt, ist
 * haesslich, ohne Bild").
 *
 * `noindex, nofollow` bleibt und widerspricht dem nicht: Suchmaschinen sollen
 * die Seite nicht in den Index nehmen, die Vorschau-Abrufer der Messenger
 * lesen die OG-Tags trotzdem — sie halten sich an keine Robots-Regel und
 * sollen es hier auch nicht.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, uid } = await params;
  const data = await getPublicDeck(uid);
  const t = await getTranslations({ locale, namespace: 'deck' });

  const title = data?.name ? t('metaTitleNamed', { name: data.name }) : t('metaTitle');
  /* Ohne Deck keine Karte: die Seite antwortet gleich mit 404, und ein
     OG-Bild fuer eine uid, die es nicht gibt, waere ein zweiter 404 im
     Vorschau-Abruf. */
  if (!data) return { title, robots: 'noindex, nofollow' };

  const description = data.name
    ? t('metaDescriptionNamed', { name: data.name, done: data.revealed, total: data.total })
    : t('metaDescription', { done: data.revealed, total: data.total });
  const image = `${await requestOrigin()}/api/og/deck?uid=${encodeURIComponent(uid)}&locale=${locale === 'en' ? 'en' : 'de'}`;

  return {
    title,
    description,
    /* Ein geteiltes Deck ist die Momentaufnahme eines fremden Kontos — nichts,
       was in einem Index stehen soll. Die uid ist der einzige Weg hierher und
       nicht zu raten; erschlossen werden darf sie trotzdem nicht. */
    robots: 'noindex, nofollow',
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: 'website',
      locale: toOgLocale(locale === 'en' ? 'en' : 'de'),
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
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
 * DIE ERKLAERUNG STEHT ZWEIMAL, und das ist der Punkt (06.09.2026):
 *
 *   1. Das Deck. Ueberschrift, EIN Satz, was Eat This ist, der Stand des
 *      Besitzers — dann sofort die Karten. Wer den Link bekommt, will
 *      zuerst sehen, was ihm geschickt wurde.
 *   2. Was Eat This ist, ausfuehrlich: Kartenpaar und die drei Schritte.
 *   3. Mach mit. Die Anmeldung steht auf der Seite, nicht hinter einem Knopf,
 *      der woandershin fuehrt.
 *
 * Zwei Anlaeufe waren falsch, und zwar in beide Richtungen: die Erklaerung
 * ganz unten wurde nie gelesen, die ganze Erklaerung ganz oben schob das Deck
 * aus dem ersten Bildschirm. Nutzer: „was ist Eat This muss unter dem Deck,
 * oder etwas ueber und etwas unter dem Deck an Infos."
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

  const steps = [
    { kicker: t('step1Kicker'), title: t('step1Title'), body: t('step1Body') },
    { kicker: t('step2Kicker'), title: t('step2Title'), body: t('step2Body') },
    { kicker: t('step3Kicker'), title: t('step3Title'), body: t('step3Body') },
  ];
  const stand = {
    done: data.revealed,
    total: data.total,
    missing: data.total - data.revealed,
  };

  return (
    <main className={`homeV2 ${styles.page} ${deck.page}`} data-menu>
      {/* ── 1. Das Deck ─────────────────────────────────────────
          Der Punktestand „10/25" stand bis zum 06.09.2026 auf der Figur. Er
          ist jetzt ein Satz und steht da, wo er hingehoert: neben der Person,
          um die es geht — hinter dem einen Satz, der sagt, worum es
          ueberhaupt geht. */}
      <section
        className={`hv-section hv-wrap ${styles.section} ${styles.firstSection}`}
      >
        {/* Ganz oben, ueber der Figur und ueber die volle Breite: der eine
            Satz, was Eat This ist. Er stand erst in der Spalte NEBEN der
            Spielerkarte und war dort eine Bildunterschrift zum Charakter —
            gemeint ist er als Ansage der Seite (Nutzer, 06.09.2026: „die
            Eat-This-Info ueber dem Deck, und dann kommt der Avatar und das
            Wording: Ersan hat 10 von 25 Karten umgedreht"). Alles Weitere
            steht in der Tafel unter dem Deck. */}
        <p className={deck.intro}>{t('intro')}</p>

        <div className={deck.masthead}>
          <ProfilePlayerCard name={data.name ?? t('anonymous')} avatarIdx={data.avatar} />

          {/* Kein `hv-head`: das Vokabular stellt Titel und Zaehler auf die
              beiden Enden einer Zeile, und hier stuende die Ueberschrift damit
              am rechten Bildrand, der Kicker 1000 px daneben. */}
          <div className={deck.headCopy}>
            {/* Der Name gehoert in die Ueberschrift (Nutzer, 04.09.2026: „da
                muss halt der Name stehen"). Wer einen geteilten Link oeffnet,
                will zuerst wissen, WESSEN Deck er ansieht. */}
            <h1 className="hv-title">
              {data.name ? t('deckHeadingNamed', { name: data.name }) : t('deckHeading')}
            </h1>
            <p className={deck.howTo}>
              {data.name ? t('standNamed', { name: data.name, ...stand }) : t('stand', stand)}
            </p>
          </div>
        </div>

        {data.cards.length === 0 ? (
          <p className={styles.emptyLine}>{t('empty')}</p>
        ) : (
          <>
            {/* Die Kartenwand: Vorderseiten und Rueckseiten, sonst nichts.
                Bis zum 06.09.2026 war das ein Panini-Album — gestrichelte
                leere Felder mit dreistelliger Nummer neben den aufgedeckten
                Karten. Im eigenen Profil ist das genau richtig, dort SIND die
                Luecken die Aufgabe. Beim Teilen nicht (Nutzer: „es soll nicht
                wie ein Panini-Album sein beim Deckteilen, ohne diese Zahlen
                drauf und ohne diese dumme Linie, sondern wirklich nur die
                verdeckte Karte und die offenen Karten zeigen").

                Eine Rueckseite heisst hier „nicht fuer dich sichtbar" — sie
                deckt die noch nicht umgedrehten Karten ab UND die, die der
                Besitzer hat, aber nicht herzeigen darf. Der Unterschied geht
                den Besucher nichts an, und die Zeile darueber sagt ohnehin,
                wie viele umgedreht sind. */}
            <ul className={deck.cards}>
              {data.cards.map((image, i) => (
                <li className={deck.card} key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={image ? undefined : deck.cardBack}
                    src={image ?? CARD_BACK}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
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

      {/* ── 2. Was Eat This ist, ausfuehrlich ────────────────
          Kartenpaar und die drei Schritte. Die Worte kommen aus dem
          Must-Eats-Onboarding (mustEats.onb*) und von /about — nicht eine
          dritte Fassung derselben Erklaerung. */}
      <section className={`hv-section hv-wrap ${styles.section} ${deck.explain}`}>
        <div className={deck.explainHead}>
          <span className={deck.label}>{t('explainKicker')}</span>
          <h2 className="hv-title">{t('explainTitle')}</h2>
          <p className={deck.explainLead}>{t('explainLead')}</p>
        </div>

        {/* Das Paar sagt den Satz, den kein Einzelbild sagen kann: manche
            liegen offen, manche verdeckt. Dieselben zwei Karten stehen aus
            demselben Grund auf /about. */}
        <div className={deck.pair}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={deck.pairBack}
            src={CARD_BACK}
            alt={t('cardsAlt')}
            loading="lazy"
            decoding="async"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={deck.pairFront}
            src={CARD_FRONT}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
          />
        </div>

        <ol className={deck.steps}>
          {steps.map((step) => (
            <li className={deck.step} key={step.kicker}>
              <span className={deck.label}>{step.kicker}</span>
              <span className={deck.stepTitle}>{step.title}</span>
              <span className={deck.stepBody}>{step.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 3. Mach mit ─────────────────────────────────────────
          Ohne `?ref` — wer schon hier ist, hat das Cookie von der Middleware
          bekommen. */}
      <section className={`hv-section hv-wrap ${styles.section}`}>
        <DeckJoin name={data.name} />
      </section>
    </main>
  );
}
