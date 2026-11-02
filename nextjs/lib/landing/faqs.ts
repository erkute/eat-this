export interface LandingFaqEntry {
  q: string;
  a: string;
}

const FAQS: { de: LandingFaqEntry[]; en: LandingFaqEntry[] } = {
  de: [
    {
      q: 'Was kostet Eat This?',
      a: 'Map und Spots kannst du ohne Konto entdecken. 10 Must Eats sind schon aufgedeckt. Mit deinem Konto deckt das Starter Pack 20 weitere auf. Den Rest der aktuell {mustEatCount} Must Eats in Berlin entdeckst du vor Ort. Neue kommen nach und nach dazu.\n\nNur Booster Packs kosten etwas. Damit kannst du weitere Must Eats freischalten und Karten sammeln, ohne die Spots vorher besuchen zu müssen.',
    },
    {
      q: 'Brauche ich ein Konto?',
      a: 'Du kannst die Map und die Spots ohne Konto entdecken. Zum Sammeln und Aufdecken verdeckter Must Eats brauchst du ein Konto. Dein Starter Pack deckt bei der Anmeldung 20 weitere Must Eats auf.',
    },
    {
      q: 'Was sind Must Eats und wie decke ich sie auf?',
      a: 'Must Eats sind konkrete Gerichte, die wir dir an einem Spot empfehlen. 10 Karten sind schon für alle aufgedeckt. Mit deinem Konto deckt das Starter Pack 20 weitere auf. Die übrigen Karten entdeckst du vor Ort und sammelst sie in deinem Deck. Ein Booster Pack schaltet die enthaltenen Karten auch ohne Besuch frei.',
    },
    {
      q: 'Wie wählt ihr die Spots aus?',
      a: 'Wir sind Foodies und gehen einfach gern essen. Dabei sind wir ziemlich wählerisch. Auf die Map kommen die Restaurants, Cafés und Bars, die uns selbst überzeugen – und die wir auch unseren Freunden empfehlen.',
    },
    {
      q: 'Gibt’s Eat This auch außerhalb von Berlin?',
      a: 'Aktuell findest du bei uns Restaurants, Cafés und Bars in Berlin. Weitere Großstädte sind geplant.',
    },
  ],
  en: [
    {
      q: 'What does Eat This cost?',
      a: 'You can explore the map and spots without an account. 10 Must Eats are already revealed. With your account, the Starter Pack reveals 20 more. Discover the rest of the {mustEatCount} Must Eats currently in Berlin at the spots themselves. More are added over time.\n\nOnly Booster Packs cost money. With them you can unlock more Must Eats and collect cards without having to visit the spots first.',
    },
    {
      q: 'Do I need an account?',
      a: 'You can explore the map and spots without an account. To collect Must Eats and reveal hidden cards, you need an account. Your Starter Pack reveals 20 more Must Eats when you sign up.',
    },
    {
      q: 'What are Must Eats and how do I reveal them?',
      a: 'Must Eats are specific dishes we recommend at a spot. 10 cards are already revealed for everyone. With your account, the Starter Pack reveals 20 more. Discover the remaining cards at the spots and collect them in your deck. A Booster Pack unlocks its included cards without a visit.',
    },
    {
      q: 'How do you choose the spots?',
      a: 'We love going out to eat, and we’re pretty particular about what’s on our plates. Our map features the restaurants, cafés and bars that win us over – the ones we recommend to our friends.',
    },
    {
      q: 'Is Eat This available outside Berlin?',
      a: 'For now, you’ll find restaurants, cafés and bars in Berlin. We plan to expand to other major cities.',
    },
  ],
};

export function getLandingFaqs(locale: 'de' | 'en', mustEatCount: number): LandingFaqEntry[] {
  // Defensive fallback: callers can receive the raw URL segment as `locale`
  // (dotted paths bypass the locale middleware), and undefined here turns
  // into a 500 on the home page.
  const entries = FAQS[locale];
  if (!entries) return [];
  const count = new Intl.NumberFormat(locale).format(mustEatCount);
  return entries.map((entry) => ({
    ...entry,
    a: entry.a.replaceAll('{mustEatCount}', count),
  }));
}
