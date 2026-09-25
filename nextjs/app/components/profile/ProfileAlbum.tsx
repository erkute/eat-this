'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox';
import lightboxStyles from '@/app/components/map/MustEatImageLightbox.module.css';
import MapIntentLink from '@/app/components/MapIntentLink';
import ShareButton from '@/app/components/ShareButton';
import { SITE_URL } from '@/lib/constants';
import { normalizeName } from '@/lib/normalizeName';
import type { MapMustEat } from '@/lib/types';
import { buildAlbum } from '@/lib/profile/mustEatAlbum';
import { computeBadges } from '@/lib/profile/badges';
import ProfilePlayerCard from './ProfilePlayerCard';
import styles from './ProfileAlbum.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';
const ALL = '__all__';

interface Props {
  mustEats: MapMustEat[];
  faceUpIds: Set<string>;
  /** Die Karten, die dieses Konto VOR ORT umgedreht hat — der Stempel. Kaufen
   *  legt eine Karte ins Album, hingehen stempelt sie ab; das ist die einzige
   *  Auszeichnung im Deck, die es nicht zu kaufen gibt. */
  stampedIds: ReadonlySet<string>;
  groupOf: (m: MapMustEat) => string;
  /** Die Spielerkarte — steht als erste Karte neben der Kopfzeile. */
  player: { name: string; avatarIdx: number; onPick: () => void };
  /** Der naechste Zug, zwischen Kopfzeile und Reiterleiste. */
  nextMove?: React.ReactNode;
  /** Die Reiter der Profilseite (Deck · Spots · Packs), direkt unter dem Kopf. */
  tabs?: React.ReactNode;
  /** Falsch, wenn ein anderer Reiter als „Deck" offen ist: dann steht nur der
   *  Kopf mit den Reitern da. */
  showCollection?: boolean;
}

