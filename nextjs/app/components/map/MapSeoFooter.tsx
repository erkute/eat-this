import { getMapSeoCopy } from '@/lib/map/mapSeoCopy';
import styles from './MapSeoFooter.module.css';

interface Props {
  locale: string;
}

/**
 * Der redaktionelle Abbinder unter der Liste: drei Absätze, was diese Karte ist,
 * plus drei aufklappbare Fragen.
 *
 * Steht im Scroll-Bereich der Liste, hinter dem All-Berlin-Banner — auf dem
 * Desktop unten in der Panel-Spalte, auf dem Telefon am Ende des Dokuments
 * (dort ist `.listScroll` `overflow: visible` und die Seite selbst scrollt).
 * Damit braucht die Kartenseite keinen zweiten Scroll-Container: der Block
 * liegt genau da, wo die Liste ohnehin endet.
 *
 * `<details>` statt eines Akkordeons in JavaScript — dieselbe Bauweise wie
 * `HubFaq` auf der Startseite, und der Text steht auch zugeklappt im HTML.
 * Der Wortlaut liegt in `lib/map/mapSeoCopy.ts`, weil das FAQPage-JSON-LD der
 * Seite dieselben Sätze führen muss.
 */
export default function MapSeoFooter({ locale }: Props) {
  const copy = getMapSeoCopy(locale);
  return (
    <section className={styles.block} aria-labelledby="map-seo-heading">
      <h2 id="map-seo-heading" className={styles.heading}>
        {copy.outroHeading}
      </h2>
      {copy.outroParagraphs.map((paragraph) => (
        <p key={paragraph} className={styles.text}>
          {paragraph}
        </p>
      ))}

      <h3 className={styles.faqHeading}>{copy.faqHeading}</h3>
      <div className={styles.faqList}>
        {copy.faqs.map((faq) => (
          <details key={faq.q} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>{faq.q}</summary>
            <p className={styles.faqAnswer}>{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
