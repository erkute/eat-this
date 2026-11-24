import { STARTER_PACK_CARDS } from '@/lib/starter-pack';

export interface LandingFaqEntry {
  q: string;
  a: string;
}

const FAQS: { de: LandingFaqEntry[]; en: LandingFaqEntry[] } = {
  de: [
    {
      q: 'Was kostet Eat This?',
      a: `Map und Spots kannst du ohne Konto entdecken. 10 Must Eats sind schon aufgedeckt. Dein Starter Pack deckt einmalig bis zu ${STARTER_PACK_CARDS} weitere Karten auf. Den Rest der aktuell {mustEatCount} Must Eats in Berlin entdeckst du vor Ort. Neue kommen nach und nach dazu.\n\nNur Booster Packs kosten etwas. Damit kannst du weitere Karten aufdecken, ohne die Spots vorher besuchen zu müssen.`,
    },
    {
      q: 'Brauche ich ein Konto?',
      a: `Du kannst die Map und die Spots ohne Konto entdecken. Zum Sammeln und Aufdecken verdeckter Must-Eat-Karten brauchst du ein Konto. Dein Starter Pack deckt einmalig bis zu ${STARTER_PACK_CARDS} weitere Karten auf.`,
    },
    {
      q: 'Was sind Must Eats und wie decke ich sie auf?',
      a: `Must Eats sind Empfehlungen für konkrete Gerichte an einem Spot. 10 Karten sind schon für alle aufgedeckt. Dein Starter Pack deckt einmalig bis zu ${STARTER_PACK_CARDS} weitere Karten auf. Die übrigen Karten entdeckst du vor Ort und fügst sie deiner Sammlung hinzu. Ein Booster Pack deckt die enthaltenen Karten auch ohne Besuch auf.`,
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
      a: `You can explore the map and spots without an account. 10 Must Eats are already revealed. Your Starter Pack reveals up to ${STARTER_PACK_CARDS} more cards, once per account. Discover the rest of the {mustEatCount} Must Eats currently in Berlin at the spots themselves. More are added over time.\n\nOnly Booster Packs cost money. They reveal more cards without having to visit the spots first.`,
    },
    {
      q: 'Do I need an account?',
      a: `You can explore the map and spots without an account. You need an account to reveal hidden Must Eat cards and add them to your collection. Your Starter Pack reveals up to ${STARTER_PACK_CARDS} more cards, once per account.`,
    },
    {
      q: 'What are Must Eats and how do I reveal them?',
      a: `Must Eats are recommendations for specific dishes at a spot. 10 cards are already revealed for everyone. Your Starter Pack reveals up to ${STARTER_PACK_CARDS} more cards, once per account. Discover the remaining cards at the spots and add them to your collection. A Booster Pack reveals the included cards without a visit.`,
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
