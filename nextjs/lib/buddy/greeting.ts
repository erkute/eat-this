// nextjs/lib/buddy/greeting.ts
import type { Locale } from './types';

// Remy's opener + starter chips adapt to the time of day so the empty chat
// feels alive and relevant instead of one fixed line. Kept in his voice:
// short, opinionated, no filler.
type Daypart = 'morning' | 'midday' | 'afternoon' | 'evening' | 'late';

export function daypartFor(hour: number): Daypart {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 15) return 'midday';
  if (hour >= 15 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'late';
}

// The hook follows directly after Remy's intro sentence, so it must read as
// ONE flowing line ("…dein Mann für gutes Essen in Berlin. Brauchst du…").
// No standalone daypart salutation ("Morgen.", "Mittagszeit.") — that collided
// with the intro's "Hey" as a double greeting. The daypart shows through the
// content instead (Frühstück, Mittag, Drink, spät).
const GREETINGS: Record<Locale, Record<Daypart, string>> = {
  de: {
    morning:
      'Brauchst du erstmal einen guten Kaffee, oder soll’s gleich was Richtiges zum Frühstück sein?',
    midday:
      'Schnell was Gutes auf die Hand zum Mittag, oder lieber in Ruhe hinsetzen? Ich kenn die Läden für beides.',
    afternoon: 'Zeit für Kaffee und was Süßes — oder ist dir schon nach dem ersten Drink?',
    evening:
      'Worauf hast du heute Abend Lust — ein gutes Essen, ein Drink, oder beides nacheinander?',
    late: 'Wenn dich so spät noch der Hunger packt: Döner, Pizza oder eine Bar, die offen hat — ich weiß, wo.',
  },
  en: {
    morning: 'Need a good coffee first, or shall we go straight for a proper breakfast?',
    midday: 'Something quick and good for lunch, or a proper sit-down? I know the places for both.',
    afternoon: 'Time for coffee and something sweet — or are you already after the first drink?',
    evening: 'What are you in the mood for tonight — a good dinner, a drink, or both in a row?',
    late: 'If hunger strikes this late: döner, pizza, or a bar that’s still open — I know where.',
  },
};

const SUGGESTIONS: Record<Locale, Record<Daypart, string[]>> = {
  de: {
    morning: [
      'Guter Kaffee in der Nähe',
      'Wo gibt’s ordentliches Frühstück?',
      'Bäckerei mit gutem Sauerteig',
      'Shakshuka oder Eggs?',
    ],
    midday: [
      'Schnelles Mittagessen',
      'Wo gibt’s gute Bowls?',
      'Ramen für die Pause',
      'Mittag zum Hinsetzen',
    ],
    afternoon: [
      'Kaffee und was Süßes',
      'Beste Eisdiele',
      'Cinnamon Bun oder Babka?',
      'Wo gibt’s guten Kuchen?',
    ],
    evening: [
      'Wo gibt’s richtig gute Pizza?',
      'Schönes Dinner für zwei',
      'Natural-Wine-Bar',
      'Wo trinkt man gut?',
    ],
    late: [
      'Bester Döner jetzt',
      'Pizza um die Zeit',
      'Bar, die noch offen hat',
      'Was hat jetzt noch auf?',
    ],
  },
  en: {
    morning: [
      'Good coffee nearby',
      'Where’s a proper breakfast?',
      'Bakery with real sourdough',
      'Shakshuka or eggs?',
    ],
    midday: ['Quick lunch', 'Where’s good bowls?', 'Ramen for the break', 'A lunch with substance'],
    afternoon: [
      'Coffee and something sweet',
      'Best ice cream',
      'Cinnamon bun or babka?',
      'Where’s good cake?',
    ],
    evening: [
      'Where’s really good pizza?',
      'A nice dinner for two',
      'Natural wine bar',
      'Where do you drink well?',
    ],
    late: [
      'Best döner right now',
      'Pizza at this hour',
      'A bar that’s still open',
      'What’s still open now?',
    ],
  },
};

// Remy introduces himself, warmly, before the time-of-day hook.
const INTRO: Record<Locale, string> = {
  de: 'Hey, ich bin Remy — dein Mann für gutes Essen in Berlin.',
  en: 'Hey, I’m Remy — your guy for good food in Berlin.',
};

export function greetingFor(
  hour: number,
  locale: Locale
): { greeting: string; suggestions: string[] } {
  const part = daypartFor(hour);
  return {
    greeting: `${INTRO[locale]} ${GREETINGS[locale][part]}`,
    suggestions: SUGGESTIONS[locale][part],
  };
}

