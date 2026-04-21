import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Eat This Berlin',
    default: 'Eat This Berlin — Must-Eat Guide',
  },
  description: "The must-eat guide to Berlin's best dishes.",
  metadataBase: new URL('https://www.eatthisdot.com'),
}

// Runs before any CSS: sets data-theme and lang on <html> from localStorage/navigator.
// Content is a hardcoded constant — not user input, no XSS risk.
const criticalScript = `(function(){
  var s=localStorage.getItem('theme');
  var dark=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  var url=new URLSearchParams(window.location.search);
  var lang=url.get('lang');
  if(lang!=='de'&&lang!=='en')lang=localStorage.getItem('lang');
  if(lang!=='de'&&lang!=='en'){var nav=(navigator.language||'de').toLowerCase();lang=nav.indexOf('de')===0?'de':(nav.indexOf('en')===0?'en':'de');}
  localStorage.setItem('lang',lang);
  document.documentElement.lang=lang;
  try{var ah=JSON.parse(localStorage.getItem('_authHint')||'null');if(ah&&ah.n){document.addEventListener('DOMContentLoaded',function(){var lb=document.getElementById('loginBtn');if(!lb)return;lb.classList.add('logged-in');var sp=lb.querySelector('span');if(sp)sp.textContent=ah.n;});}}catch(_){}
}());`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: critical script mutates lang + data-theme before hydration
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: criticalScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