// Die Sammlung — Prototyp, 04.09.2026: ein Album statt sieben Abschnitte.
//
// Bisher brach das Deck pro Bezirk eine eigene Zeile an, in zwei Spalten
// nebeneinander. Gemessen auf 1440 px hiess das: „Charlottenburg 2/2" liess
// vier von sechs Spalten leer, „Steglitz 2/2" stand allein in der letzten
// Zeile. Sieben Ueberschriften, sieben angebrochene Raster, kein einziges
// volles — die Sammlung sah zerlegt aus, nicht sortiert (Nutzer, 04.09.2026).
//
// Jetzt traegt EIN durchgehendes Raster alle Plaetze, in der Reihenfolge des
// Stapels (001, 002, 003 …), und die Bezirke sind dorthin gewandert, wo sie
// ohne Loecher stehen: in eine Filterleiste, die ihren Zaehler gleich
// mitbringt. Damit beantwortet die Leiste die Frage „wo fehlt mir noch was"
// besser als die Ueberschriften es konnten — sie zeigt alle Bezirke auf einen
// Blick statt ueber zwei Bildschirme verteilt.
//
// Der Unterschied zwischen leerem und gefuelltem Platz ist haptisch, nicht
// nur bildlich: der leere Platz liegt IM Album (eingelassener Schatten,
// Nummer, Ort), die gesammelte Karte liegt DARAUF (Schlagschatten). Das ist
// der Panini-Griff — man sieht sofort, was noch aussteht.
export default function ProfileAlbum({
  mustEats,
  faceUpIds,
  stampedIds,
  groupOf,
  player,
  nextMove,
  tabs,
  showCollection = true,
}: Props) {
  const t = useTranslations('profile');
  const locale = useLocale();
  /* Dieselbe Herkunft, auf der der Nutzer steht — eine von Staging aus
     verschickte Karte soll nicht auf die Live-Domain zeigen. SSR kennt keine
     Herkunft, der kanonische Host ist der ehrliche Rueckfall (wie in
     ProfileInvite). */
  const [origin, setOrigin] = useState(SITE_URL);
  useEffect(() => setOrigin(window.location.origin), []);
  const album = useMemo(
    () => buildAlbum(mustEats, faceUpIds, stampedIds, groupOf),
    [mustEats, faceUpIds, stampedIds, groupOf]
  );
  const { slots: allSlots, groups } = album;
  const collected = allSlots.filter((slot) => slot.collected).length;

  const [filter, setFilter] = useState<string>(ALL);
  const [missingOnly, setMissingOnly] = useState(false);

  /* Der gewaehlte Bezirk kann verschwinden, waehrend er gewaehlt ist — ein
     Pack-Kauf bringt neue Bezirke, ein Datenfehler nimmt welche weg. Statt
     einen leeren Rost zu zeigen, faellt die Auswahl dann auf „Alle". */
  const active = groups.some((g) => g.group === filter) ? filter : ALL;

  const slots = useMemo(() => {
    const base = active === ALL ? allSlots : (groups.find((g) => g.group === active)?.slots ?? []);
    return missingOnly ? base.filter((s) => !s.collected) : base;
  }, [active, allSlots, groups, missingOnly]);

  const [expanded, setExpanded] = useState<{
    imageUrl: string;
    alt: string;
    rect: DOMRect;
    id: string;
    /* Das Lokal, in dem die Karte liegt — bei offenen wie bei verdeckten
       Plaetzen. Wohin es von hier aus weitergeht, entscheidet `open`. */
    spot: { slug: string; name: string } | null;
    /* Offen heisst: die Karte ist umgedreht und zeigt ihr Gericht. Dann ist
       der Weg von hier aus nicht „hingehen", sondern „weitersagen". */
    open: boolean;
  } | null>(null);
  // Hide the origin card while its zoomed clone is on screen; reveal it again in
  // onExitComplete (same frame the fly-back clone unmounts) so there's no blink.
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const handleOpenReady = useCallback(() => {
    const current = expandedRef.current;
    if (current) setHiddenId(current.id);
  }, []);
  const handleExitComplete = () => {
    if (!expandedRef.current) setHiddenId(null);
  };

  const missingTotal = allSlots.length - collected;

  /* Bis zu fuenf offene Karten fuer den Faecher hinter der Spielerkarte (am
     Telefon zeigt das CSS drei). Wer noch keine hat, haelt Rueckseiten hin —
     auch das ist ein Deck. */
  const heroCards = useMemo(() => {
    const open = allSlots.flatMap((slot) =>
      slot.collected && slot.mustEat?.image ? [slot.mustEat.image] : []
    );
    return [...open, ...Array<string>(5).fill(CARD_BACK)].slice(0, 5);
  }, [allSlots]);

  /* Abzeichen — was das Deck ueber den Stand hinaus hergibt. Rechnet sich
     aus dem Album aus, das hier ohnehin steht: kein Firestore-Feld, nichts
     nachzuhalten, nie veraltet. Bewusst keine Rangliste (siehe badges.ts).

     Gezaehlt werden die STEMPEL, nicht die offenen Karten: das Starter Pack
     legt in jedes frische Deck fuenfzehn offene Karten, ein Kauf weitere —
     ein Abzeichen dafuer waere eine Quittung fuer die Anmeldung. Die Reiter
     darueber zaehlen weiter offen gegen alle; das ist der Stand des Decks,
     das hier ist, was jemand dafuer getan hat. */
  const badges = useMemo(
    () =>
      computeBadges({
        stamped: allSlots.filter((slot) => slot.stamped).length,
        groups: groups.map((g) => ({
          group: g.group,
          done: g.slots.filter((s) => s.stamped).length,
          total: g.slots.length,
        })),
      }),
    [allSlots, groups]
  );

  return (
    <div className={styles.panel}>
      {/* Der Kopf als Buehne (24.09.2026, Nutzer waehlte aus drei Varianten
          „1"): die Spielerkarte in der Mitte eines Faechers aus offenen
          Karten, darunter Gruss und Titel — mittig, ohne Kasten, dieselbe
          Buehne wie der Kopf des geteilten Decks. Zwei Anlaeufe davor (Tafel
          mit Karte links, dann rechts) wirkten „leer" bzw. „gefaellt mir
          nicht".

          Kein Zaehler sichtbar: der Stand steht auf dem „Alle"-Reiter
          (Nutzer, 04.09.2026: „macht das dort oben Sinn, neben dem
          Profil?"). */}
      <div className={styles.masthead}>
        <div className={styles.art}>
          {heroCards.map((src, i) => {
            const at = i - (heroCards.length - 1) / 2;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${src}-${i}`}
                className={styles.artCard}
                style={{ '--art-i': at, zIndex: 2 - Math.abs(at) } as CSSProperties}
                src={src}
                alt=""
                aria-hidden="true"
                decoding="async"
              />
            );
          })}
          <ProfilePlayerCard
            name={player.name}
            avatarIdx={player.avatarIdx}
            onPick={player.onPick}
          />
        </div>

        <div className={styles.head}>
          <span className={styles.hello}>{t('albumHello', { name: player.name })}</span>
          <h1 className="hv-title">{t('albumHeading')}</h1>
          {allSlots.length > 0 && (
            <span className={styles.srOnly}>
              {collected} {t('albumCount', { total: allSlots.length })}
            </span>
          )}
        </div>
      </div>

      {tabs}

      {showCollection && (
        <>
          {/* Der naechste Zug als eigene Zeile UNTER dem Kopf, nicht an der
          Spielerkarte (Nutzer, 24.09.2026: „Standort … nicht zu nah am
          Profilbild, eventuell gehoert es drunter"). */}
          {nextMove && <div className={styles.albumMove}>{nextMove}</div>}

          {/* Eine eigene Zeile ueber dem Raster, ueber die volle Breite — nicht
          mehr in der Spalte neben der Spielerkarte (Nutzer, 05.09.2026: „die
          Filter muessen auf Desktop eine Zeile runter, ueber die Must Eats,
          dann hast du mehr Platz fuer den Slogan und fuer das naechste Must
          Eat"). Sie schalten das Raster darunter, also stehen sie direkt
          darueber und nicht neben der Figur.

          Die Bezirke als Reiter, nicht als Ueberschriften: hier stehen sie
          vollstaendig nebeneinander und tragen ihren Zaehler mit. „Fehlende"
          ist ein Schalter und kein achter Reiter — er schneidet quer durch
          jeden Bezirk. */}
          {groups.length > 1 && (
            <div className={styles.filters} role="group" aria-label={t('albumFilterLabel')}>
              {/* „Alle" traegt seit dem 06.09.2026 denselben Zaehler wie die
              Bezirke daneben: aufgedeckt von wie vielen. Vorher stand dort
              die nackte Gesamtzahl, und der Stand stand als Punktestand auf
              der Spielerkarte — an einer Figur, die eigentlich ein Knopf zum
              Charakterwechsel ist (Nutzer: „die Zahl 10 von 25 muss weg, das
              koennte halt bei ‚Alle' stehen"). Hier gehoert er hin: es ist
              der Reiter, der genau diese Menge schaltet. */}
              <button
                type="button"
                className={styles.chip}
                aria-pressed={active === ALL}
                aria-label={t('albumGroupProgress', {
                  group: t('albumFilterAll'),
                  done: collected,
                  total: allSlots.length,
                })}
                onClick={() => setFilter(ALL)}
              >
                <span className={styles.chipName}>{t('albumFilterAll')}</span>
                <span className={styles.chipCount} aria-hidden="true">
                  {collected}/{allSlots.length}
                </span>
              </button>
              {missingTotal > 0 && (
                <button
                  type="button"
                  className={`${styles.chip} ${styles.chipMissing}`}
                  aria-pressed={missingOnly}
                  onClick={() => setMissingOnly((v) => !v)}
                >
                  <span className={styles.chipName}>{t('albumFilterMissing')}</span>
                  <span className={styles.chipCount}>{missingTotal}</span>
                </button>
              )}
              {groups.map((g) => {
                const done = g.slots.filter((s) => s.collected).length;
                return (
                  <button
                    key={g.group}
                    type="button"
                    className={styles.chip}
                    aria-pressed={active === g.group}
                    aria-label={t('albumGroupProgress', {
                      group: g.group,
                      done,
                      total: g.slots.length,
                    })}
                    onClick={() => setFilter(g.group)}
                  >
                    <span className={styles.chipName}>{g.group}</span>
                    <span className={styles.chipCount} aria-hidden="true">
                      {done}/{g.slots.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {allSlots.length === 0 ? (
            <p className={styles.emptyText}>{t('emptyMustEats')}</p>
          ) : slots.length === 0 ? (
            /* Nur erreichbar mit „Fehlende" auf einem vollen Bezirk — und genau
           dann ist das keine Panne, sondern die beste Nachricht der Seite. */
            <p className={styles.emptyText}>{t('albumFilterComplete')}</p>
          ) : (
            <div className={styles.grid}>
              {slots.map((slot) => {
                const open = slot.collected && !!slot.mustEat?.image;
                const imageUrl = (open && slot.mustEat?.image) || CARD_BACK;
                const alt = (open ? slot.mustEat?.dish : undefined) ?? '';
                const where = slot.where ? normalizeName(slot.where) : null;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-label={
                      open
                        ? slot.stamped
                          ? `${alt} — ${t('albumStamped')}`
                          : alt
                        : `${t('lockedSubhead')}${slot.no ? ` — ${slot.no}` : ''}`
                    }
                    className={`${styles.slot} ${open ? styles.filled : styles.empty}`}
                    style={{ visibility: hiddenId === slot.id ? 'hidden' : undefined }}
                    onClick={(e) => {
                      setExpanded({
                        imageUrl,
                        alt,
                        rect: e.currentTarget.getBoundingClientRect(),
                        id: slot.id,
                        spot: slot.slug && where ? { slug: slot.slug, name: where } : null,
                        open,
                      });
                    }}
                  >
                    {open && slot.mustEat?.image ? (
                      <>
                        {/* The protected image route authorizes the browser's
                        HttpOnly capability cookie. next/image's internal
                        optimizer does not forward that cookie, so private
                        album art must load directly. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slot.mustEat.image}
                          alt=""
                          className={styles.img}
                          loading="lazy"
                          decoding="async"
                        />
                        {/* Der Stempel. Er sitzt auf der Karte, leicht schief wie
                        ein echter, und sagt das Einzige, was ein Kauf nicht
                        kann: da war jemand. */}
                        {slot.stamped && (
                          <span className={styles.stamp} aria-hidden="true">
                            {t('albumStamped')}
                          </span>
                        )}
                      </>
                    ) : (
                      /* Der leere Platz: dieselbe gedaempfte Rueckseite, mit der
                     das geteilte Deck eine noch fehlende Karte zeigt — eine
                     Sprache fuer „noch nicht gesammelt" auf beiden Seiten.
                     Darauf der Spot, in dem die Karte liegt: das ist die
                     Aufgabe. Bis zum 24.09.2026 stand hier ein gestricheltes
                     Feld mit Nummer und Wasserzeichen — drei Angaben fuer eine,
                     und die Nummer beantwortete keine Frage. */
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={styles.backImg} src={CARD_BACK} alt="" loading="lazy" />
                        {where && (
                          <span className={styles.slotWhere} aria-hidden="true">
                            {where}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Unter dem Raster, nicht darueber: ein Abzeichen ist das Ergebnis
          der Karten, nicht ihre Ueberschrift. Leer rendert die Zeile gar
          nichts — eine Reihe verschlossener Abzeichen waere eine Liste
          dessen, was fehlt, und die steht auf dieser Seite schon zweimal. */}
          {badges.length > 0 && (
            <div className={styles.badges}>
              <span className={styles.badgesLabel}>{t('badgesHeading')}</span>
              <ul className={styles.badgeList}>
                {badges.map((badge) => (
                  <li
                    className={styles.badge}
                    key={badge.kind === 'district' ? `d:${badge.value}` : badge.kind}
                  >
                    {badge.kind === 'cards'
                      ? badge.value === 1
                        ? t('badgeFirstCard')
                        : t('badgeCards', { count: badge.value })
                      : badge.kind === 'district'
                        ? t('badgeDistrict', { district: badge.value })
                        : t('badgeAllBerlin')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenId)}
        imageUrl={expanded?.imageUrl ?? null}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        /* Zwei Wege aus dem Zoom, je nachdem, was da liegt.
 
           VERDECKT: auf den SPOT, nicht auf das Must Eat — ein Spot traegt
           mehrere Karten, und wer hier steht, will wissen, wo er hin muss,
           nicht welche der Karten dort als naechste faellt. (Vorher war der
           Zoom hier eine Sackgasse: Rueckseite gross, und der einzige Weg
           weiter war Zumachen.)

           OFFEN: weitersagen. Panini-Tauschen hat hier kein Gegenstueck — es
           gibt keine Doppelten —, das Aequivalent ist, jemandem die Karte zu
           schicken, die man selbst umgedreht hat. Geteilt wird die
           SPOT-SEITE, nicht das Bild: sie ist oeffentlich, sie zeigt das
           Lokal, und ihr Must-Eat-Teaser ist genau die Tuer, durch die der
           Empfaenger kommen soll. Ein Bild waere eine Sackgasse mit Foto. */
        action={
          expanded?.spot ? (
            expanded.open ? (
              <ShareButton
                className={lightboxStyles.actionBtn}
                url={`${origin}${locale === 'en' ? '/en' : ''}/restaurant/${expanded.spot.slug}`}
                title={t('albumShareTitle', { dish: expanded.alt, name: expanded.spot.name })}
                slug={expanded.spot.slug}
                contentType="must_eat_card"
                label={t('albumShare')}
                copiedLabel={t('albumShareCopied')}
              />
            ) : (
              <MapIntentLink
                href={`/map?r=${encodeURIComponent(expanded.spot.slug)}`}
                rel="nofollow"
                className={lightboxStyles.actionBtn}
              >
                {t('albumToSpot', { name: expanded.spot.name })}
              </MapIntentLink>
            )
          ) : null
        }
        onClose={() => setExpanded(null)}
        onOpenReady={handleOpenReady}
        onExitComplete={handleExitComplete}
      />
    </div>
  );
}
