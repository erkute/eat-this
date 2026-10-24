'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useUnlockedMustEats, useMapData } from '@/lib/map';
import {
  defaultAvatarFromUid,
  useUserProfile,
  type AvatarChoice,
} from '@/lib/firebase/useUserProfile';
import { FALLBACK_DISTRICT } from '@/lib/profile/nextMove';
import MapDataNotice from '../map/MapDataNotice';
import ProfileSpots from './ProfileSpots';
import ProfileHeader from './ProfileHeader';
import ProfileNavigation, { PROFILE_TABS, type ProfileTab } from './ProfileNavigation';
import ProfileAccount from './ProfileAccount';
import ProfileAlbum from './ProfileAlbum';
import ProfileNextMove from './ProfileNextMove';
import ProfilePacks from './ProfilePacks';
import ProfileRecentReveals from './ProfileRecentReveals';
import ProfileInvite from './ProfileInvite';
import ProfileFriends from './ProfileFriends';
import AuthScreen, { AUTH_SCREEN_HOLD_MS } from '../AuthScreen';
import AvatarPickerModal from './AvatarPickerModal';
import SiteFooter from '../SiteFooter';
import styles from './Profile.module.css';

interface Props {
  /** Server-computed anon face-up set (trial-10 ∪ spot-of-day). Publicly
   *  face-up cards stay face-up in the collection too. */
  publicFaceUpIds: string[];
}

export default function ProfileShell({ publicFaceUpIds }: Props) {
  const { user, loading: authLoading, signOut, updateDisplayName } = useAuth();
  /* Das Abmelden hatte bisher keinen sichtbaren Zustand: das Profil verschwand
     wortlos, und der Toast meldete es erst nach dem Reload nach. */
  const [signingOut, setSigningOut] = useState(false);
  const t = useTranslations('profile');
  const [pickerOpen, setPickerOpen] = useState(false);
  /* Der Reiter steht im Anker (#spots, #packs), damit ein Neuladen und der
     Zurueck-Weg aus einem Spot dort landen, wo man war. */
  const [tab, setTab] = useState<ProfileTab>('deck');
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (PROFILE_TABS.some((id) => id === fromHash)) setTab(fromHash as ProfileTab);
  }, []);
  const pickTab = (next: ProfileTab) => {
    setTab(next);
    const { pathname, search } = window.location;
    window.history.replaceState(
      window.history.state,
      '',
      next === 'deck' ? `${pathname}${search}` : `${pathname}${search}#${next}`
    );
  };
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

  /* Drei eigene Karten fuer den Einladen-Faecher. `image` traegt nur, was
     auf der eigenen Oberflaeche offen liegt — dieselbe Bedingung, unter der
     das Album eine Karte als aufgedeckt zeichnet. Sind es weniger als drei,
     fuellt ProfileInvite mit Rueckseiten auf. */
  const inviteCards = useMemo(
    () =>
      ownedMustEats
        .map((m) => m.image)
        .filter((image): image is string => Boolean(image))
        .slice(0, 3),
    [ownedMustEats]
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
              <button type="button" className="et-btn" onClick={refetchMapData}>
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
    /* Keine Bestaetigung danach: der Wartescreen sagt „Du wirst abgemeldet",
       und die Startseite danach zeigt es. Bis 24.09.2026 kam zusaetzlich
       „Abgemeldet" als Info-Karte, ueber sessionStorage durch das Neuladen
       gerettet — dieselbe Nachricht zweimal. */
    window.setTimeout(() => {
      void signOut().catch(() => {
        /* clearPremiumAccess wirft bei einem fehlgeschlagenen Request —
           AuthContext reicht den Fehler bewusst an den Aufrufer durch.
           Ohne diesen Zweig bliebe der Wartescreen als fixed-Layer ueber
           der Seite stehen, ohne Schliessweg: angemeldet, aber vom
           eigenen Profil ausgesperrt. */
        setSigningOut(false);
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
        <MapDataNotice error={mapDataError} hasData={hasMapData} onRetry={refetchMapData} />

        <div className={`hv-wrap ${styles.profileTop}`}>
          <ProfileHeader
            name={firstName}
            avatarIdx={avatarIdx}
            onPick={() => setPickerOpen(true)}
          />
          <ProfileNavigation tab={tab} onChange={pickTab} />
        </div>
        <div
          className={`hv-wrap ${styles.tabPanel}`}
          id="profile-panel-deck"
          role="tabpanel"
          aria-labelledby="profile-tab-deck"
          hidden={tab !== 'deck'}
          tabIndex={0}
        >
          <ProfileAlbum
            mustEats={ownedMustEats}
            faceUpIds={unlockedIds}
            stampedIds={storedUnlockedIds}
            groupOf={(m) =>
              districtByRest.get(m.restaurant._id) ?? m.restaurant.district ?? FALLBACK_DISTRICT
            }
            nextMove={
              <ProfileNextMove
                mustEats={ownedMustEats}
                faceUpIds={unlockedIds}
                districtByRest={districtByRest}
              />
            }
          />
          {tab === 'deck' && (
            <>
              {/* Direkt unter dem Deck, nicht am Seitenende (Nutzer, 04.09.2026:
            „ist der Knopf da unten irgendwie versteckt? Vielleicht muss der
            kleiner sein, unter dem Deck"). Geteilt wird das Deck — die
            Aufforderung dazu stand vier Bildschirme davon entfernt, hinter
            den gespeicherten Spots und den Packs, und war der letzte Block
            vor dem Fuss. */}
              <section className={styles.deckInvite}>
                <ProfileInvite uid={user.uid} cards={inviteCards} />
              </section>

              {/* Direkt darunter, weil es die Antwort auf den Kasten darueber ist:
            dort wird gebeten, hier stehen die, die gekommen sind. Rendert
            nichts, solange niemand da ist. */}
              <ProfileFriends uid={user.uid} />

              <ProfileRecentReveals mustEats={ownedMustEats} unlockedAt={unlockedAt} />
            </>
          )}
        </div>
        <div
          className={`hv-wrap ${styles.tabPanel}`}
          id="profile-panel-spots"
          role="tabpanel"
          aria-labelledby="profile-tab-spots"
          hidden={tab !== 'spots'}
          tabIndex={0}
        >
          {tab === 'spots' && (
            <section className={styles.section}>
              <div className={`hv-head ${styles.head}`}>
                <h2 className={styles.sectionTitle}>{t('savedHeading')}</h2>
              </div>
              <ProfileSpots uid={user.uid} restaurantSlugs={ownedRestaurantSlugs} />
            </section>
          )}
        </div>
        <div
          className={`hv-wrap ${styles.tabPanel}`}
          id="profile-panel-packs"
          role="tabpanel"
          aria-labelledby="profile-tab-packs"
          hidden={tab !== 'packs'}
          tabIndex={0}
        >
          {tab === 'packs' && (
            <section className={styles.section}>
              <ProfilePacks uid={user.uid} fullCatalog={fullCatalog} />
            </section>
          )}
        </div>
        <div
          className={`hv-wrap ${styles.tabPanel}`}
          id="profile-panel-account"
          role="tabpanel"
          aria-labelledby="profile-tab-account"
          hidden={tab !== 'account'}
          tabIndex={0}
        >
          {tab === 'account' && (
            <ProfileAccount
              name={user.displayName ?? ''}
              email={user.email}
              onSaveName={updateDisplayName}
              onPickAvatar={() => setPickerOpen(true)}
              onSignOut={handleSignOut}
            />
          )}
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
