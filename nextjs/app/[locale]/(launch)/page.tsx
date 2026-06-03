import { redirect } from '@/i18n/navigation'

// `/` is now the app home: always redirect to the `/home` Hub. The old
// launch holding page (cat video + waitlist signup) has been retired —
// the Hub is the start page everywhere this branch ships.
export default async function LaunchPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale: 'de' | 'en' = rawLocale === 'en' ? 'en' : 'de'
  redirect({ href: '/home', locale })
}
