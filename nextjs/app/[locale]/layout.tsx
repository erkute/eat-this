import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import ClientIntlProvider from './ClientIntlProvider';

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
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
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
