import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import type { PortableTextBlock, StaticPageDoc } from '@/lib/types';
import SiteFooter from './SiteFooter';
import styles from './ContactPage.module.css';

type Block = PortableTextBlock & {
  style?: string;
  listItem?: string;
  children?: { text?: string }[];
};

const textOf = (block: Block) => (block.children ?? []).map((span) => span.text ?? '').join('');
const isHeading = (block: Block) =>
  block._type === 'block' && !block.listItem && (block.style === 'h2' || block.style === 'h3');

/** The address and reply note stay in Sanity. Lift the standalone email into
 * the contact link; preserve every other block, including future additions. */
export default function ContactPage({ doc }: { doc: StaticPageDoc }) {
  const blocks = (doc.body ?? []) as Block[];
  const emailIndex = blocks.findIndex(
    (block) => block._type === 'block' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textOf(block).trim())
  );
  const email = emailIndex >= 0 ? textOf(blocks[emailIndex]).trim() : null;
  const content = emailIndex >= 0 ? blocks.slice(0, emailIndex) : blocks;
  const reply = emailIndex >= 0 ? blocks.slice(emailIndex + 1) : [];
  const firstHeading = content.findIndex(isHeading);
  const intro = firstHeading >= 0 ? content.slice(0, firstHeading) : content;
  const topics: Block[][] = [];
  for (const block of firstHeading >= 0 ? content.slice(firstHeading) : []) {
    if (isHeading(block)) topics.push([{ ...block, style: 'h2' }]);
    else topics.at(-1)?.push(block);
  }

  return (
    <main className={styles.page} data-page="contact" id="staticPageContact">
      <div className={styles.inner}>
        <header>
          <h1 className={styles.title} id="staticPageContact-title">
            {doc.title}
          </h1>
          <div className={styles.lead}>
            <PortableTextRenderer blocks={intro} />
          </div>
        </header>

        {email && (
          <div className={styles.contact}>
            <a className={styles.email} href={`mailto:${email}`}>
              {email}
            </a>
            {reply.length > 0 && (
              <div className={styles.reply}>
                <PortableTextRenderer blocks={reply} />
              </div>
            )}
          </div>
        )}

        {topics.length > 0 && (
          <div className={styles.topics}>
            {topics.map((topic, index) => (
              <section className={styles.topic} key={topic[0]._key ?? index}>
                <PortableTextRenderer blocks={topic} />
              </section>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
