import { getFeaturedSpots } from '@/lib/sanity.server'

export interface EmailRestaurant {
  name:  string
  photo: string
  meta:  string
}

/**
 * A few editorial spots for the login email's appetite row.
 *
 * Best-effort by design: any failure (Sanity slow/down) returns `[]` so the
 * email — and the login flow that sends it — never depends on the CMS being up.
 * Reuses the landing's `getFeaturedSpots` resolver (featured → must-eat-count
 * fallback) and re-sizes its editorial w=800 image down to an email thumb.
 */
export async function getEmailRestaurants(limit = 4): Promise<EmailRestaurant[]> {
  try {
    const spots = await getFeaturedSpots(limit)
    return spots
      .filter((s) => s.photo && s.name)
      .slice(0, limit)
      .map((s) => ({
        name:  s.name,
        photo: s.photo!.replace(/\?w=\d+.*$/, '?w=320&h=240&fit=crop&auto=format&q=70'),
        meta:  s.cuisineType?.trim() || s.district || '',
      }))
  } catch {
    return []
  }
}
