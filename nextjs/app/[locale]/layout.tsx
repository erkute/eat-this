import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import ClientIntlProvider from './ClientIntlProvider';
import ReferralToastListener from '@/app/components/ReferralToastListener';
import SignInReward from '@/app/components/SignInReward';
import EmailLinkSignIn from '@/app/components/EmailLinkSignIn';
import NotificationToast from '@/app/components/NotificationToast';
import ScrollRestorer from '@/app/components/ScrollRestorer';
import AnalyticsPageViews from '@/app/components/AnalyticsPageViews';
import CookieConsent from '@/app/components/CookieConsent';
import { buildSiteJsonLd } from '@/lib/json-ld';
import { sans } from '@/app/fonts';

const PROVIDENCE_REGULAR_WOFF2 =
  'https://use.typekit.net/af/4b2e2d/0000000000000000773599f0/31/l?subset_id=2&fvd=n4&v=3';
const PROVIDENCE_BOLD_WOFF2 =
  'https://use.typekit.net/af/98d132/0000000000000000773599ea/31/l?subset_id=2&fvd=n7&v=3';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Hardcoded bootstrap constant (no user input) — safely inlined via script tag.
// Runs synchronously in <head>: sets data-active-page (read by CSS selectors
// like [data-active-page="map"] .app-pages), locks portrait orientation on mobile,
// marks the home page for its intro (data-hero-intro, HubSection.module.css —
// set here so the CSS animation starts with the first paint, not after hydration;
// the curtain itself waits for Remy's legs — data-remy-go, set by HeroCurtain
// once its mesh draws, at the latest after 3 s from here),
// marks a freshly loaded article the same way (data-article-intro,
// NewsArticleShell.module.css — only on a real load: an article opened from a
// magazine has the opening as its intro, and a tab loaded out of sight would
// never run it and keep the head blank; lib/articleMotion.ts drops the mark),
// restores a dark article (data-article-theme, lib/articleTheme.ts) on every
// page, so an article reached from inside the app is dark from its first frame,
// starts the home page at the top on every load (scrollRestoration — Safari
// restores the old position before hydration otherwise; Ansage 01.10.2026:
// „bei einem Reload fängt die Seite wieder oben an", the intro plays there —
// also with an anchor left in the address bar, e.g. #hub-starter from the
// Must-Eats onboarding: a reload drops it before the browser can jump),
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
  else if(p.indexOf('/bezirk/')===0&&p.length>8)slug='bezirk-detail';
  else slug=p.replace(/^\\//,'').split('/')[0];
  document.documentElement.setAttribute('data-active-page',slug);
  try{if(slug==='start'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.setAttribute('data-hero-intro','');setTimeout(function(){document.documentElement.setAttribute('data-remy-go','');},3000);}}catch(_){}
  try{if(slug==='news-article'&&document.visibilityState==='visible'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-article-intro','');}catch(_){}
  try{if(localStorage.getItem('et-article-theme')==='dark')document.documentElement.setAttribute('data-article-theme','dark');}catch(_){}
  try{if(slug==='start'&&'scrollRestoration' in history)history.scrollRestoration='manual';}catch(_){}
  try{if(slug==='start'&&location.hash){var nv=performance.getEntriesByType('navigation')[0];if(nv&&nv.type==='reload')history.replaceState(history.state,'',location.pathname+location.search);}}catch(_){}
  if(window.innerWidth<=767&&screen.orientation&&screen.orientation.lock){screen.orientation.lock('portrait').catch(function(){});}
  try{var ah=JSON.parse(localStorage.getItem('_authHint')||'null');if(ah&&ah.n)document.documentElement.setAttribute('data-auth','1');}catch(_){}
}());`;

const GLOBAL_JSON_LD = {
  de: buildSiteJsonLd('de'),
  en: buildSiteJsonLd('en'),
} as const;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const activeLocale = locale === 'en' ? 'en' : 'de';
  const messages = await getMessages();

  return (
    // suppressHydrationWarning: critical script mutates data-active-page before hydration
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={sans.variable}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link
          rel="preload"
          href={PROVIDENCE_REGULAR_WOFF2}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={PROVIDENCE_BOLD_WOFF2}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
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
          {/* Sagt nach der Anmeldung, was sie wert war. Hier und nicht in der
              Karte: eine Anmeldung kommt dort heraus, wo sie angefangen hat —
              Startseite, Spot-Seite, geteiltes Deck —, und der Schirm ist eine
              Fläche über der Seite, keine Kartenbeigabe. */}
          <SignInReward />
          {/* Der Link aus der Anmelde-Mail landet auf der Seite, auf der die
              Anmeldung begann — hier geht die Bestätigung auf. Vor
              AnalyticsPageViews: sie räumt Code und Adresse aus der URL. */}
          <EmailLinkSignIn />
          {/* Zentrale Info-Karte (lib/notice.ts) — hier und nicht im
              SPA-Layout, damit sie auf jeder Locale-Route erscheint. Styles in
              globals.css. */}
          <NotificationToast />
          <ScrollRestorer />
          <AnalyticsPageViews />
          {/* Auf JEDER Locale-Route, nicht nur im SPA-Layout — dort hing der
              Dialog bis 28.08.2026, und /restaurant, /kategorie, /bezirk,
              /packs, /profile und /checkout liegen daneben. Auf 35 % der
              Seitenaufrufe wurde also nie gefragt, und das sind genau die
              Seiten, auf denen die Google-Suche landet: GA konnte dort nie
              laden. Muss innerhalb von ClientIntlProvider stehen — der Dialog
              zieht seine Texte über next-intl. Styles dazu in globals.css. */}
          <CookieConsent />
          {children}
        </ClientIntlProvider>
      </body>
    </html>
  );
}
