export const SITE_URL = 'https://www.eatthisdot.com'

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (!configured) return SITE_URL
  try {
    return new URL(configured).origin
  } catch {
    return SITE_URL
  }
}
