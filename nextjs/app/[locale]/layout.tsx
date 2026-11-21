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
import PageInsightTracker from '@/app/components/PageInsightTracker';
import AnalyticsPageViews from '@/app/components/AnalyticsPageViews';
import WebVitalsReporter from '@/app/components/WebVitalsReporter';
import { buildSiteJsonLd } from '@/lib/json-ld';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Hardcoded bootstrap constant (no user input), safely inlined via script tag.
// Runs synchronously in <head> and, before first paint:
// - sets data-active-page (read by CSS selectors like [data-active-page="map"]
//   .app-pages) and locks portrait orientation on mobile,
// - marks a sign-in link from the mail (data-email-link), so the confirmation
//   board (EmailLinkSignIn) comes first and what opens by itself waits until it
//   closes (lib/auth/emailLinkPending.ts),
// - marks a freshly loaded article (data-article-intro, only on a real, visible
//   load; lib/articleMotion.ts drops the mark),
// - restores the shared theme (lib/theme.ts),
// - starts the home page at the top on every load (scrollRestoration; Safari
//   restores the old position before hydration otherwise, also with an anchor
//   left in the address bar),
// - applies the _authHint data-auth flag on <html>, so signed-in-only and
//   anon-only blocks hide before paint.
// It also strips attributes browser extensions inject (bis_skin_checked). It
// never mutates React-owned text: a stale hint must not create a hydration
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
  var emailLink=/[?&]mode=signIn(&|$)/.test(location.search)&&/[?&]oobCode=[^&]/.test(location.search);
  if(emailLink)document.documentElement.setAttribute('data-email-link','');
  try{if(slug==='news-article'&&document.visibilityState==='visible'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-article-intro','');}catch(_){}
  try{if(localStorage.getItem('et-theme')==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(_){}
  // CSS discovers the paper background too late on textured pages.
  // Use the restored theme so the other palette is never preloaded as well.
  if(slug!=='start'&&slug!=='map'&&slug!=='news'&&slug!=='news-article'&&slug!=='restaurant'){
    var paper=['/pics/vintage/paper-grain.webp?v=4',document.documentElement.getAttribute('data-theme')==='dark'?'/pics/vintage/section-wear-dark-light.webp?v=4':'/pics/vintage/section-wear-light.webp?v=4'];
    paper.forEach(function(src){var link=document.createElement('link');link.rel='preload';link.as='image';link.fetchPriority='high';link.href=src;document.head.appendChild(link);});
  }
  try{if(slug==='start'&&'scrollRestoration' in history)history.scrollRestoration='manual';}catch(_){}
  try{if(slug==='start'&&location.hash){var nv=performance.getEntriesByType('navigation')[0];if(nv&&nv.type==='reload')history.replaceState(history.state,'',location.pathname+location.search);}}catch(_){}
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
      data-vintage=""
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20261114" />
        <link rel="icon" type="image/png" sizes="48x48" href="/pics/favicon-48.png?v=20261114" />
        <link rel="icon" type="image/png" sizes="192x192" href="/pics/favicon-192.png?v=20261114" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20261114" />
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        {/* Both text weights are used above the fold; start them before CSS discovers them. */}
        <link rel="preload" href="https://use.typekit.net/af/912d1e/00000000000000007735bb33/31/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&amp;fvd=n4&amp;v=3" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="https://use.typekit.net/af/2288cb/00000000000000007735bb39/31/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&amp;fvd=n7&amp;v=3" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.sanity.io" />
        {/* Safe: hardcoded constants only. */}
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
          <WebVitalsReporter />
          <PageInsightTracker />
          {children}
        </ClientIntlProvider>
      </body>
    </html>
  );
}
