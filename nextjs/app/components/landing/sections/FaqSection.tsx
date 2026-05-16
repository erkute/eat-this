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
      a: 'Eat This ist eine kuratierte Food-Map für Berlin. Wir sammeln handverlesene Restaurants, Cafés und Bars - direkt auf einer intuitiven Map.',
    },
    {
      q: 'Wie funktioniert Eat This?',
      a: 'Nach der Registrierung erhältst du kostenlosen Zugang zu ersten Berliner Spots auf der Map. Weitere Kategorien und Empfehlungen kannst du später über Packs freischalten.',
    },
    {
      q: 'Was sind Must Eats?',
      a: 'Für ausgewählte Spots empfehlen wir zusätzlich konkrete Gerichte, die du dort bestellen solltest.',
    },
    {
      q: 'Wie werden die Restaurants ausgewählt?',
      a: 'Jeder Spot wird von uns persönlich besucht und anonym getestet. Wir lassen uns nicht für Platzierungen bezahlen - auf die Map kommt nur, was uns überzeugt hat.',
    },
    {
      q: 'Welche Kategorien gibt es?',
      a: 'Aktuell unter anderem Coffee, Breakfast, Lunch, Pizza, Dinner, Fine Dining, Fast Food, Drinks und Sweets.',
    },
    {
      q: 'Was ist im Starter Pack enthalten?',
      a: '20 kostenlose Berliner Spots und ausgewählte Must Eats zum Einstieg.',
    },
    {
      q: 'Was ist All Berlin?',
      a: 'Mit All Berlin erhältst du Zugriff auf alle Berliner Kategorien, sämtliche Must Eats und zukünftige Berlin-Updates. Einmalige Zahlung.',
    },
    {
      q: 'Werden neue Spots hinzugefügt?',
      a: 'Ja. Die Map wird laufend aktualisiert und regelmäßig um neue Restaurants, Cafés, Bars und Must Eats erweitert.',
    },
    {
      q: 'Funktioniert Eat This mobil?',
      a: 'Ja. Die Map ist für mobile Nutzung optimiert und funktioniert direkt unterwegs.',
    },
    {
      q: 'Gibt es Eat This nur in Berlin?',
      a: 'Aktuell liegt der Fokus auf Berlin. Weitere Städte sind bereits geplant.',
    },
    {
      q: 'Warum kostet das was?',
      a: 'Weil wir keine Werbung schalten und nicht von Restaurants bezahlt werden. Unsere Unabhängigkeit ist dein Filter für gutes Essen.',
    },
  ],
  en: [
    {
      q: 'What is Eat This?',
      a: 'Eat This is a curated food map for Berlin. Hand-picked restaurants, cafés and bars - right on one intuitive map.',
    },
    {
      q: 'How does Eat This work?',
      a: 'After signing up you get free access to your first Berlin spots on the map. Unlock more categories and recommendations any time via packs.',
    },
    {
      q: 'What are Must Eats?',
      a: 'For selected spots we add a specific dish recommendation you should order there.',
    },
    {
      q: 'How are the restaurants chosen?',
      a: "We visit each spot in person, anonymously. We don't take money for placements - on the map only if it convinced us.",
    },
    {
      q: 'Which categories are there?',
      a: 'Currently Coffee, Breakfast, Lunch, Pizza, Dinner, Fine Dining, Fast Food, Drinks and Sweets - among others.',
    },
    {
      q: "What's in the Starter Pack?",
      a: '20 free Berlin spots and selected Must Eats to get you started.',
    },
    {
      q: 'What is All Berlin?',
      a: 'All Berlin unlocks every Berlin category, every Must Eat and every future Berlin update. One-time payment.',
    },
    {
      q: 'Are new spots added?',
      a: 'Yes. The map is updated continuously - new restaurants, cafés, bars and Must Eats roll in regularly.',
    },
    {
      q: 'Does Eat This work on mobile?',
      a: 'Yes. The map is built for mobile use and works on the go.',
    },
    {
      q: 'Is Eat This only for Berlin?',
      a: 'Right now we focus on Berlin. More cities are already planned.',
    },
    {
      q: 'Why does it cost anything?',
      a: "Because we don't run ads and don't get paid by restaurants. Our independence is your filter for good food.",
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
