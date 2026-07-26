import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { DM_Sans } from 'next/font/google';
import { routing } from '@/i18n/routing';
import ClientIntlProvider from './ClientIntlProvider';
import ReferralToastListener from '@/app/components/ReferralToastListener';
import NotificationToast from '@/app/components/NotificationToast';
import ScrollRestorer from '@/app/components/ScrollRestorer';
import AnalyticsPageViews from '@/app/components/AnalyticsPageViews';
import { buildSiteJsonLd } from '@/lib/json-ld';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});
const PROVIDENCE_REGULAR_WOFF2 =
  'https://use.typekit.net/af/4b2e2d/0000000000000000773599f0/31/l?subset_id=2&fvd=n4&v=3';
const PROVIDENCE_BOLD_WOFF2 =
  'https://use.typekit.net/af/98d132/0000000000000000773599ea/31/l?subset_id=2&fvd=n7&v=3';
const TYPEKIT_STYLESHEET = 'https://use.typekit.net/kgb1lmh.css';

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

// Hardcoded bootstrap constant (no user input) — safely inlined via script tag.
// Runs synchronously in <head>: sets data-active-page (read by CSS selectors
// like [data-active-page="map"] .app-pages), locks portrait orientation on mobile,
// and applies the _authHint pre-hydration data-auth flag on <html> so
// signed-in-only/anon-only blocks can hide before paint. It deliberately does
// not mutate React-owned text: a stale hint must never create a hydration
// mismatch before Firebase resolves the real identity.
const CRITICAL_BOOTSTRAP = `(function(){
  var extensionAttrs=['bis_skin_checked'];
  function cleanExtensionAttrs(root){try{if(!root||root.nodeType!==1)return;for(var i=0;i<extensionAttrs.length;i++)root.removeAttribute(extensionAttrs[i]);var nodes=root.querySelectorAll?root.querySelectorAll('[bis_skin_checked]'):[];for(var j=0;j<nodes.length;j++){for(var k=0;k<extensionAttrs.length;k++)nodes[j].removeAttribute(extensionAttrs[k]);}}catch(_){}}
  cleanExtensionAttrs(document.documentElement);
  try{var observer=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var m=mutations[i];if(m.type==='attributes')cleanExtensionAttrs(m.target);for(var j=0;j<m.addedNodes.length;j++)cleanExtensionAttrs(m.addedNodes[j]);}});observer.observe(document.documentElement,{attributes:true,attributeFilter:extensionAttrs,childList:true,subtree:true});window.addEventListener('load',function(){setTimeout(function(){observer.disconnect();cleanExtensionAttrs(document.documentElement);},3000);},{once:true});}catch(_){}
  var p=location.pathname;
  if(p==='/en'||p.indexOf('/en/')===0)p=p.slice(3)||'/';
  var slug;
  if(p==='/')slug='start';
  else if(p.indexOf('/news/')===0&&p.length>6)slug='news-article';
  else slug=p.replace(/^\\//,'').split('/')[0];
  document.documentElement.setAttribute('data-active-page',slug);
  if(window.innerWidth<=767&&screen.orientation&&screen.orientation.lock){screen.orientation.lock('portrait').catch(function(){});}
  try{var ah=JSON.parse(localStorage.getItem('_authHint')||'null');if(ah&&ah.n)document.documentElement.setAttribute('data-auth','1');}catch(_){}
  var fontCss=document.getElementById('et-adobe-fonts');
  if(fontCss){var applyFonts=function(){fontCss.media='all';};if(fontCss.sheet)applyFonts();else fontCss.addEventListener('load',applyFonts,{once:true});}
}());`;

const GLOBAL_JSON_LD = {
  de: buildSiteJsonLd('de'),
  en: buildSiteJsonLd('en'),
} as const

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
  const activeLocale = locale === 'en' ? 'en' : 'de';
  const messages = await getMessages();

  return (
    // suppressHydrationWarning: critical script mutates data-active-page before hydration
    <html lang={locale} data-scroll-behavior="smooth" className={dmSans.variable} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="preload" href={PROVIDENCE_REGULAR_WOFF2} as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href={PROVIDENCE_BOLD_WOFF2} as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* The font files are critical and preloaded above; Adobe's CSS is not.
            Loading it with print media keeps the third-party stylesheet out of
            the render path. CRITICAL_BOOTSTRAP switches it on after it arrives. */}
        <link rel="preload" href={TYPEKIT_STYLESHEET} as="style" />
        <link
          id="et-adobe-fonts"
          rel="stylesheet"
          href={TYPEKIT_STYLESHEET}
          media="print"
          suppressHydrationWarning
        />
        <noscript>
          <link rel="stylesheet" href={TYPEKIT_STYLESHEET} />
        </noscript>
        {/* Safe: hardcoded constant, no user input */}
        <script dangerouslySetInnerHTML={{ __html: CRITICAL_BOOTSTRAP }} />
      </head>
      <body suppressHydrationWarning>
        <script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: GLOBAL_JSON_LD[activeLocale] }}
        />
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
