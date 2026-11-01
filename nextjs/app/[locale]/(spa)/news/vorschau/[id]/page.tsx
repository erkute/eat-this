import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { loadNewsPreview } from '@/lib/admin/newsPreview.server';
import { getAllNewsArticles } from '@/lib/sanity.server';
import NewsArticleShell from '@/app/components/NewsArticleShell';
import { ArticleMustEatProvider } from '@/app/components/ArticleMustEatArtwork';
import { prepareArticleMustEats } from '@/lib/article-must-eats.server';
import styles from './page.module.css';

// Vorschau eines Artikels aus dem Studio, bevor er veröffentlicht ist. Der
// Link kommt aus dem „Vorschau“-Knopf am Artikel (studio/actions); die Seite
// rendert den Schnappschuss, den /api/admin/news-preview abgelegt hat.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const a = await loadNewsPreview(id);
  const title = a ? (locale === 'de' ? a.titleDe || a.title : a.title) : undefined;
  return {
    title: title ? `Vorschau: ${title}` : 'Vorschau',
    robots: { index: false, follow: false },
  };
}

export default async function NewsPreviewPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [a, relatedArticles] = await Promise.all([loadNewsPreview(id), getAllNewsArticles()]);
  if (!a) notFound();
  const { article: preparedArticle, initialData: mustEatData } = await prepareArticleMustEats(a, locale);

  const article = (
    <NewsArticleShell
      article={preparedArticle}
      relatedArticles={relatedArticles.filter((r) => r._id !== a._id)}
      locale={locale}
      isActive
    />
  );

  return (
    <>
      <p className={styles.banner} role="status">
        {locale === 'de' ? 'Vorschau · nicht veröffentlicht' : 'Preview · not published'}
      </p>
      {mustEatData ? <ArticleMustEatProvider initialData={mustEatData}>{article}</ArticleMustEatProvider> : article}
    </>
  );
}
