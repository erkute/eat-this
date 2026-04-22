'use client';

import { useTranslation } from '@/lib/i18n';

// Cookie consent banner + cookie-info / AGB / Datenschutz modals.
// app.min.js wires all button IDs. Modal bodies are rendered from the hardcoded
// translations constant — safe to inject as HTML (not user input).
// agbTrigger + datenschutzTrigger are hidden buttons clicked programmatically
// by the welcomeModal signup flow (wmAgbTrigger → agbTrigger → agbModal open).
export default function CookieConsent() {
  const { t } = useTranslation();
  return (
    <>
      <div className="cookie-consent" id="cookieConsent">
        <div className="cookie-content">
          <p className="cookie-text">
            <span>{t('cookie.text')}</span>
            <button className="cookie-info-trigger" id="cookieInfoTrigger">
              {t('cookie.moreInfo')}
            </button>
          </p>
          <div className="cookie-buttons">
            <button className="cookie-btn cookie-btn-accept" id="cookieAccept">
              {t('cookie.accept')}
            </button>
            <button className="cookie-btn cookie-btn-decline" id="cookieDecline">
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
          {/* body filled by i18n.min.js via data-i18n-html */}
          <div className="cookie-info-body" data-i18n-html="modals.agb.body"></div>
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
          {/* body filled by i18n.min.js via data-i18n-html */}
          <div className="cookie-info-body" data-i18n-html="modals.datenschutz.body"></div>
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
          {/* body filled by i18n.min.js via data-i18n-html */}
          <div className="cookie-info-body" data-i18n-html="modals.cookies.body"></div>
        </div>
      </div>
    </>
  );
}
