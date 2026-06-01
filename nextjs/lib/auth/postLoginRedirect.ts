import { routing } from '@/i18n/routing';

interface RouterLike {
  replace: (href: string) => void;
}

// Routes to /home after sign-in. Used by /login (Google popup) and
// /welcome (magic-link return). The hub's logged-in "Deine Welt" section sits
// at the top of /home, so signed-in users land back on the home hub.
export async function postLoginRedirect(
  _uid: string,
  router: RouterLike,
  locale: string,
): Promise<void> {
  const href = locale === routing.defaultLocale ? '/home' : `/${locale}/home`;
  router.replace(href);
}
