import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
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
import DeckActions from './DeckActions';
import deck from './Deck.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';
const FAN_ORDER = { shown: 0, held: 1, missing: 2 } as const;
/* Sieben passen am Telefon als Faecher in 358 px, ohne dass eine Karte zur
   Briefmarke wird. */
const FAN_SIZE = 7;

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
 * Sie zeigt keine Gerichte ausser dem oeffentlichen Satz, keine Spot-Namen
 * und keine Notizen — was hier steht, ist in `PublicDeck` aufgezaehlt, und
 * was dort fehlt, verlaesst den Server nicht (siehe publicDeck.server.ts).
 *
 * KURZ, mit Absicht (Nutzer, 24.09.2026: „kurz, knapp und geil muss es sein
 * fuer den Freund, der das bekommt … es muss Bock auf die Map machen. Mehr
 * brauche ich nicht."). Bis dahin trug die Seite eine Kartenwand ueber zwei
 * Bildschirme, Bezirks-Balken, eine Erklaer-Tafel mit Kartenpaar und drei
 * Schritten und darunter das ganze Anmeldeformular. Jetzt: wessen Deck, ein
 * Faecher aus ein paar Karten, zwei Saetze, was ein Must Eat ist, und der
 * Weg auf die Map.
 *
 * Das Anmeldeformular braucht die Seite dafuer nicht mehr: der Link, den das
 * Profil teilt, traegt `?ref=<uid>`, die Middleware setzt daraus das Cookie,
 * und sowohl die Google-Anmeldung als auch `send-magic-link` lesen es — egal,
 * ob sich jemand hier, auf der Map oder eine Woche spaeter anmeldet.
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

  /* Ein paar Karten, keine Wand: offene zuerst, dann gesammelte, dann
     fehlende — und die offenen in die Mitte des Faechers, dort, wo das Auge
     hinfaellt. Die Sortierung nimmt den Karten ihre Position im Stapel, also
     verraet der Faecher nicht, WELCHE Karte verdeckt gesammelt ist. */
  const picked = [...data.cards]
    .sort((a, b) => FAN_ORDER[a.kind] - FAN_ORDER[b.kind])
    .slice(0, FAN_SIZE);
  const fan = centerOut(picked);
  const name = data.name ?? t('anonymous');

  return (
    <main className={`homeV2 ${styles.page} ${deck.page}`} data-menu>
      <section className={`hv-section hv-wrap ${deck.stage}`}>
        <div className={deck.copy}>
          <div className={deck.owner}>
            <ProfilePlayerCard name={name} avatarIdx={data.avatar} />
            <div className={deck.ownerText}>
              {/* Der Name gehoert in die Ueberschrift (Nutzer, 04.09.2026: „da
                  muss halt der Name stehen"). */}
              <h1 className="hv-title">
                {data.name ? t('deckHeadingNamed', { name: data.name }) : t('deckHeading')}
              </h1>
              <p className={deck.stand}>
                {data.name
                  ? t('stand', { name: data.name, done: data.revealed, total: data.total })
                  : t('standAnon', { done: data.revealed, total: data.total })}
              </p>
            </div>
          </div>

          {/* Was ein Must Eat ist — dieselben zwei Saetze wie auf /must-eats
              (MustEatsSection), nicht eine dritte Fassung. */}
          <div className={deck.pitch}>
            <span className={deck.kicker}>{t('pitchKicker')}</span>
            <h2 className={deck.pitchTitle}>{t('pitchTitle')}</h2>
            <p className={deck.pitchBody}>{t('pitchBody')}</p>
          </div>

          <DeckActions uid={uid} />
        </div>

        {fan.length > 0 && (
          <ul className={deck.fan}>
            {fan.map((card, i) => (
              <li
                className={deck.fanCard}
                key={i}
                style={
                  {
                    '--fan-i': i - (fan.length - 1) / 2,
                    '--fan-d': Math.abs(i - (fan.length - 1) / 2),
                    zIndex: fan.length - Math.ceil(Math.abs(i - (fan.length - 1) / 2)),
                  } as CSSProperties
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={
                    card.kind === 'missing'
                      ? deck.cardMissing
                      : card.kind === 'held'
                        ? deck.cardBack
                        : undefined
                  }
                  src={card.kind === 'shown' ? card.image : CARD_BACK}
                  alt=""
                  decoding="async"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

/** Ordnet so um, dass das erste Element in der Mitte liegt, das zweite links
 *  daneben, das dritte rechts daneben und so weiter. */
function centerOut<T>(items: T[]): T[] {
  const out: T[] = [];
  items.forEach((item, i) => {
    if (i % 2 === 0) out.push(item);
    else out.unshift(item);
  });
  return out;
}
