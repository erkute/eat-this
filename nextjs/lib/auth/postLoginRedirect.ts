import { routing } from '@/i18n/routing';

interface RouterLike {
  replace: (href: string) => void;
}

// Routes to /profile after sign-in. Used by /login (Google popup) and
// /welcome (magic-link return). The previous onboarding gate was removed
// — every signed-in user now lands directly in their profile deck.
export async function postLoginRedirect(
  _uid: string,
  router: RouterLike,
  locale: string,
): Promise<void> {
  const href = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
  router.replace(href);
}
