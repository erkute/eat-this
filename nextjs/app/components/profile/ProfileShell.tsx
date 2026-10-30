'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useUnlockedMustEats, useMapData } from '@/lib/map';
import { useFavorites } from '@/lib/map/useFavorites';
import { FALLBACK_DISTRICT } from '@/lib/profile/mustEatAlbum';
import {
  defaultAvatarFromUid,
  useUserProfile,
  type AvatarChoice,
} from '@/lib/firebase/useUserProfile';
import MapDataNotice from '../map/MapDataNotice';
import ProfileSpots from './ProfileSpots';
import ProfileNavigation, { PROFILE_TABS, type ProfileTab } from './ProfileNavigation';
import ProfileAccount from './ProfileAccount';
import ProfileAlbum from './ProfileAlbum';
import ProfilePacks from './ProfilePacks';
import ProfileRecentReveals from './ProfileRecentReveals';
import ProfileInvite from './ProfileInvite';
import ProfileFriends from './ProfileFriends';
import AvatarPickerModal from './AvatarPickerModal';
import SiteFooter from '../SiteFooter';
import styles from './Profile.module.css';

interface Props {
  /** Server-computed anon face-up set (the 10 curated cards). Publicly
   *  face-up cards stay face-up in the collection too. */
  publicFaceUpIds: string[];
}

export default function ProfileShell({ publicFaceUpIds }: Props) {
  const { user, loading: authLoading, signOut, updateDisplayName } = useAuth();
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
  // public face-up set (the 10 curated cards) so anything publicly revealed
  // is open in the collection too, even right after first signup.
  const { unlockedIds: storedUnlockedIds, unlockedAt } = useUnlockedMustEats(user?.uid ?? null);
  const { profile, setAvatar } = useUserProfile(user?.uid ?? null);
  const { favorites } = useFavorites(user?.uid ?? null);
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
  /* Der Zwischenspeicher malt zuerst, und dort sind nur die zehn öffentlichen
     Karten offen: die Zahl käme als „10 von 63" und spränge nach dem Abruf auf
     den echten Stand. Sie zeigt sich erst, wenn der erste Abruf dieses Besuchs
     durch ist — danach rechnet sie bei jedem neuen Abruf einfach weiter. */
  const sawFetch = useRef(false);
  const [freshData, setFreshData] = useState(false);
  useEffect(() => {
    if (mapDataLoading) sawFetch.current = true;
    else if (sawFetch.current) setFreshData(true);
  }, [mapDataLoading]);

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

  async function handleAvatarChange(choice: AvatarChoice) {
    if (choice === avatarIdx) return;
    await setAvatar(choice);
  }

  return (
    <>
      <main className={`homeV2 ${styles.page}`} data-menu>
        {/* Meldungen liegen als Layer über der Seite, nicht in ihr.

            Dieselbe Komponente wie auf der Map: sie kennt die vier Zustände
            (lädt, aktualisiert, Fehler, veraltet), wählt Ton und Zeichen und
            hängt den Wiederholen-Knopf an. Die Texte liegen im `map`-Namespace —
            es ist dieselbe /api/map-data-Antwort.

            Nur im Normalfall: der Zweig ganz ohne Kartendaten rendert weiter
            oben seine eigene Seite, und dort ist die Meldung der Inhalt. */}
        <MapDataNotice error={mapDataError} hasData={hasMapData} onRetry={refetchMapData} />

        <h1 className={styles.srOnly}>{t('pageTitle')}</h1>

        <div className={`hv-wrap ${styles.profileTop}`}>
          <ProfileNavigation tab={tab} onChange={pickTab} counts={{ spots: favorites.length }} />
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
            groupOf={(m) =>
              districtByRest.get(m.restaurant._id) ?? m.restaurant.district ?? FALLBACK_DISTRICT
            }
            countReady={freshData}
          />
          {tab === 'deck' && (
            <ProfileRecentReveals mustEats={ownedMustEats} unlockedAt={unlockedAt} />
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
              avatarIdx={avatarIdx}
              email={user.email}
              memberSince={user.metadata?.creationTime ?? null}
              onSaveName={updateDisplayName}
              onPickAvatar={() => setPickerOpen(true)}
              onSignOut={signOut}
              invite={
                <>
                  {/* „Zeig dein Deck“ steht im Konto-Reiter: das Deck wächst nach unten,
                      der Kasten bliebe darunter nicht zu finden. */}
                  <section className={styles.deckInvite}>
                    <ProfileInvite uid={user.uid} cards={inviteCards} />
                  </section>
                  {/* Direkt darunter: dort wird gebeten, hier stehen die, die
                      gekommen sind. Rendert nichts, solange niemand da ist. */}
                  <ProfileFriends uid={user.uid} />
                </>
              }
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
    </>
  );
}
