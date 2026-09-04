'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useUnlockedMustEats, useMapData } from '@/lib/map';
import {
  defaultAvatarFromUid,
  useUserProfile,
  type AvatarChoice,
} from '@/lib/firebase/useUserProfile';
import { FALLBACK_DISTRICT } from '@/lib/profile/nextMove';
import { TOAST_HANDOFF_KEY } from '../NotificationToast';
import MapDataNotice from '../map/MapDataNotice';
import ProfileSpots from './ProfileSpots';
import ProfileAlbum from './ProfileAlbum';
import ProfilePlayerCard from './ProfilePlayerCard';
import ProfileNextMove from './ProfileNextMove';
import ProfilePacks from './ProfilePacks';
import ProfileRecentReveals from './ProfileRecentReveals';
import ProfileInvite from './ProfileInvite';
import AuthScreen, { AUTH_SCREEN_HOLD_MS } from '../AuthScreen';
import AvatarPickerModal from './AvatarPickerModal';
import SiteFooter from '../SiteFooter';
import styles from './Profile.module.css';

interface Props {
  /** Server-computed anon face-up set (trial-10 ∪ spot-of-day). Publicly
   *  face-up cards stay face-up in the collection too. */
  publicFaceUpIds: string[];
}

// The profile speaks the home's visual language: one white page, the homeV2
// element vocabulary (hv-wrap / hv-section / hv-head / hv-title / hv-rail),
// photos straight on the paper. No dossier panels, no polaroid, no menu dots —
// those were three metaphors the rest of the site doesn't use.
//
// Order follows why someone opens this page: the deck first, then what they
// just turned over, then their spots, their packs, and the invite.
export default function ProfileShell({ publicFaceUpIds }: Props) {
  const { user, loading: authLoading, signOut } = useAuth();
  /* Das Abmelden hatte bisher keinen sichtbaren Zustand: das Profil verschwand
     wortlos, und der Toast meldete es erst nach dem Reload nach. */
  const [signingOut, setSigningOut] = useState(false);
  const locale = useLocale();
  const t = useTranslations('profile');
  const [pickerOpen, setPickerOpen] = useState(false);
  // Map-page reveals write to users/{uid}/unlockedMustEats — unioned with the
  // public face-up set (trial-10 ∪ spot-of-day) so anything publicly revealed
  // is open in the collection too, even right after first signup.
  const { unlockedIds: storedUnlockedIds, unlockedAt } = useUnlockedMustEats(user?.uid ?? null);
  const { profile, setAvatar } = useUserProfile(user?.uid ?? null);
  // Owned spots (the user's map tier) → drives which must-eats appear in the
  // collected grid. Fetches /api/map-data on mount; cached for instant repaint.
  // The same per-user payload also feeds the deck itself — covered cards come
  // back stripped (no dish/image), unlocked ones carry the full card data.
  const {
    restaurants: ownedRestaurants,
    mustEats,
    revealedMustEatIds,
    fullCatalog,
    loading: mapDataLoading,
    error: mapDataError,
    refetch: refetchMapData,
  } = useMapData({
    uid: user?.uid ?? null,
    authLoading,
  });
  const unlockedIds = useMemo(
    () => new Set<string>([...storedUnlockedIds, ...publicFaceUpIds, ...revealedMustEatIds]),
    [storedUnlockedIds, publicFaceUpIds, revealedMustEatIds]
  );
  const hasMapData = ownedRestaurants.length > 0 || mustEats.length > 0;
  const ownedRestaurantIds = useMemo(
    () => new Set(ownedRestaurants.map((r) => r._id)),
    [ownedRestaurants]
  );
  const ownedRestaurantSlugs = useMemo(
    () => new Map(ownedRestaurants.map((r) => [r._id, r.slug])),
    [ownedRestaurants]
  );
  // Only Must-Eats whose spot the user owns appear in the album.
  const ownedMustEats = useMemo(
    () => mustEats.filter((m) => ownedRestaurantIds.has(m.restaurant._id)),
    [mustEats, ownedRestaurantIds]
  );
  // Die Sammlung gruppiert nach Bezirk. MapMustEat.restaurant traegt zwar ein
  // freies `district`, aber nicht das kuratierte `bezirk`-Objekt — der Join
  // ueber die eigenen Restaurants holt beides und nimmt das gepflegte zuerst,
  // damit „Prenzlauer Berg" nicht neben „Prenzlauer-Berg" steht.
  const districtByRest = useMemo(
    () =>
      new Map(
        ownedRestaurants.map((r) => [r._id, r.bezirk?.name ?? r.district ?? FALLBACK_DISTRICT])
      ),
    [ownedRestaurants]
  );

  if (authLoading || !user || (mapDataLoading && !hasMapData)) {
    return (
      <main className={`homeV2 ${styles.page}`} data-menu>
        <div className={styles.loading} role="status" aria-label={t('dataLoading')}>
          <div className={styles.spinner} aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (mapDataError && !hasMapData) {
    return (
      <>
        <main className={`homeV2 ${styles.page}`} data-menu>
          <div className="hv-wrap">
            <div className={`${styles.dataNotice} ${styles.dataNoticeError}`} role="alert">
              <p>{t('dataError')}</p>
              <button type="button" className={styles.dataNoticeAction} onClick={refetchMapData}>
                {t('dataRetry')}
              </button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const avatarIdx = profile.avatar ?? defaultAvatarFromUid(user.uid);
  const firstName =
    (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || t('heroTitle');
  const accountLabel = user.email ?? t('heroLine');

  async function handleAvatarChange(choice: AvatarChoice) {
    if (choice === avatarIdx) return;
    await setAvatar(choice);
  }

  /**
   * Abmelden mit sichtbarem Wartescreen.
   *
   * Erst halten, dann abmelden — nicht umgekehrt. Sobald Firebase `user` auf
   * null setzt, nimmt ProfileAuthGuard diesen Baum aus dem DOM, und mit ihm den
   * Screen; das Abmelden selbst ist in Millisekunden durch. Der Screen war
   * darum weg, bevor man ihn gelesen hatte (Nutzer, 29.08.2026).
   */
  function handleSignOut() {
    setSigningOut(true);
    /* Der Timer wird beim Unmount bewusst nicht abgeraeumt: wer waehrend der
       Haltezeit per Back-Taste rausgeht, hat das Abmelden trotzdem verlangt. */
    window.setTimeout(() => {
      /* Sign-out hard-navigates to '/' (ProfileAuthGuard) — park the
         confirmation so the toast shows after the reload. Erst hier, nicht
         schon beim Klick: sonst laege sie die ganze Haltezeit ueber bereit und
         ein zwischendurch geschlossener Tab meldete beim naechsten Aufruf
         "Du bist abgemeldet", waehrend die Anmeldung steht. */
      try {
        sessionStorage.setItem(
          TOAST_HANDOFF_KEY,
          locale === 'de' ? 'Du bist abgemeldet' : "You're signed out"
        );
      } catch {
        /* private mode */
      }
      void signOut().catch(() => {
        /* clearPremiumAccess wirft bei einem fehlgeschlagenen Request —
           AuthContext reicht den Fehler bewusst an den Aufrufer durch.
           Ohne diesen Zweig bliebe der Wartescreen als fixed-Layer ueber
           der Seite stehen, ohne Schliessweg: angemeldet, aber vom
           eigenen Profil ausgesperrt.

           Die geparkte Bestaetigung muss mit weg. Sie wurde eben fuer
           den Reload hinterlegt, der jetzt nicht kommt — sonst meldet
           der naechste Seitenaufruf "Du bist abgemeldet", waehrend die
           Anmeldung steht. */
        setSigningOut(false);
        try {
          sessionStorage.removeItem(TOAST_HANDOFF_KEY);
        } catch {
          /* private mode */
        }
      });
    }, AUTH_SCREEN_HOLD_MS);
  }

  return (
    <>
      <main className={`homeV2 ${styles.page}`} data-menu>
        {/* Meldungen liegen ueber der Seite, nicht in ihr (Nutzer, 04.09.2026:
            „keine Meldungen mehr oben oder unten im Bild, sondern als Layer,
            wie wir das sonst haben"). Hier stand ein Balken im Fluss, der beim
            Erscheinen die ganze Seite nach unten schob — die Sammlung sprang,
            waehrend man sie ansah.

            Dieselbe Komponente wie auf der Map, nicht eine zweite mit
            derselben Aufgabe: sie kennt die vier Zustaende schon (laedt,
            aktualisiert, Fehler, veraltet), waehlt Ton und Zeichen und haengt
            den Wiederholen-Knopf an. Die Texte liegen im `map`-Namespace, und
            das ist ehrlich — es sind dieselben Kartendaten, dieselbe
            /api/map-data-Antwort.

            Nur im Normalfall: der Zweig ganz ohne Kartendaten rendert weiter
            oben seine eigene Seite, und dort IST die Meldung der Inhalt, kein
            Balken ueber einem. */}
        <MapDataNotice
          loading={mapDataLoading}
          error={mapDataError}
          hasData={hasMapData}
          onRetry={refetchMapData}
        />

        {/* No counters here on purpose: a raw spot tally is a receipt, not a
            profile — and the product deliberately doesn't state its numbers.
            The only count that stays is the deck's own progress. */}
        {/* Kein eigener Seitenkopf mehr (Prototyp, 04.09.2026). Die Ink-Bank
            war 315 px hoch (Desktop 1440) und trug drei Angaben: Kicker,
            Name, Berlin-Zahl, dazu die Figur als Gegenstand in der rechten
            Ecke. Auf dem Telefon frass sie 43 % des ersten Bildschirms, und
            die Sammlung — der Grund, diese Seite zu oeffnen — fing darunter
            an (Nutzer, 04.09.2026: „viel zu gross", „der Avatar ist nicht
            richtig geil eingesetzt").

            Alle drei Angaben stehen jetzt AUF der Spielerkarte, im Format
            jeder Must-Eat-Karte, und die steht in der Kopfzeile des Albums.
            Der Charakter ist damit selbst eine Karte statt Zierrat neben
            einer Ueberschrift. */}
        <section className={`hv-section hv-wrap ${styles.section} ${styles.firstSection}`}>
          <ProfileAlbum
            mustEats={ownedMustEats}
            faceUpIds={unlockedIds}
            groupOf={(m) =>
              districtByRest.get(m.restaurant._id) ?? m.restaurant.district ?? FALLBACK_DISTRICT
            }
            playerCard={
              <ProfilePlayerCard
                name={firstName}
                avatarIdx={avatarIdx}
                onPick={() => setPickerOpen(true)}
              />
            }
            /* Der einzige Zug nach vorn auf dieser Seite — und er handelt vom
               Deck, steht also im Deck. In der Ink-Tafel des Kopfes war er ein
               Untermieter zwischen Name und Berlin-Zahl. */
            nextMove={
              <ProfileNextMove
                mustEats={ownedMustEats}
                faceUpIds={unlockedIds}
                districtByRest={districtByRest}
                hasRevealed={unlockedAt.size > 0}
              />
            }
          />
        </section>

        <ProfileRecentReveals mustEats={ownedMustEats} unlockedAt={unlockedAt} />

        <section className={`hv-section hv-wrap ${styles.section}`}>
          <div className={`hv-head ${styles.head}`}>
            <h2 className="hv-title">{t('savedHeading')}</h2>
          </div>
          <ProfileSpots uid={user.uid} restaurantSlugs={ownedRestaurantSlugs} />
        </section>

        <section className={`hv-section hv-wrap ${styles.section}`}>
          <ProfilePacks uid={user.uid} fullCatalog={fullCatalog} />
        </section>

        <section className={`hv-section hv-wrap ${styles.section}`}>
          <ProfileInvite uid={user.uid} />
        </section>

        {/* Account chrome belongs at the bottom, quiet: it is the one thing
            nobody comes to this page for. */}
        <div className={`hv-wrap ${styles.foot}`}>
          <span className={styles.footAccount}>
            {t('fieldAccount')}: {accountLabel}
          </span>
          <button type="button" className={styles.logout} onClick={handleSignOut}>
            {t('signOut')}
          </button>
        </div>
      </main>
      <SiteFooter />
      {pickerOpen && (
        <AvatarPickerModal
          current={avatarIdx}
          onApply={handleAvatarChange}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {/* Hier, nicht im Fehler-Zweig: der Abmelden-Knopf steht in genau diesem
          Baum. Im Zweig ohne Kartendaten gibt es ihn nicht, dort konnte
          `signingOut` also nie wahr werden — der Screen war unerreichbar. */}
      {signingOut && <AuthScreen mode="out" />}
    </>
  );
}
