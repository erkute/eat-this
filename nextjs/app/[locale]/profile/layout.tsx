import type { Metadata } from 'next';
import { siteLayout } from '@/app/components/SiteChrome';

export const metadata: Metadata = {
  title: 'Profil',
  robots: 'noindex, nofollow',
};

export default siteLayout({ footer: false });
