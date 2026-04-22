'use client';

import { useTranslation } from '@/lib/i18n';

export default function StartSections() {
  const { t } = useTranslation();
  return (
    <>
      <div className="start-scroll-hint">
        <div className="start-scroll-hint-line"></div>
        <div className="start-scroll-hint-text">Scroll</div>
      </div>

      <div className="start-section">
        <div className="start-editorial-row">
          <div className="start-editorial-text">
            <span className="start-section-label">{t('start.section1Label')}</span>
            <h2 className="start-section-title">{t('start.section1Title')}</h2>
            <p className="start-section-body">{t('start.section1Body')}</p>
          </div>
          <div className="start-img-wrap tall">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="startImg1"
              src="/pics/about/tablecard.webp"
              alt="Eat This Berlin"
              className="start-img"
              style={{ objectPosition: 'center 72%' }}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div className="start-section start-section--alt">
        <div className="start-editorial-row start-editorial-row--reverse">
          <div className="start-editorial-text">
            <span className="start-section-label">{t('start.section2Label')}</span>
            <h2 className="start-section-title">{t('start.section2Title')}</h2>
            <div className="start-section-body">
              <p>{t('start.section2Body1')}</p>
              <p>{t('start.section2Body2')}</p>
            </div>
          </div>
          <div className="start-img-wrap tall" id="cardsImgWrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="startImg2"
              src="/pics/about/cards.webp"
              alt="Must-Eat Cards"
              className="start-img"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div className="start-section">
        <span className="start-section-label">{t('start.section4Label')}</span>
        <div className="start-philo-list">
          <div className="start-philo-item">
            <div className="start-philo-num">01</div>
            <div>
              <div className="start-philo-title">{t('start.philo1Title')}</div>
              <div className="start-philo-text">{t('start.philo1Text')}</div>
            </div>
          </div>
          <div className="start-philo-item">
            <div className="start-philo-num">02</div>
            <div>
              <div className="start-philo-title">{t('start.philo2Title')}</div>
              <div className="start-philo-text">{t('start.philo2Text')}</div>
            </div>
          </div>
          <div className="start-philo-item">
            <div className="start-philo-num">03</div>
            <div>
              <div className="start-philo-title">{t('start.philo3Title')}</div>
              <div className="start-philo-text">{t('start.philo3Text')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="start-section">
        <div className="start-editorial-row">
          <div className="start-editorial-text">
            <span className="start-section-label">{t('start.section5Label')}</span>
            <h2 className="start-section-title">{t('start.section5Title')}</h2>
            <p className="start-section-body">{t('start.section5Body1')}</p>
          </div>
          <div className="start-img-wrap tall">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="startImg5"
              src="/pics/about/dinner.webp"
              alt="Curation process"
              className="start-img"
              style={{ objectPosition: 'center 60%' }}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div className="start-section start-section--alt">
        <span className="start-section-label">{t('start.section6Label')}</span>
        <h2 className="start-section-title">{t('start.section6Title')}</h2>
        <p className="start-section-body">{t('start.section6Body1')}</p>
      </div>

      {/* Newsletter form submission stays with app.min.js for now
          (IDs preserved so the legacy handler can bind). */}
      <section className="newsletter-section" id="newsletterSection">
        <p className="newsletter-eyebrow">{t('newsletter.eyebrow')}</p>
        <p className="newsletter-title">{t('newsletter.title')}</p>
        <p className="newsletter-sub">{t('newsletter.sub')}</p>
        <form className="newsletter-form" id="newsletterForm" noValidate>
          <input
            className="newsletter-input"
            id="newsletterEmail"
            type="email"
            placeholder={t('newsletter.placeholder')}
            autoComplete="email"
          />
          <button className="newsletter-btn" id="newsletterSubmit" type="submit">
            {t('newsletter.cta')}
          </button>
        </form>
        <p className="newsletter-error" id="newsletterError" hidden>
          {t('newsletter.error')}
        </p>
        <p className="newsletter-success" id="newsletterSuccess" hidden>
          {t('newsletter.success')}
        </p>
      </section>
    </>
  );
}
