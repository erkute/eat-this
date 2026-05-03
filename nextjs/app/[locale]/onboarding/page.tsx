'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import {
  defaultAvatarFromUid,
  useUserProfile,
  type AvatarChoice,
} from '@/lib/firebase/useUserProfile';
import { usePack } from '@/lib/firebase/usePack';
import { usePackCards } from '@/lib/firebase/usePackCards';
import { routing } from '@/i18n/routing';
import OnboardingFlow from './OnboardingFlow';

export default function OnboardingPage() {
  const { user, loading, updateDisplayName } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const { profile, loading: profileLoading, setAvatar, markOnboarded } = useUserProfile(user?.uid ?? null);
  // Welcome pack — created by onUserCreate trigger on signup. Slide 4's
  // choreography needs the 10 mustEat IDs to resolve to image URLs.
  const pack = usePack(user?.uid ?? null);
  const packIds = pack.status === 'ready' ? pack.pack.mustEatIds : null;
  const packCardsState = usePackCards(packIds);
  const packCards =
    packCardsState.status === 'ready' ? packCardsState.images : null;

  const profileHref = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
  const loginHref   = locale === routing.defaultLocale ? '/login'   : `/${locale}/login`;

  // Guard: signed-out → /login. Already onboarded → /profile.
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace(loginHref); return; }
    if (profileLoading) return;
    if (profile.onboardedAt != null) { router.replace(profileHref); return; }
  }, [user, loading, profile.onboardedAt, profileLoading, router, loginHref, profileHref]);

  const onUpdateName = useCallback(async (name: string) => {
    try { await updateDisplayName(name); } catch { /* non-fatal */ }
  }, [updateDisplayName]);

  const onSetAvatar = useCallback(async (choice: AvatarChoice) => {
    try { await setAvatar(choice); } catch { /* non-fatal */ }
  }, [setAvatar]);

  const onFinish = useCallback(async () => {
    try { await markOnboarded(); }
    catch (err) { console.warn('[onboarding] markOnboarded failed:', err); }
    router.replace(profileHref);
  }, [markOnboarded, router, profileHref]);

  if (loading || !user || profileLoading || profile.onboardedAt != null) return null;

  const initialName   = user.displayName?.trim() ?? '';
  const initialAvatar = profile.avatar ?? defaultAvatarFromUid(user.uid);

  return (
    <OnboardingFlow
      initialName={initialName}
      initialAvatar={initialAvatar}
      packCards={packCards}
      onUpdateName={onUpdateName}
      onSetAvatar={onSetAvatar}
      onFinish={onFinish}
    />
  );
}
