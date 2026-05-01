import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { routing } from '@/i18n/routing';

interface RouterLike {
  replace: (href: string) => void;
}

// Reads users/{uid}.onboardedAt from Firestore and routes to /onboarding or
// /profile. Used by /login (after Google popup) and /welcome (after magic
// link). On read failure, defaults to /onboarding — better to repeat
// onboarding than to skip it for someone who needs it.
export async function postLoginRedirect(
  uid: string,
  router: RouterLike,
  locale: string,
): Promise<void> {
  let onboarded = false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    onboarded = snap.exists() && snap.data().onboardedAt != null;
  } catch (err) {
    console.warn('[postLoginRedirect] Firestore read failed, defaulting to /onboarding:', err);
  }
  const target = onboarded ? '/profile' : '/onboarding';
  const href   = locale === routing.defaultLocale ? target : `/${locale}${target}`;
  router.replace(href);
}
