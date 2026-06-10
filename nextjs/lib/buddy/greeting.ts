// nextjs/lib/buddy/greeting.ts
import type { Locale } from './types'

// Remy's opener + starter chips adapt to the time of day so the empty chat
// feels alive and relevant instead of one fixed line. Kept in his voice:
// short, opinionated, no filler.
export type Daypart = 'morning' | 'midday' | 'afternoon' | 'evening' | 'late'

export function daypartFor(hour: number): Daypart {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 15) return 'midday'
  if (hour >= 15 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'late'
}

// The hook follows directly after Remy's intro sentence, so it must read as
// ONE flowing line ("…dein Mann für gutes Essen in Berlin. Brauchst du…").
// No standalone daypart salutation ("Morgen.", "Mittagszeit.") — that collided
// with the intro's "Hey" as a double greeting. The daypart shows through the
// content instead (Frühstück, Mittag, Drink, spät).
const GREETINGS: Record<Locale, Record<Daypart, string>> = {
  de: {
    morning: 'Brauchst du erstmal einen guten Kaffee, oder soll’s gleich was Richtiges zum Frühstück sein?',
    midday: 'Schnell was Gutes auf die Hand zum Mittag, oder lieber in Ruhe hinsetzen? Ich kenn die Läden für beides.',
    afternoon: 'Zeit für Kaffee und was Süßes — oder ist dir schon nach dem ersten Drink?',
    evening: 'Worauf hast du heute Abend Lust — ein gutes Essen, ein Drink, oder beides nacheinander?',
    late: 'Wenn dich so spät noch der Hunger packt: Döner, Pizza oder eine Bar, die offen hat — ich weiß, wo.',
  },
  en: {
    morning: 'Need a good coffee first, or shall we go straight for a proper breakfast?',
    midday: 'Something quick and good for lunch, or a proper sit-down? I know the places for both.',
    afternoon: 'Time for coffee and something sweet — or are you already after the first drink?',
    evening: 'What are you in the mood for tonight — a good dinner, a drink, or both in a row?',
    late: 'If hunger strikes this late: döner, pizza, or a bar that’s still open — I know where.',
  },
}

const SUGGESTIONS: Record<Locale, Record<Daypart, string[]>> = {
  de: {
    morning: ['Guter Kaffee in der Nähe', 'Wo gibt’s ordentliches Frühstück?', 'Bäckerei mit gutem Sauerteig', 'Shakshuka oder Eggs?'],
    midday: ['Schnelles Mittagessen', 'Wo gibt’s gute Bowls?', 'Ramen für die Pause', 'Mittag zum Hinsetzen'],
    afternoon: ['Kaffee und was Süßes', 'Beste Eisdiele', 'Cinnamon Bun oder Babka?', 'Wo gibt’s guten Kuchen?'],
    evening: ['Wo gibt’s richtig gute Pizza?', 'Schönes Dinner für zwei', 'Natural-Wine-Bar', 'Wo trinkt man gut?'],
    late: ['Bester Döner jetzt', 'Pizza um die Zeit', 'Bar, die noch offen hat', 'Was hat jetzt noch auf?'],
  },
  en: {
    morning: ['Good coffee nearby', 'Where’s a proper breakfast?', 'Bakery with real sourdough', 'Shakshuka or eggs?'],
    midday: ['Quick lunch', 'Where’s good bowls?', 'Ramen for the break', 'A lunch with substance'],
    afternoon: ['Coffee and something sweet', 'Best ice cream', 'Cinnamon bun or babka?', 'Where’s good cake?'],
    evening: ['Where’s really good pizza?', 'A nice dinner for two', 'Natural wine bar', 'Where do you drink well?'],
    late: ['Best döner right now', 'Pizza at this hour', 'A bar that’s still open', 'What’s still open now?'],
  },
}

// Remy introduces himself, warmly, before the time-of-day hook.
const INTRO: Record<Locale, string> = {
  de: 'Hey, ich bin Remy — dein Mann für gutes Essen in Berlin.',
  en: 'Hey, I’m Remy — your guy for good food in Berlin.',
}

export function greetingFor(hour: number, locale: Locale): { greeting: string; suggestions: string[] } {
  const part = daypartFor(hour)
  return {
    greeting: `${INTRO[locale]} ${GREETINGS[locale][part]}`,
    suggestions: SUGGESTIONS[locale][part],
  }
}

// The time-independent first sentence alone — safe to server-render (the
// daypart hook depends on the user's local clock, which the server can't know).
export function introFor(locale: Locale): string {
  return INTRO[locale]
}
