'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  groupOf: (m: MapMustEat) => string;
  /** Die Spielerkarte — steht als erste Karte neben der Kopfzeile. */
  player: { name: string; avatarIdx: number; onPick: () => void };
  /** Der naechste Zug, zwischen Kopfzeile und Reiterleiste. */
  nextMove?: React.ReactNode;
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
export default function ProfileAlbum({ mustEats, faceUpIds, groupOf, player, nextMove }: Props) {
  const t = useTranslations('profile');
  const locale = useLocale();
  /* Dieselbe Herkunft, auf der der Nutzer steht — eine von Staging aus
     verschickte Karte soll nicht auf die Live-Domain zeigen. SSR kennt keine
     Herkunft, der kanonische Host ist der ehrliche Rueckfall (wie in
     ProfileInvite). */
  const [origin, setOrigin] = useState(SITE_URL);
  useEffect(() => setOrigin(window.location.origin), []);
  const album = useMemo(
    () => buildAlbum(mustEats, faceUpIds, groupOf),
    [mustEats, faceUpIds, groupOf]
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

  /* Abzeichen — was das Deck ueber den Stand hinaus hergibt. Rechnet sich
     aus dem Album aus, das hier ohnehin steht: kein Firestore-Feld, nichts
     nachzuhalten, nie veraltet. Bewusst keine Rangliste (siehe badges.ts). */
  const badges = useMemo(
    () =>
      computeBadges({
        collected,
        groups: groups.map((g) => ({
          group: g.group,
          done: g.slots.filter((s) => s.collected).length,
          total: g.slots.length,
        })),
      }),
    [collected, groups]
  );

  return (
    <div className={styles.panel}>
      {/* Ein Raster aus vier Feldern statt einer Spalte mit Unterspalte: auf
          dem Telefon muss die Reiterleiste unter dem Paar aus Karte und Titel
          durchlaufen, und das geht nur, wenn sie im selben Raster liegt. */}
      <div className={styles.masthead}>
        <ProfilePlayerCard
          name={player.name}
          avatarIdx={player.avatarIdx}
          onPick={player.onPick}
        />

        <div className={`hv-head ${styles.head}`}>
          {/* Das h1 der Seite. Bisher hiess es „Ersan" und stand in der
              Ink-Bank; mit deren Wegfall ist die Sammlung der Seitenanfang,
              und sie ist auch das ehrlichere Thema: die Seite handelt vom
              Deck, nicht vom Vornamen.

              Ohne Zaehler daneben (Nutzer, 04.09.2026: „macht das dort oben
              Sinn, neben dem Profil?"). Er stand am rechten Rand, zwei
              Spalten von der Karte entfernt, und sagte dasselbe wie die
              Reiter darunter. Seit dem 06.09.2026 steht er nur noch dort —
              auf „Alle", dem Reiter, der genau diese Menge schaltet. */}
          <h1 className="hv-title">{t('albumHeading')}</h1>
          {/* Wie das Spiel geht, in einem Satz — derselbe, der seit dem
              04.09.2026 auf dem geteilten Deck steht (Nutzer, 05.09.2026:
              „das ist eine sehr gute Info, die brauch ich auf jeden Fall auch
              fuers normale Profil"). Er nimmt dem naechsten Zug darunter die
              Erklaerarbeit ab: der sagt jetzt nur noch, WO die naechste Karte
              liegt. */}
          <p className={styles.howTo}>{t('howTo')}</p>
          {/* Sichtbar steht der Stand auf dem „Alle"-Reiter, und der ist ein
              Zahlenpaar in einem Knopf. Hier bleibt er als Satz — und zwar
              auch dann, wenn die Reiterleiste gar nicht rendert (ein einziger
              Bezirk). */}
          {allSlots.length > 0 && (
            <span className={styles.srOnly}>
              {collected} {t('albumCount', { total: allSlots.length })}
            </span>
          )}
        </div>
      </div>

      {/* Eigene Zeile ueber die volle Breite, zwischen Kopfzeile und Reitern.
          In der Spalte neben der Spielerkarte fing sein Text bei 380 px an —
          die Ueberschrift bei 322, Karte, Reiter und Raster bei 96. Drei
          linke Kanten auf einer Seite, und die dritte gehoerte ausgerechnet
          der Zeile, die dazwischen lag (Nutzer, 05.09.2026: „nicht schoen
          ausgerichtet zu dem Rest"). Jetzt sind es zwei: der Block aus Karte
          und Titel, und darunter alles an derselben Kante — dieselbe
          Anordnung, die auf dem Telefon ohnehin schon steht.

          Weiterhin NICHT zwischen Reitern und Raster (Nutzer, 04.09.2026):
          die Bezirke filtern das Raster, und was dazwischen steht, trennt
          einen Schalter von dem, was er schaltet. */}
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
                aria-label={open ? alt : `${t('lockedSubhead')}${slot.no ? ` — ${slot.no}` : ''}`}
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
                  // The protected image route authorizes the browser's
                  // HttpOnly capability cookie. next/image's internal
                  // optimizer does not forward that cookie, so private
                  // album art must load directly.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slot.mustEat.image}
                    alt=""
                    className={styles.img}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  /* Der leere Platz zeigt, was dorthin gehoert: die Nummer
                     der Karte und das Lokal, in dem sie liegt. Ein Album-
                     Feld ohne Beschriftung waere nur ein Loch — mit ihr ist
                     es eine Aufgabe. Die Rueckseite bleibt als Wasserzeichen
                     darunter, damit der Platz zur Marke gehoert.

                     Die Nummer ist die der KARTE (`order`), dreistellig wie
                     im Druck — nicht mehr die laufende Position im Album. */
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.backImg} src={CARD_BACK} alt="" loading="lazy" />
                    {slot.no && (
                      <span className={styles.slotNo} aria-hidden="true">
                        {slot.no}
                      </span>
                    )}
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
