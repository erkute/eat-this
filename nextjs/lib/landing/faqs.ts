export interface LandingFaqEntry {
  q: string;
  a: string;
}

const FAQS: { de: LandingFaqEntry[]; en: LandingFaqEntry[] } = {
  de: [
    {
      q: 'Was ist Eat This?',
      a: 'Eat This ist eine kuratierte Food-Map für Berlin: handverlesene Restaurants, Cafés und Bars. Frag Remy, er kennt jeden Spot und findet sofort deinen.',
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
      q: 'Gibt es Eat This nur in Berlin?',
      a: 'Aktuell liegt der Fokus auf Berlin. Weitere Städte sind bereits geplant.',
    },
    {
      q: 'Ist Eat This kostenlos?',
      a: 'Die Map ist kostenlos. Mit dem kostenlosen Starter Pack kannst du Must Eats sammeln und vor Ort aufdecken. Optional kannst du mit einem Booster Pack die enthaltenen Must Eats sofort freischalten: einmal zahlen, kein Abo. Damit unterstützt du unsere unabhängige Auswahl ohne bezahlte Restaurantplatzierungen.',
    },
  ],
  en: [
    {
      q: 'What is Eat This?',
      a: 'Eat This is a curated food map for Berlin: hand-picked restaurants, cafés and bars on one map. Ask Remy — he knows every spot and finds yours instantly.',
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
      q: 'Is Eat This only for Berlin?',
      a: 'Right now we focus on Berlin. More cities are already planned.',
    },
    {
      q: 'Is Eat This free?',
      a: 'The map is free. With the free Starter Pack, you can collect Must Eats and reveal them on site. Optional Booster Packs unlock their Must Eats immediately with a one-time payment and no subscription. Purchases support our independent selection without paid restaurant placements.',
    },
  ],
};

export function getLandingFaqs(locale: 'de' | 'en'): LandingFaqEntry[] {
  // Defensive fallback: callers can receive the raw URL segment as `locale`
  // (dotted paths bypass the locale middleware), and undefined here turns
  // into a 500 on the home page.
  return FAQS[locale] ?? [];
}
