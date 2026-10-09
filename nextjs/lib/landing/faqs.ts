export interface LandingFaqEntry {
  q: string;
  a: string;
}

const FAQS: { de: LandingFaqEntry[]; en: LandingFaqEntry[] } = {
  de: [
    {
      q: 'Was kostet Eat This?',
      a: 'Ganz Berlin ist schon auf deiner Map. Mit einem kostenlosen Konto bekommst du das Starter Pack dazu: 20 Must Eats für deinen Start.\n\nNur Booster Packs kosten etwas. Damit kannst du weitere Must Eats freischalten und Karten sammeln, ohne die Spots vorher besuchen zu müssen.',
    },
    {
      q: 'Brauche ich ein Konto?',
      a: 'Du kannst die Map und die Spots ohne Konto entdecken. Zum Sammeln und Aufdecken verdeckter Must Eats brauchst du ein kostenloses Konto. Bei der Anmeldung bekommst du dein Starter Pack.',
    },
    {
      q: 'Was sind Must Eats und wie decke ich sie auf?',
      a: 'Must Eats sind konkrete Gerichte, die wir dir an einem Spot empfehlen. Einige sind direkt sichtbar. Verdeckte Karten deckst du mit deinem Konto vor Ort auf und sammelst sie in deinem Deck. Ein Booster Pack schaltet die enthaltenen Karten auch ohne Besuch frei.',
    },
    {
      q: 'Wie wählt ihr die Spots aus?',
      a: 'Wir besuchen die Spots persönlich und testen anonym. Auf die Map kommt, was uns überzeugt. Restaurants können sich keinen Platz kaufen.',
    },
    {
      q: 'Gibt’s Eat This auch außerhalb von Berlin?',
      a: 'Aktuell findest du bei uns Restaurants, Cafés und Bars in Berlin. Weitere Großstädte sind geplant.',
    },
  ],
  en: [
    {
      q: 'What does Eat This cost?',
      a: 'All of Berlin is already on your map. With a free account you also get the Starter Pack: 20 Must Eats to get you started.\n\nOnly Booster Packs cost money. With them you can unlock more Must Eats and collect cards without having to visit the spots first.',
    },
    {
      q: 'Do I need an account?',
      a: 'You can explore the map and spots without an account. To collect Must Eats and reveal hidden cards, you need a free account. Your Starter Pack comes with sign-up.',
    },
    {
      q: 'What are Must Eats and how do I reveal them?',
      a: 'Must Eats are specific dishes we recommend at a spot. Some are visible right away. With an account, you can reveal hidden cards on site and collect them in your deck. A Booster Pack unlocks its included cards without a visit.',
    },
    {
      q: 'How do you choose the spots?',
      a: 'We visit the spots in person and test anonymously. Only places that win us over make it onto the map. Restaurants cannot buy a place on it.',
    },
    {
      q: 'Is Eat This available outside Berlin?',
      a: 'For now, you’ll find restaurants, cafés and bars in Berlin. We plan to expand to other major cities.',
    },
  ],
};

export function getLandingFaqs(locale: 'de' | 'en'): LandingFaqEntry[] {
  // Defensive fallback: callers can receive the raw URL segment as `locale`
  // (dotted paths bypass the locale middleware), and undefined here turns
  // into a 500 on the home page.
  return FAQS[locale] ?? [];
}
