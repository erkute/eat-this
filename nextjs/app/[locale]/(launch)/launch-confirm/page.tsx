import { setRequestLocale } from 'next-intl/server'
import LaunchConfirmClient from './LaunchConfirmClient'

/* Confirmation landing — handles ?token=... from the DOI email.
 * Lives inside the (launch) route group so it inherits the noindex
 * metadata from (launch)/layout.tsx. */
export default async function LaunchConfirmPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale: 'de' | 'en' = rawLocale === 'en' ? 'en' : 'de'
  setRequestLocale(rawLocale)

  return <LaunchConfirmClient locale={locale} />
}
