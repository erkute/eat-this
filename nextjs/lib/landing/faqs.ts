import { STARTER_PACK_CARDS } from '@/lib/starter-pack';

export interface LandingFaqEntry {
  q: string;
  a: string;
}

const FAQS: { de: LandingFaqEntry[]; en: LandingFaqEntry[] } = {
  de: [
    {
      q: 'Was kostet Eat This?',
      a: 'Nur Booster Packs kosten etwas. Damit bekommst du zusätzliche Must-Eat-Karten auch ohne Besuch vor Ort.',
    },
    {
      q: 'Brauche ich ein Konto?',
      a: 'Die Map kannst du ohne Konto nutzen. Zum Sammeln von Must-Eat-Karten meldest du dich an.',
    },
    {
      q: 'Was sind Must Eats?',
      a: `Ein Must Eat empfiehlt dir, was du an einer Adresse bestellen solltest. Von aktuell {mustEatCount} Must Eats in Berlin sind 10 Karten für alle offen. Mit dem Starter Pack bekommst du einmalig bis zu ${STARTER_PACK_CARDS} weitere Karten. Weitere Karten kannst du vor Ort sammeln.`,
    },
    {
      q: 'Welche Spots finde ich auf der Map?',
      a: 'Eat This sammelt ausgewählte Restaurants, Cafés und Bars in Berlin.',
    },
    {
      q: 'Gibt’s Eat This auch außerhalb von Berlin?',
      a: 'Aktuell findest du auf Eat This Restaurants, Cafés und Bars in Berlin. Weitere Großstädte sind geplant.',
    },
  ],
  en: [
    {
      q: 'What does Eat This cost?',
      a: 'Only Booster Packs cost money. They give you extra Must Eat cards without having to visit in person.',
    },
    {
      q: 'Do I need an account?',
      a: 'You can use the map without an account. Sign in to collect Must Eat cards.',
    },
    {
      q: 'What are Must Eats?',
      a: `A Must Eat tells you what to order at a particular place. Of the {mustEatCount} Must Eats currently in Berlin, 10 cards are open to everyone. Your Starter Pack adds up to ${STARTER_PACK_CARDS} cards, once per account. You can collect more cards when you visit.`,
    },
    {
      q: 'Which spots are on the map?',
      a: 'Eat This brings together selected restaurants, cafés and bars in Berlin.',
    },
    {
      q: 'Is Eat This available outside Berlin?',
      a: 'For now, you’ll find restaurants, cafés and bars in Berlin. More cities are planned.',
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
