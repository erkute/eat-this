import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { Bungee, Caveat, Knewave, Archivo_Black, Ranchers, Slackey } from 'next/font/google';
import { routing } from '@/i18n/routing';
import ClientIntlProvider from './ClientIntlProvider';

// Display family — Bar-Basta + Eat-This-poster direction:
// • Bungee (solid) = heavy block wordmark, fully filled. Section H2s.
// • Caveat = handwritten cursive script accent. Sparingly used.
// • Knewave = the brush-marker style that matches the "we tell you what
//   to eat" tagline baked into the hero EAT THIS poster. Used for section
//   eyebrows so the whole landing reads as one extended poster.
// All three exposed as CSS vars; consumers reference --font-display,
// --font-script, --font-marker in globals.css.
const bungee = Bungee({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bungee',
});
const caveat = Caveat({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-caveat',
});
const knewave = Knewave({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-knewave',
});
// Archivo Black — heavy grotesque used for Speisekarte-style headlines
// ("Booster Packs.", "Berlin's Must Eats.") that mirror the bold orange
// "Our Kitchen Section." treatment from the menu reference. Inter Black
// felt too generic; Archivo Black has the wider apertures + heavier stroke
// that read as a real menu masthead.
const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo-black',
});
// Ranchers — chunky rounded-slab condensed display used as the PacksSection
// masthead, pack names, block-header and stat-numbers. Western-saloon-sign
// energy that pairs with the EAT THIS roundel without competing.
const ranchers = Ranchers({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ranchers',
});
// Slackey — wonky cartoon display used exclusively for buy-CTAs in the
// PacksSection (price labels + "Gratis"). Brings playful sticker energy
// to the action chrome.
const slackey = Slackey({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-slackey',
});

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

// Hardcoded bootstrap constant (no user input) — safely inlined via script tag.
// Runs synchronously in <head>: sets data-theme, data-active-page (read by CSS
// selectors like [data-active-page="start"] .navbar:not(.scrolled)), locks
// portrait orientation on mobile, disables browser scroll restoration, and
// applies the _authHint pre-hydration login-button state.
const CRITICAL_BOOTSTRAP = `(function(){
  var s=localStorage.getItem('theme');
  var dark=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  var p=location.pathname;
  if(p==='/en'||p.indexOf('/en/')===0)p=p.slice(3)||'/';
  var slug;
  if(p==='/')slug='start';
  else if(p.indexOf('/news/')===0&&p.length>6)slug='news-article';
  else slug=p.replace(/^\\//,'').split('/')[0];
  document.documentElement.setAttribute('data-active-page',slug);
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  if(window.innerWidth<=767&&screen.orientation&&screen.orientation.lock){screen.orientation.lock('portrait').catch(function(){});}
  try{var ah=JSON.parse(localStorage.getItem('_authHint')||'null');if(ah&&ah.n){document.addEventListener('DOMContentLoaded',function(){var lb=document.getElementById('loginBtn');if(!lb)return;lb.classList.add('logged-in');var sp=lb.querySelector('span');if(sp)sp.textContent=ah.n;});}}catch(_){}
}());`;

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
    // suppressHydrationWarning: critical script mutates data-theme before hydration
    <html lang={locale} data-scroll-behavior="smooth" className={`${bungee.variable} ${caveat.variable} ${knewave.variable} ${archivoBlack.variable} ${ranchers.variable} ${slackey.variable}`} suppressHydrationWarning>
      <head>
        {/* Safe: hardcoded constant, no user input */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: CRITICAL_BOOTSTRAP }} />
      </head>
      <body>
        <ClientIntlProvider locale={locale} messages={messages}>
          {children}
          {modal}
        </ClientIntlProvider>
      </body>
    </html>
  );
}
