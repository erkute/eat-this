'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { MODAL_BODIES, MODAL_CONTACT_EMAIL, type ModalBodySection } from '@/lib/i18n/translations';

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

// Cookie consent banner + cookie-info / AGB / Datenschutz modals.
// Banner show/hide and GA loader live here in React. Modal open/close still
// wired by app.min.js's me() helper using the IDs below — to be migrated next.
// Modal bodies are rendered as React JSX from MODAL_BODIES.
// agbTrigger + datenschutzTrigger are hidden buttons clicked programmatically
// by the welcomeModal signup flow (wmAgbTrigger → agbTrigger → agbModal open).
export default function CookieConsent() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

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
    setTimeout(flushPostBannerChrome, 350);
    setTimeout(loadGA, 600);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShow(false);
    setTimeout(flushPostBannerChrome, 350);
  };

  return (
    <>
      <div className={`cookie-consent${show ? ' show' : ''}`} id="cookieConsent">
        <div className="cookie-content">
          <p className="cookie-text">
            <span>{t('cookie.text')}</span>
            <button className="cookie-info-trigger" id="cookieInfoTrigger">
              {t('cookie.moreInfo')}
            </button>
          </p>
          <div className="cookie-buttons">
            <button
              className="cookie-btn cookie-btn-accept"
              id="cookieAccept"
              onClick={handleAccept}
            >
              {t('cookie.accept')}
            </button>
            <button
              className="cookie-btn cookie-btn-decline"
              id="cookieDecline"
              onClick={handleDecline}
            >
              {t('cookie.decline')}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden triggers — welcomeModal clicks these to open inline legal modals */}
      <button id="agbTrigger" hidden aria-hidden="true"></button>
      <button id="datenschutzTrigger" hidden aria-hidden="true"></button>

      {/* AGB modal */}
      <div className="login-modal" id="agbModal">
        <div className="login-modal-backdrop" id="agbBackdrop"></div>
        <div className="login-modal-content cookie-info-modal-content">
          <button className="login-modal-close" id="agbClose" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="cookie-info-title">{t('modals.agb.title')}</h2>
          <ModalBody sections={MODAL_BODIES.agb} />
        </div>
      </div>

      {/* Datenschutz modal — also opened inline during signup via wmDatenschutzTrigger */}
      <div className="login-modal" id="datenschutzModal">
        <div className="login-modal-backdrop" id="datenschutzBackdrop"></div>
        <div className="login-modal-content cookie-info-modal-content">
          <button className="login-modal-close" id="datenschutzClose" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="cookie-info-title">{t('modals.datenschutz.title')}</h2>
          <ModalBody sections={MODAL_BODIES.datenschutz} />
        </div>
      </div>

      {/* Cookie info modal */}
      <div className="login-modal" id="cookieInfoModal">
        <div className="login-modal-backdrop" id="cookieInfoBackdrop"></div>
        <div className="login-modal-content cookie-info-modal-content">
          <button className="login-modal-close" id="cookieInfoClose" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="cookie-info-title">{t('modals.cookies.title')}</h2>
          <ModalBody sections={MODAL_BODIES.cookies} />
        </div>
      </div>
    </>
  );
}
