import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { welcomeLocale } from '@/lib/auth/welcomeLocale';
import { WELCOME_COPY } from './copy';
import WelcomeClient from './WelcomeClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Der Tab-Titel in der Sprache des Links.
 *
 * Er entsteht hier, auf dem Server, weil er im Client nicht zu halten war:
 * ein `document.title` aus dem Effekt setzte „Sign in", und Next schrieb 2 ms
 * spaeter seinen Metadaten-Titel „Anmeldung" zurueck (Staging, 22.09.2026 —
 * im Dev-Server fiel die Reihenfolge anders aus). Dieselbe Quelle wie der
 * Rest der Seite: `lang` in der Continue-URL, dann das NEXT_LOCALE-Cookie.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(key, first);
  }
  const locale = welcomeLocale(params.toString(), (await cookies()).toString());
  return { title: WELCOME_COPY[locale].docTitle };
}

export default function WelcomePage() {
  return <WelcomeClient />;
}
