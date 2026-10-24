import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import type { StaticPageDoc } from '@/lib/types';
import InfoPage from './InfoPage';

const TITLES: Record<string, { de: string; en: string }> = {
  impressum: { de: 'Impressum', en: 'Imprint' },
  datenschutz: { de: 'Datenschutz', en: 'Privacy' },
  agb: { de: 'AGB', en: 'Terms' },
};

export default function LegalPage({ doc, locale }: { doc: StaticPageDoc; locale: 'de' | 'en' }) {
  const title = TITLES[doc.slug]?.[locale] ?? doc.title;
  return (
    <InfoPage slug={doc.slug} title={title}>
      <PortableTextRenderer blocks={doc.body ?? []} />
    </InfoPage>
  );
}
