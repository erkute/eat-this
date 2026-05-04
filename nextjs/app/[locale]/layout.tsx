import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import ClientIntlProvider from './ClientIntlProvider';

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

// Hardcoded bootstrap constant (no user input) — safely inlined via script tag.
const CRITICAL_BOOTSTRAP = `(function(){
  var s=localStorage.getItem('theme');
  var dark=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
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
