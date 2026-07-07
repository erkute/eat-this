'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import {
  defaultAvatarFromUid,
  useUserProfile,
  type AvatarChoice,
} from '@/lib/firebase/useUserProfile';
import MapIntentLink from './MapIntentLink';
import styles from './HubDeineWelt.module.css';

function isAvatarChoice(value: unknown): value is AvatarChoice {
  return value === 1 || value === 2 || value === 3;
}

export default function HubDeineWelt() {
  const locale = useLocale();
  const de = locale === 'de';
  const { user, loading } = useAuth();
  const { profile } = useUserProfile(user?.uid ?? null);
  const [authHint, setAuthHint] = useState<{ n?: string; a?: AvatarChoice } | null>(null);
  useEffect(() => {
    try {
      const hint = JSON.parse(window.localStorage.getItem('_authHint') || 'null') as {
        n?: string;
        a?: unknown;
      } | null;
      if (hint?.n) setAuthHint({ n: hint.n, ...(isAvatarChoice(hint.a) ? { a: hint.a } : {}) });
    } catch {}
  }, []);

  const firstName = user
    ? (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || null
    : authHint?.n ?? null;
  const greeting = firstName ? `Hey ${firstName}` : 'Hey';
  const avatarIndex =
    profile.avatar ??
    (user?.uid ? defaultAvatarFromUid(user.uid) : authHint?.a ?? 1);

  // Resolved logged-out → render nothing (the hero stays the first block).
  // While auth is still loading (SSR + pre-hydration) the static shell is
  // rendered for everyone, and globals.css hides it unless the pre-paint
  // data-auth flag (CRITICAL_BOOTSTRAP ← _authHint) marks a signed-in visitor.
  // That way returning users see the section from the first frame instead of
  // it popping in (and shifting the hub) once Firebase auth resolves — only
  // the first name swaps into the kicker, which doesn't move the layout.
  if (!loading && !user) return null;

  return (
    <section
      className={`homeV2 ${styles.hero}`}
      data-hub-deinewelt=""
      data-auth-only=""
      aria-label={de ? 'Deine Welt' : 'Your world'}
    >
      <div className={`hv-wrap ${styles.heroInner}`}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{greeting}</p>
          <h2 className={styles.headline}>{de ? 'Deine Map wartet.' : 'Your map is ready.'}</h2>
          <p className={styles.sub}>
            {de
              ? 'Direkt zu empfohlenen Spots um dich herum und empfohlenen Must Eats.'
              : 'Jump into recommended spots around you and recommended Must Eats.'}
          </p>

          <div className={styles.actions} aria-label={de ? 'Schnellzugriffe' : 'Quick actions'}>
            <MapIntentLink href="/map" rel="nofollow" className={`hv-btn ${styles.mapBtn}`}>
              {de ? 'Map öffnen' : 'Open map'}
            </MapIntentLink>
            <Link
              href="/profile"
              rel="nofollow"
              prefetch={false}
              className={`hv-link-underline ${styles.profileBtn}`}
            >
              <span>{de ? 'Profil' : 'Profile'}</span>
            </Link>
          </div>
        </div>

        <Link
          href="/profile"
          rel="nofollow"
          prefetch={false}
          className={styles.avatarLink}
          aria-label={de ? 'Profil mit Avatar öffnen' : 'Open profile with avatar'}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.avatarImg}
            src={`/pics/avatar/${avatarIndex}.webp?v=3`}
            alt=""
            draggable={false}
          />
        </Link>
      </div>
    </section>
  );
}
