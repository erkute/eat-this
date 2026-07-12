import { PortableTextRenderer } from '@/lib/PortableTextRenderer'
import type { StaticPageDoc } from '@/lib/types'
import SiteFooter from './SiteFooter'
import styles from './StaticPages.module.css'

function pageId(slug: string) {
  return 'staticPage' + slug.charAt(0).toUpperCase() + slug.slice(1)
}

export default function StaticPages({ doc, locale }: { doc: StaticPageDoc; locale: 'de' | 'en' }) {
  const id = pageId(doc.slug)

  return (
    <main className={styles.page} data-page={doc.slug} id={id}>
      <div className={styles.inner}>
        <p className={styles.kicker}>{locale === 'de' ? 'Auf dem Teller' : 'On the plate'}</p>
        <h1 className={styles.title} id={`${id}-title`}>{doc.title || ''}</h1>
        <div className={styles.body} id={`${id}-body`}>
          <PortableTextRenderer blocks={doc.body || []} />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
