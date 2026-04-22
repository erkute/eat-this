'use client';

import { useTranslation } from '@/lib/i18n';
import { MODAL_BODIES, MODAL_CONTACT_EMAIL, type ModalBodySection } from '@/lib/i18n/translations';

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
// app.min.js wires all button IDs. Modal bodies are now rendered as React JSX
// from the static MODAL_BODIES constant (no HTML injection, no i18n DOM fill).
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
