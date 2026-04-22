'use client';

import { useTranslation } from '@/lib/i18n';
import SiteFooter from './SiteFooter';

interface Props {
  isActive?: boolean;
}

// Empty shell for the news-article page. app.min.js's de()/ne()/dt()
// pipeline fills #newsModalTitle, #newsModalImg, #newsModalContent, etc.
// after CMS.fetchArticleBySlug resolves. When the article-rendering path
// moves to RSC, this component goes away along with the fetch in app.min.js.
export default function NewsArticleShell({ isActive = false }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={`app-page news-article-page${isActive ? ' active' : ''}`}
      data-page="news-article"
      id="newsModal"
      suppressHydrationWarning
    >
      <article className="news-article">
        <div className="news-article-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img id="newsModalImg" src="" alt="" />
        </div>
        <div className="news-article-body">
          <div className="news-article-meta">
            <span className="news-modal-category" id="newsModalCategory"></span>
            <time className="news-modal-date" id="newsModalDate"></time>
          </div>
          <h1 className="news-modal-title" id="newsModalTitle"></h1>
          <div className="news-modal-share" id="newsModalShare">
            <button className="share-btn share-twitter" id="shareTwitter" aria-label="Share on X">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button className="share-btn share-whatsapp" id="shareWhatsapp" aria-label="Share on WhatsApp">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </button>
            <button className="share-btn share-native" id="shareNative" aria-label="Share">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </div>
          <div className="news-modal-content" id="newsModalContent"></div>
        </div>
        <section className="news-article-more" id="newsArticleMore" hidden>
          <div className="news-article-more-inner">
            <p className="news-article-more-label">{t('news.more')}</p>
            <div className="news-article-more-grid" id="newsArticleMoreGrid"></div>
          </div>
        </section>
      </article>
      <SiteFooter />
    </div>
  );
}
