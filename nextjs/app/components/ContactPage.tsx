import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import type { PortableTextBlock, StaticPageDoc } from '@/lib/types';
import InfoPage from './InfoPage';

type Block = PortableTextBlock & { children?: { text?: string }[] };
const textOf = (block: Block) => (block.children ?? []).map((span) => span.text ?? '').join('');

export default function ContactPage({ doc }: { doc: StaticPageDoc }) {
  const blocks = doc.body ?? [];
  const emailIndex = blocks.findIndex(
    (block) => block._type === 'block' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textOf(block).trim())
  );
  const email = emailIndex >= 0 ? textOf(blocks[emailIndex]).trim() : null;
  // Lift only the standalone address; render every remaining Sanity block in order.
  const body = blocks.filter((_, index) => index !== emailIndex).map((block) =>
    block._type === 'block' && (block.style === 'h2' || block.style === 'h3')
      ? { ...block, style: 'h2' }
      : block
  );
  return (
    <InfoPage
      slug={doc.slug}
      title={doc.title}
      contact={email ? <a href={`mailto:${email}`}>{email}</a> : undefined}
    >
      <PortableTextRenderer blocks={body} />
    </InfoPage>
  );
}
