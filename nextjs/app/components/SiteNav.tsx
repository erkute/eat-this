'use client';

import { useTranslation } from '@/lib/i18n';

export default function SiteNav() {
  const { t } = useTranslation();
  return (
    <>
      <a href="#appPages" className="skip-link">{t('a11y.skip')}</a>
      <nav className="navbar" id="navbar">
        <a href="#" className="navbar-brand" data-page="start">
          <img
            src="/pics/eat.webp"
            alt="EAT THIS"
            className="brand-logo"
            width={36}
            height={36}
            decoding="async"
          />
        </a>
        <div className="navbar-actions">
          <button className="navbar-icon-btn" id="navNewsBtn" aria-label="News" suppressHydrationWarning>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
            </svg>
          </button>
          <button className="navbar-icon-btn" id="navMapBtn" aria-label="Map" suppressHydrationWarning>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
          </button>
          <button className="navbar-icon-btn" id="navMustsBtn" aria-label="Eat This" suppressHydrationWarning>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
              <path d="M7 2v20"/>
              <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
            </svg>
          </button>
          <button className="navbar-icon-btn" id="navProfileBtn" aria-label="Profile" suppressHydrationWarning>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          <button className="burger-btn" id="burgerBtn" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>
    </>
  );
}
