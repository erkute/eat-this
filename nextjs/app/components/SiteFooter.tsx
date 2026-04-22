'use client';

import { useTranslation } from '@/lib/i18n';

export default function SiteFooter() {
  const { t, lang } = useTranslation();
  return (
    <div className="site-footer" role="contentinfo" aria-label="Site footer">
      <a href="#" className="site-footer-logo-link" data-page="start" aria-label="Eat This home">
        <img
          src="/pics/logo2.webp"
          alt="EAT THIS"
          className="site-footer-logo-img"
          width={1815}
          height={576}
          loading="lazy"
          decoding="async"
        />
      </a>
      <nav className="site-footer-links" aria-label="Footer navigation">
        <button className="site-footer-link" data-page="about">{t('footer.about')}</button>
        <button className="site-footer-link" data-page="contact">{t('footer.contact')}</button>
        <button className="site-footer-link" data-page="press">{t('footer.press')}</button>
        <span className="site-footer-divider" aria-hidden="true"></span>
        <button className="site-footer-link" data-page="impressum">{t('footer.impressum')}</button>
        <button className="site-footer-link" data-page="datenschutz">{t('footer.datenschutz')}</button>
        <button className="site-footer-link" data-page="agb">{t('footer.agb')}</button>
      </nav>
      <div className="site-footer-meta">
        <div className="site-footer-meta-row">
          <button type="button" className="theme-toggle" id="themeToggleFooter" aria-label="Toggle dark mode">
            <span className="theme-toggle-track">
              <span className="theme-toggle-thumb"></span>
            </span>
            <span className="theme-toggle-label">{t('theme.darkMode')}</span>
          </button>
        </div>
        <div className="site-footer-meta-row">
          <a
            href="https://www.instagram.com/eatthisdotcom/"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer-ig"
            aria-label="Instagram @eatthisdotcom"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
            </svg>
            <span>@eatthisdotcom</span>
          </a>
          <div className="site-footer-lang" role="group" aria-label="Language / Sprache">
            <button className={`site-footer-lang-btn${lang === 'de' ? ' active' : ''}`} data-lang="de" aria-label="Deutsch">DE</button>
            <button className={`site-footer-lang-btn${lang === 'en' ? ' active' : ''}`} data-lang="en" aria-label="English">EN</button>
          </div>
        </div>
      </div>
      <p className="site-footer-copy">{t('footer.copyright')}</p>
    </div>
  );
}
