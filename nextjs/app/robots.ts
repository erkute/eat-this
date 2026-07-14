import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { isStaging } from '@/lib/env';

const AI_CRAWLER_USER_AGENTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'Bingbot',
] as const;

export default function robots(): MetadataRoute.Robots {
  if (isStaging) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  };
}
