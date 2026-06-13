import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import { isStaging } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  if (isStaging) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  }
}
