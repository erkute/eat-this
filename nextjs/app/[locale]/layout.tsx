import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { Bungee, Caveat, Knewave, Archivo_Black, Ranchers, Slackey, Barlow_Condensed, Bowlby_One, Saira_Condensed, Permanent_Marker, Anton } from 'next/font/google';
import { routing } from '@/i18n/routing';
import ClientIntlProvider from './ClientIntlProvider';
import { StagingBanner } from '@/app/components/StagingBanner';
import ReferralToastListener from '@/app/components/ReferralToastListener';
import { isStaging } from '@/lib/env';

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
// Barlow Condensed — modern condensed grotesque, multi-weight. Used at
// Light 300 for the Voices testimonials so the quotes feel like the
// condensed Ranchers wordmark family visually but with a much thinner
// stroke than Ranchers' single 400 weight.
const barlowCondensed = Barlow_Condensed({
  weight: ['300', '400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-barlow-condensed',
});
// Bowlby One — heavy, rounded, condensed display sans. Matches the EAT THIS
// wordmark letterforms (same family: heavy stems, rounded terminals,
// condensed proportions, tall ascenders). Used as the universal landing
// display font so every section reads as one EAT THIS poster.
const bowlbyOne = Bowlby_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bowlby-one',
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
// Permanent Marker — fett wie ein Edding, Sharpie-Stil. Genau die
// Marker-Brand-Stimme für Slogan + Sprechblase (frech, dick, kein Pen).
const permanentMarker = Permanent_Marker({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-permanent-marker',
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
    <html lang={locale} data-scroll-behavior="smooth" className={`${bungee.variable} ${caveat.variable} ${knewave.variable} ${archivoBlack.variable} ${ranchers.variable} ${slackey.variable} ${barlowCondensed.variable} ${bowlbyOne.variable} ${sairaCondensed.variable} ${permanentMarker.variable} ${anton.variable}`} suppressHydrationWarning>
      <head>
        {/* Safe: hardcoded constant, no user input */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: CRITICAL_BOOTSTRAP }} />
      </head>
      <body data-env={isStaging ? 'staging' : 'production'}>
        <StagingBanner />
        <ClientIntlProvider locale={locale} messages={messages}>
          <ReferralToastListener />
          {children}
          {modal}
        </ClientIntlProvider>
      </body>
    </html>
  );
}
