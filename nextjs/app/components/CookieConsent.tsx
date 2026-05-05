'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { MODAL_CONTACT_EMAIL, type ModalBodySection } from '@/lib/i18n/translations';

// Cookie info sections — kept here (not in MODAL_BODIES) so the banner copy
// stays close to what's actually loaded by the site, and DE is properly
// translated rather than falling back to English.
const COOKIE_SECTIONS_DE: ModalBodySection[] = [
  {
    h: 'Notwendig',
    p: 'Wir speichern ein paar Daten lokal in deinem Browser, damit die Seite funktioniert — kein Tracking:',
    list: [
      { strong: 'Login-Session', text: ' — hält dich eingeloggt (Firebase Auth)' },
      { strong: 'Sprache & Theme', text: ' — merkt sich DE/EN und Dark Mode' },
      { strong: 'Cookie-Auswahl', text: ' — damit wir dich nicht nochmal fragen' },
    ],
  },
  {
    h: 'Statistik (nur bei Akzeptieren)',
    p: 'Google Analytics 4 — anonyme Seitenaufrufe und grobe Geräte-Infos. Kein Name, keine E-Mail, keine genaue Position. Lädt erst nach deinem Klick auf „Akzeptieren". Bei „Ablehnen" wird kein Tracking geladen.',
  },
  {
    h: 'Drittanbieter',
    p: 'Diese Dienste werden eingebunden, setzen aber keine Tracking-Cookies bei dir:',
    list: [
      { strong: 'Carto / MapLibre', text: ' — Kartenkacheln für die Food Map' },
      { strong: 'Sanity CDN', text: ' — Bilder und Inhalte' },
      { strong: 'Google Sign-In', text: ' — nur wenn du es nutzt; Google-Cookies liegen auf Googles Domain, nicht bei uns' },
    ],
  },
  {
    h: 'Cookies verwalten',
    p: 'Im Browser jederzeit löschbar. Banner zurückrufen: localStorage-Eintrag „cookieConsent" entfernen und neu laden.',
  },
  { h: 'Kontakt', p: 'Fragen? {mail}' },
];

const COOKIE_SECTIONS_EN: ModalBodySection[] = [
  {
    h: 'Necessary',
    p: 'We store small bits of data locally on your device so the site works as expected — no tracking:',
    list: [
      { strong: 'Login session', text: ' — keeps you signed in (Firebase Auth)' },
      { strong: 'Language & theme', text: ' — remembers DE/EN and dark mode' },
      { strong: 'Cookie choice', text: " — so we don't ask you again" },
    ],
  },
  {
    h: 'Analytics (only if you accept)',
    p: 'Google Analytics 4 — anonymized page views and basic device info. No name, no email, no precise location. Loaded only after you click Accept; Decline means no analytics ever load.',
  },
  {
    h: 'Third-party services',
    p: "These are loaded by the page but don't drop tracking cookies on you:",
    list: [
      { strong: 'Carto / MapLibre', text: ' — map tiles for the Food Map' },
      { strong: 'Sanity CDN', text: ' — photos and content' },
      { strong: 'Google Sign-In', text: " — only when you choose it; Google's cookies live on its domain, not ours" },
    ],
  },
  {
    h: 'Managing cookies',
    p: 'You can clear them in your browser any time, or remove the cookieConsent entry in localStorage to see this banner again.',
  },
  { h: 'Contact', p: 'Questions? {mail}' },
];

const GA_ID = 'G-8EWFYGPNTT';

function loadGA() {
  const w = window as Window & { __gaLoaded?: boolean; dataLayer?: unknown[] };
  if (w.__gaLoaded) return;
  w.__gaLoaded = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  w.dataLayer = w.dataLayer || [];
  const gtag = (...args: unknown[]) => w.dataLayer!.push(args);
  gtag('js', new Date());
  gtag('config', GA_ID);
}

// Refresh iOS Safari notch theme-color and recompute navbar.scrolled state
// after the banner slides out — both can drift while the banner is overlaying.
function flushPostBannerChrome() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', '#000000');
    requestAnimationFrame(() => meta.setAttribute('content', 'transparent'));
  }
  const navbar = document.querySelector('.navbar');
  if (navbar && document.documentElement.getAttribute('data-active-page') === 'start') {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }
}

// Renders a paragraph string, substituting {mail} with a mailto anchor.
function Paragraph({ text }: { text: string }) {
  if (!text.includes('{mail}')) return <p>{text}</p>;
  const [before, after] = text.split('{mail}');
  return (
    <p>
      {before}
      <a href={`mailto:${MODAL_CONTACT_EMAIL}`}>{MODAL_CONTACT_EMAIL}</a>
      {after}
    </p>
  );
}

function ModalBody({ sections }: { sections: ModalBodySection[] }) {
  return (
    <div className="cookie-info-body">
      {sections.map((s, i) => (
        <div key={i}>
          <h3>{s.h}</h3>
          <Paragraph text={s.p} />
          {s.list && (
            <ul>
              {s.list.map((item, j) => (
                <li key={j}>
                  <strong>{item.strong}</strong>
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// Cookie consent banner with inline expandable cookie-info section. No modal:
// "Mehr erfahren" expands the banner downward, COOKIE_SECTIONS content renders
// directly inside the dark glass card so colors stay cohesive. AGB/Datenschutz
// modals are gone — LoginPanel uses plain <a href> to /agb and /datenschutz.
export default function CookieConsent() {
  const { t, lang } = useTranslation();
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const sections = lang === 'de' ? COOKIE_SECTIONS_DE : COOKIE_SECTIONS_EN;

  // On mount: if user already accepted, load GA. If undecided, schedule the
  // banner to slide in after 1.5s. The delay matches the legacy timing so
  // the banner doesn't compete with the hero-intro animation for attention.
  useEffect(() => {
    const stored = localStorage.getItem('cookieConsent');
    if (stored === 'accepted') {
      loadGA();
      return;
    }
    if (stored) return;
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShow(false);
    setExpanded(false);
    setTimeout(flushPostBannerChrome, 350);
    setTimeout(loadGA, 600);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShow(false);
    setExpanded(false);
    setTimeout(flushPostBannerChrome, 350);
  };

  // Collapse the expanded info panel on outside-click or Escape — gives the
  // user a way to dismiss the disclosure without touching the trigger again.
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest('#cookieConsent')) {
        setExpanded(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  return (
    <div
      className={`cookie-consent${show ? ' show' : ''}${expanded ? ' expanded' : ''}`}
      id="cookieConsent"
      role="dialog"
      aria-label={t('cookie.text')}
    >
      <div className="cookie-content">
        <div className="cookie-text">
          <span>{t('cookie.text')}</span>
          <button
            type="button"
            className="cookie-info-trigger"
            id="cookieInfoTrigger"
            aria-expanded={expanded}
            aria-controls="cookieInfoPanel"
            onClick={() => setExpanded((e) => !e)}
          >
            {t('cookie.moreInfo')}
            <svg
              className="cookie-info-chevron"
              width={10}
              height={10}
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              aria-hidden="true"
            >
              <path d="M2 3.5L5 6.5L8 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="cookie-buttons">
          <button
            type="button"
            className="cookie-btn cookie-btn-decline"
            id="cookieDecline"
            onClick={handleDecline}
          >
            {t('cookie.decline')}
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn-accept"
            id="cookieAccept"
            onClick={handleAccept}
          >
            {t('cookie.accept')}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="cookie-expand" id="cookieInfoPanel">
          <ModalBody sections={sections} />
        </div>
      )}
    </div>
  );
}
