'use client';

import { useState } from 'react';
import styles from './landing.module.css';

const FAQS: { q: string; a: string | string[] }[] = [
  {
    q: 'Was ist EAT THIS?',
    a: [
      'Wahrscheinlich der beste Foodguide, den du kennst.',
      'Eine kuratierte Sammlung der besten Berliner Restaurants. Wir besuchen jeden Spot persönlich, probieren uns durch die Karte — und empfehlen am Ende ein oder mehrere Gerichte.',
      'Jede Empfehlung landet als Must Eat Karte in deinem Deck. Du sammelst, entdeckst Berlin Gericht für Gericht. Was auch immer auf deiner Karte steht, du kannst es blind bestellen.',
    ],
  },
  {
    q: 'Was ist eine Must Eat Card?',
    a: 'Eine Must Eat Card steht für ein konkretes Gericht an einem konkreten Ort — die eine Sache, die du dort bestellen musst.',
  },
  {
    q: 'Was ist der Unterschied zwischen einem Restaurant und einer Must Eat Card?',
    a: 'Alle Restaurants auf unserer Map wurden kuratiert und bilden die Lieblingsspots der Stadt. Wenn ein Gericht besonders heraussticht, bekommt es eine Must Eat Card. Wir finden, du solltest genau dieses Gericht dort essen. Ein Restaurant kann mehrere Must Eats haben.',
  },
  {
    q: 'Wie wird entschieden, was eine Card bekommt?',
    a: 'Wir besuchen jeden Ort persönlich, sprechen mit den Köchinnen und Köchen und wählen nur aus, was wirklich heraussticht. Eine Regel: Ist es nicht herausragend, bekommt es keine Card. Kein bezahlter Inhalt, keine Werbung.',
  },
  {
    q: 'Sind alle Empfehlungen wirklich unabhängig?',
    a: 'Ja. Eat This ist vollständig selbstfinanziert und ohne Werbepartner. Wir erhalten keine Zahlungen von Restaurants, Gastrogruppen oder Lebensmittelmarken.',
  },
  {
    q: 'Welche Städte kommen als nächstes?',
    a: 'Berlin ist erst der Anfang — dann folgen Amsterdam und Paris. Gleiche Regeln, andere Städte.',
  },
  {
    q: 'Kann ich ein Restaurant oder Gericht vorschlagen?',
    a: 'Ja — schreib uns an hello@eatthisdot.com. Wir besuchen aber jeden Ort selbst, bevor wir eine Karte vergeben.',
  },
];

export default function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className={styles.faq}>
      <span className={styles.secLabel}>FAQ</span>
      <h2>Häufige Fragen</h2>
      {FAQS.map((item, i) => {
        const open = openIdx === i;
        return (
          <div
            key={item.q}
            className={`${styles.faqItem} ${open ? styles.open : ''}`}
            onClick={() => setOpenIdx(open ? null : i)}
          >
            <div className={styles.faqRow}>
              <p className={styles.faqQ}>{item.q}</p>
              <span className={styles.faqIcon}>+</span>
            </div>
            {Array.isArray(item.a)
              ? item.a.map((para, j) => <p key={j} className={styles.faqA}>{para}</p>)
              : <p className={styles.faqA}>{item.a}</p>}
          </div>
        );
      })}
    </section>
  );
}
