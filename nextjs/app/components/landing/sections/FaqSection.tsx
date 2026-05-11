'use client'

import { useState } from 'react'
import styles from './FaqSection.module.css'

interface Props {
  locale: 'de' | 'en'
}

const FAQS = {
  de: [
    {
      q: 'Was ist Eat This?',
      a: 'Eine kuratierte Sammlung der besten Berliner Restaurants, Cafés und Bars. Handverlesen, direkt auf einer Map.',
    },
    {
      q: 'Wie melde ich mich an?',
      a: 'Du gibst deine E-Mail-Adresse ein und bekommst einen Magic Link zugeschickt. Ein Klick darauf und du bist drin.',
    },
    {
      q: 'Was sind Must Eats?',
      a: 'Für einige Spots gibt es eine verdeckte Gericht-Empfehlung. Du deckst sie direkt im Restaurant auf - danach landet sie dauerhaft in deinem Deck.',
    },
    {
      q: 'Wie werden die Restaurants ausgewählt?',
      a: 'Wir essen erst, dann posten wir. Drauf kommt nur, was uns überzeugt hat.',
    },
    {
      q: 'Was bekomme ich mit dem Starter Pack?',
      a: 'Zehn Restaurant-Spots in Berlin, inklusive aller Must Eats für diese Spots. Kostenlos.',
    },
    {
      q: 'Wie funktioniert All Berlin?',
      a: 'Ein einmaliger Kauf für 20 €. Du bekommst alle Berlin-Kategorien freigeschaltet und alle zukünftigen Berlin Packs gratis dazu.',
    },
    {
      q: 'Kommen regelmäßig neue Spots dazu?',
      a: 'Ja. Neue Orte und neue Must Eats kommen laufend hinzu, geschlossene fliegen raus. Mit All Berlin sind alle automatisch für dich freigeschaltet.',
    },
  ],
  en: [
    {
      q: 'What is Eat This?',
      a: 'A curated collection of the best Berlin restaurants, cafés and bars. Hand-picked, right on a map.',
    },
    {
      q: 'How do I sign up?',
      a: 'Enter your email and we send you a magic link. One click and you are in.',
    },
    {
      q: 'What are Must Eats?',
      a: 'Selected spots come with a hidden dish pick. You reveal it right at the restaurant - and it lands in your deck for good.',
    },
    {
      q: 'How are the restaurants chosen?',
      a: 'We eat first, post later. On the map only if it convinced us.',
    },
    {
      q: 'What do I get with the Starter Pack?',
      a: 'Ten restaurant spots across Berlin, including all Must Eats for those spots. Free.',
    },
    {
      q: 'How does All Berlin work?',
      a: 'A one-time €20 purchase. You get every Berlin category unlocked and every future Berlin pack included.',
    },
    {
      q: 'Do new spots get added regularly?',
      a: 'Yes. New places and new Must Eats roll in, closed ones get removed. With All Berlin they are automatically unlocked for you.',
    },
  ],
}

export default function FaqSection({ locale }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const items = locale === 'de' ? FAQS.de : FAQS.en

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>FAQ</span>
          <h2 className={styles.h2}>
            {locale === 'de' ? 'Häufige Fragen' : 'Frequently asked'}
          </h2>
        </div>
        <ul className={styles.list}>
          {items.map((item, i) => {
            const open = openIdx === i
            return (
              <li
                key={i}
                className={`${styles.item} ${open ? styles.itemOpen : ''}`}
              >
                <button
                  type="button"
                  className={styles.q}
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                >
                  <span>{item.q}</span>
                  <span className={styles.icon} aria-hidden="true">
                    {open ? '-' : '+'}
                  </span>
                </button>
                {open && <p className={styles.a}>{item.a}</p>}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
