'use client';

import { useTranslation } from '@/lib/i18n';
import LocaleLink from './LocaleLink';

export default function SiteFooter() {
  const { t, lang, setLang } = useTranslation();
  return (
    <div className="site-footer" role="contentinfo" aria-label="Site footer">
      <LocaleLink href="/" className="site-footer-logo-link" data-page="start" aria-label="Eat This home">
        <img
          src="/pics/logo2.webp"
          alt="EAT THIS"
          className="site-footer-logo-img"
          width={1815}
          height={576}
          loading="lazy"
          decoding="async"
        />
      </LocaleLink>
      <nav className="site-footer-links" aria-label="Footer navigation">
        <LocaleLink href="/about" className="site-footer-link" data-page="about">{t('footer.about')}</LocaleLink>
        <LocaleLink href="/contact" className="site-footer-link" data-page="contact">{t('footer.contact')}</LocaleLink>
        <LocaleLink href="/press" className="site-footer-link" data-page="press">{t('footer.press')}</LocaleLink>
        <span className="site-footer-divider" aria-hidden="true"></span>
        <LocaleLink href="/impressum" className="site-footer-link" data-page="impressum">{t('footer.impressum')}</LocaleLink>
        <LocaleLink href="/datenschutz" className="site-footer-link" data-page="datenschutz">{t('footer.datenschutz')}</LocaleLink>
        <LocaleLink href="/agb" className="site-footer-link" data-page="agb">{t('footer.agb')}</LocaleLink>
      </nav>
      <div className="site-footer-meta">
        <div className="site-footer-meta-row">
          <button type="button" className="theme-toggle" id="themeToggleFooter" aria-label="Toggle dark mode" suppressHydrationWarning>
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
            <button
              className={`site-footer-lang-btn${lang === 'de' ? ' active' : ''}`}
              data-lang="de"
              aria-label="Deutsch"
              onClick={() => setLang('de')}
              suppressHydrationWarning
            >
              DE
            </button>
            <button
              className={`site-footer-lang-btn${lang === 'en' ? ' active' : ''}`}
              data-lang="en"
              aria-label="English"
              onClick={() => setLang('en')}
              suppressHydrationWarning
            >
              EN
            </button>
          </div>
        </div>
      </div>
      <p className="site-footer-copy">{t('footer.copyright')}</p>
    </div>
  );
}
