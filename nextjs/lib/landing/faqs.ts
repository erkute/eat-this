import { STARTER_PACK_CARDS } from '@/lib/starter-pack';

export interface LandingFaqEntry {
  q: string;
  a: string;
}

const FAQS: { de: LandingFaqEntry[]; en: LandingFaqEntry[] } = {
  de: [
    {
      q: 'Was ist ein Must Eat?',
      a: 'Unsere Empfehlung für einen Spot: das Gericht, das du dort bestellen solltest. Jedes Must Eat ist eine Karte, die du sammeln kannst.',
    },
    {
      q: 'Wer entscheidet, was ein Must Eat ist?',
      a: 'Eat This ist keine Bewertungsplattform. Alle Spots und Gerichte werden persönlich ausgewählt. Es geht nicht um Sterne, Rankings oder Instagram-Hypes, sondern um die Frage: Was solltest du hier unbedingt bestellen?',
    },
    {
      q: 'Warum sind die meisten Karten verdeckt?',
      a: `Weil Entdecken mehr Spaß macht als Scrollen. Von aktuell {mustEatCount} Must Eats liegen 10 für alle offen. Mit deinem Starter Pack bekommst du ${STARTER_PACK_CARDS} weitere. Die restlichen Karten kannst du vor Ort sammeln oder mit Booster Packs aufdecken. Auch bei verdeckten Karten siehst du immer den Spot und den Bezirk.`,
    },
    {
      q: 'Muss ich das Gericht bestellen, um die Karte aufzudecken?',
      a: 'Nein. Es reicht, wenn du vor Ort bist. Was du am Ende bestellst, entscheidest natürlich du. Aber wir hätten da eine Empfehlung.',
    },
    {
      q: 'Was kostet der Spaß?',
      a: 'Zahlen musst du nur, wenn du Karten direkt aufdecken möchtest. Dafür gibt es Booster Packs: Ein Kategorie-Pack kostet 2,99 €, All Berlin kostet 9,99 € und enthält auch alle zukünftigen Must Eats. Einmal zahlen, kein Abo.',
    },
    {
      q: 'Muss ich mich anmelden?',
      a: 'Zum Entdecken nicht. Zum Sammeln schon. Dein Konto speichert deine Karten geräteübergreifend. Melde dich einfach per E-Mail-Link oder mit deinem Google-Konto an. Ein Passwort brauchst du nicht.',
    },
    {
      q: 'Was bringt’s, Freunde einzuladen?',
      a: 'Gutes Essen teilt man. Teil deinen Einladungslink und ihr bekommt beide ein zusätzliches Must Eat, sobald sich dein Freund neu anmeldet. Du kannst so bis zu 15 weitere Karten sammeln. Danach bekommen neu eingeladene Freunde weiterhin ihre Karte.',
    },
    {
      q: 'Trackt ihr mich?',
      a: 'Kein Werbetracking, kein Google Analytics und keine Bewegungsprofile. Wir zählen lediglich Seitenaufrufe, um zu verstehen, wie Eat This genutzt wird. Beim Aufdecken einer Karte prüft dein Gerät selbst, ob du vor Ort bist. Dein Standort wird dafür nicht an uns übertragen.',
    },
    {
      q: 'Kommen neue Must Eats dazu?',
      a: 'Ja. Berlin steht kulinarisch nie still und Eat This auch nicht. Die Sammlung wächst mit neuen Entdeckungen. Wenn du All Berlin besitzt, bekommst du zukünftige Must Eats ohne zusätzliche Kosten dazu.',
    },
    {
      q: 'Kommt ihr auch in meine Stadt?',
      a: 'Berlin ist erst der Anfang. Aber eine Stadt muss man kennen, bevor man Empfehlungen ausspricht. Deshalb machen wir erst Berlin richtig. Weitere Städte sind geplant.',
    },
  ],
  en: [
    {
      q: 'What’s a Must Eat?',
      a: 'Our pick for a spot: the dish you should order there. Every Must Eat is a card you can collect.',
    },
    {
      q: 'Who decides what a Must Eat is?',
      a: 'Eat This isn’t a review platform. Every spot and every dish is picked personally. It’s not about stars, rankings or Instagram hype. It’s about one question: what should you really order here?',
    },
    {
      q: 'Why are most cards face down?',
      a: `Because discovering beats scrolling. Of the {mustEatCount} Must Eats right now, 10 are open to everyone. Your Starter Pack gives you ${STARTER_PACK_CARDS} more. The rest you can collect when you visit or reveal with Booster Packs. Even face down, a card always shows you the spot and the district.`,
    },
    {
      q: 'Do I have to order the dish to reveal the card?',
      a: 'No. Being there is enough. What you end up ordering is your call, of course. But we do have a recommendation.',
    },
    {
      q: 'What’s the catch?',
      a: 'You only pay if you want to reveal cards right away. That’s what Booster Packs are for: a category pack is €2.99, All Berlin is €9.99 and includes every future Must Eat too. Pay once, no subscription.',
    },
    {
      q: 'Do I have to sign up?',
      a: 'Not to explore. To collect, yes. Your account keeps your cards across devices. Just sign in with an email link or your Google account. No password needed.',
    },
    {
      q: 'What do I get for inviting friends?',
      a: 'Good food is for sharing. Share your invite link and you both get an extra Must Eat as soon as your friend signs up. You can collect up to 15 extra cards this way. After that, newly invited friends still get their card.',
    },
    {
      q: 'Are you tracking me?',
      a: 'No ad tracking, no Google Analytics and no movement profiles. We only count page views to understand how Eat This is used. When you reveal a card, your device checks for itself whether you’re there. Your location isn’t sent to us for that.',
    },
    {
      q: 'Are new Must Eats being added?',
      a: 'Yes. Berlin’s food scene never stands still, and neither does Eat This. The collection grows with every new find. If you own All Berlin, future Must Eats come at no extra cost.',
    },
    {
      q: 'Are you coming to my city?',
      a: 'Berlin is just the beginning. But you have to know a city before you start recommending things. That’s why we’re getting Berlin right first. More cities are planned.',
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
