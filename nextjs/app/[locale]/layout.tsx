import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { DM_Sans, Saira_Condensed, Anton } from 'next/font/google';
import { routing } from '@/i18n/routing';
import ClientIntlProvider from './ClientIntlProvider';
import ReferralToastListener from '@/app/components/ReferralToastListener';
import NotificationToast from '@/app/components/NotificationToast';
import ScrollRestorer from '@/app/components/ScrollRestorer';
import AnalyticsPageViews from '@/app/components/AnalyticsPageViews';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/constants';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});
// Saira Condensed — heavy condensed grotesque used as the editorial-poster
// display font for the Map list rows + Detail v13. Drives the BAR BASTA-
// style coral hero headlines, mustard sticker chips, and the slim-row
// titles. Weights 800/900 carry the brand-poster mass.
const sairaCondensed = Saira_Condensed({
  weight: ['700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-saira-condensed',
});
// Anton — heavy condensed display sans, matches die Cover2-Headline
// „THE MAP FOR PEOPLE WHO CARE ABOUT FOOD." 1:1. Newspaper-Masthead-
// Typografie.
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-anton',
});

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

// Hardcoded bootstrap constant (no user input) — safely inlined via script tag.
// Runs synchronously in <head>: sets data-active-page (read by CSS selectors
// like [data-active-page="map"] .navbar), locks portrait orientation on mobile,
// and applies the _authHint pre-hydration
// login-button state plus a data-auth flag on <html> so signed-in-only/anon-only
// blocks can hide before paint.
const CRITICAL_BOOTSTRAP = `(function(){
  var p=location.pathname;
  if(p==='/en'||p.indexOf('/en/')===0)p=p.slice(3)||'/';
  var slug;
  if(p==='/')slug='start';
  else if(p.indexOf('/news/')===0&&p.length>6)slug='news-article';
  else slug=p.replace(/^\\//,'').split('/')[0];
  document.documentElement.setAttribute('data-active-page',slug);
  if(window.innerWidth<=767&&screen.orientation&&screen.orientation.lock){screen.orientation.lock('portrait').catch(function(){});}
  try{var ah=JSON.parse(localStorage.getItem('_authHint')||'null');if(ah&&ah.n){document.documentElement.setAttribute('data-auth','1');document.addEventListener('DOMContentLoaded',function(){var lb=document.getElementById('loginBtn');if(!lb)return;lb.classList.add('logged-in');var sp=lb.querySelector('span');if(sp)sp.textContent=(location.pathname==='/en'||location.pathname.indexOf('/en/')===0)?'Profile':'Profil';});}}catch(_){}
}());`;

// Sitewide Organization + WebSite schema. The Organization.logo is the
// square cream-on-black EAT THIS mark — this is the asset Google associates
// with the brand (knowledge panel / rich results). Static, no user input.
const ORG_JSON_LD = serializeJsonLd({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'EAT THIS',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/pics/logo.webp`,
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://www.instagram.com/eatthisdotcom/',
        'https://www.tiktok.com/@eatthis',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'EAT THIS',
      url: SITE_URL,
      inLanguage: 'de-DE',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
});

export default async function LocaleLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    // suppressHydrationWarning: critical script mutates data-active-page before hydration
    <html lang={locale} data-scroll-behavior="smooth" className={`${dmSans.variable} ${sairaCondensed.variable} ${anton.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/kgb1lmh.css" />
        {/* Safe: hardcoded constant, no user input */}
        <script dangerouslySetInnerHTML={{ __html: CRITICAL_BOOTSTRAP }} />
        <script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ORG_JSON_LD }}
        />
      </head>
      <body>
        <ClientIntlProvider locale={locale} messages={messages}>
          <ReferralToastListener />
          {/* Global toast (window.showNotification) — mounted here, not in the
              SPA layout, so /profile and /login get feedback too. Styled in
              globals.css (those routes don't load the SPA stylesheet). */}
          <NotificationToast />
          <ScrollRestorer />
          <AnalyticsPageViews />
          {children}
          {modal}
        </ClientIntlProvider>
      </body>
    </html>
  );
}
