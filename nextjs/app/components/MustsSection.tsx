'use client';

import { useTranslation } from '@/lib/i18n';
import SiteFooter from './SiteFooter';

interface Props {
  isActive?: boolean;
}

// Shell for the Must-Eats album page. The card grid inside `#albumGrid` is
// populated client-side by app.min.js's `_renderAlbum` — this component only
// provides the DOM contract (#albumGrid, #albumProgCount). Migrate the
// renderer itself in a later Phase B step.
export default function MustsSection({ isActive = false }: Props) {
  const { t } = useTranslation();
  return (
    <div className={`app-page${isActive ? ' active' : ''}`} data-page="musts" suppressHydrationWarning>
      <section className="must-eats-section" id="must-eats">
        <div className="must-eats-header">
          <p className="section-label reveal">{t('musts.sectionLabel')}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/logo2.webp"
            alt="EAT THIS"
            className="must-eats-logo-img"
            width={1815}
            height={576}
            loading="lazy"
            decoding="async"
          />
          <div className="album-head-count">
            <span className="album-head-n" id="albumProgCount">0</span>
            <span className="album-head-total">/ 150</span>
          </div>
        </div>

        <div className="album-grid" id="albumGrid" suppressHydrationWarning>
          {/* populated client-side by app.min.js _renderAlbum */}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