// ── Remys Tafel auf der Startseite ────────────────────────────────────────
// Remys erster Satz auf seiner Tafel (HubFragRemy), bevor er zu den Kategorien
// redet: trocken, konkret, kein Füllwort, kein Emoji. Wechselt mit der
// Tageszeit; der Server rendert stattdessen den allgemeinen `sub`.
const STAGE_LEAD: Record<Locale, Record<Daypart, string>> = {
  de: {
    morning: 'Der Tag ist zu kurz für schlechten Kaffee.',
    midday: 'Schnell essen, ohne sich mit Mittelmaß abzufinden.',
    afternoon: 'Kaffee, Kuchen, kurze Pause.',
    evening: 'Für Dinner, Drinks und lange Abende.',
    late: 'Wenn es spät wird, zählt nicht nur, was noch offen ist.',
  },
  en: {
    morning: "The day's too short for bad coffee.",
    midday: 'Eat quick, without settling for mediocre.',
    afternoon: 'Coffee, cake, a short break.',
    evening: 'For dinner, drinks, and long nights.',
    late: "When it gets late, it's not just about what's still open.",
  },
};

// Zwei Beispiel-Fragen zur Tageszeit unter den Kategorien — die Seite des
// Besuchers im Gespräch; antippen öffnet den Chat mit genau dieser Frage.
const STAGE_ANSWERS: Record<Locale, Record<Daypart, [string, string]>> = {
  de: {
    morning: ['Guter Kaffee in der Nähe', 'Ordentliches Frühstück'],
    midday: ['Schnelles Mittagessen', 'Lieber in Ruhe hinsetzen'],
    afternoon: ['Kaffee und was Süßes', 'Schon der erste Drink'],
    evening: ['Richtig gute Pizza', 'Schönes Dinner für zwei'],
    late: ['Beste Döner jetzt', 'Bars, die noch offen haben'],
  },
  en: {
    morning: ['Good coffee nearby', 'A proper breakfast'],
    midday: ['Quick lunch', 'A proper sit-down'],
    afternoon: ['Coffee and something sweet', 'Already the first drink'],
    evening: ['Really good pizza', 'A nice dinner for two'],
    late: ['Best döner right now', "A bar that's still open"],
  },
};

export function stageFor(
  hour: number,
  locale: Locale
): { lead: string; answers: [string, string] } {
  const part = daypartFor(hour);
  return { lead: STAGE_LEAD[locale][part], answers: STAGE_ANSWERS[locale][part] };
}

// Zu jeder Kategorie ein Satz: zeigt man auf der Tafel auf eine Kategorie
// (oder geht Remy sie von selbst durch), sagt er ihn. Neue Kategorien in
// Sanity bekommen den allgemeinen Satz, bis hier einer steht.
const CATEGORY_LINES: Record<Locale, Record<string, string>> = {
  de: {
    'fine-dining': 'Fine Dining heißt hier: modernes Berlin, keine steife Tischdecke.',
    pizza: 'Pizza? Ich kenn die Öfen, die es wirklich können.',
    coffee: 'Kaffee, für den sich der Umweg lohnt.',
    dinner: 'Dinner an Orten, die den Abend tragen.',
    'fast-food': 'Schnell heißt nicht schlecht. Ich zeig dir, wo.',
    breakfast: 'Frühstück, für das man gern früher aufsteht.',
    lunch: 'Mittag ohne Mittelmaß.',
    sweets: 'Kuchen, Eis, Gebäck — da hab ich Favoriten.',
    drinks: 'Erster Drink? Ich weiß, wo der zweite besser wird.',
  },
  en: {
    'fine-dining': 'Fine dining here means modern Berlin, no stiff tablecloth.',
    pizza: 'Pizza? I know the ovens that really deliver.',
    coffee: 'Coffee worth the detour.',
    dinner: 'Dinner in places that carry the night.',
    'fast-food': "Fast doesn't mean bad. I'll show you where.",
    breakfast: 'Breakfast worth getting up early for.',
    lunch: 'Lunch without the mediocre.',
    sweets: 'Cake, ice cream, pastry — I have favourites.',
    drinks: 'First drink? I know where the second gets better.',
  },
};

export function categoryLine(locale: Locale, slug: string, name: string): string {
  return (
    CATEGORY_LINES[locale][slug] ??
    (locale === 'de' ? `${name}? Da kenn ich was.` : `${name}? I know a place.`)
  );
}
