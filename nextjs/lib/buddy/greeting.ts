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

const GREETINGS: Record<Locale, Record<Daypart, string>> = {
  de: {
    morning: 'Morgen. Kaffee, Frühstück, irgendwas mit Ei — sag, worauf du Lust hast, ich kenn die richtigen Läden.',
    midday: 'Mittag. Schnell was Gutes oder in Ruhe? Sag mir, wonach dir ist, ich hab die Adressen.',
    afternoon: 'Nachmittag — Kaffee und was Süßes, oder schon der erste Drink? Sag an.',
    evening: 'Abend. Dinner, Drinks oder einfach ehrlich essen? Sag, worauf du Lust hast — ich kenn die Spots.',
    late: 'Späte Stunde. Döner, Pizza oder eine Bar, die noch offen hat? Ich weiß, wo’s das gibt.',
  },
  en: {
    morning: 'Morning. Coffee, breakfast, something with eggs — tell me what you’re after, I know the right places.',
    midday: 'Lunchtime. Quick and good, or a proper sit-down? Tell me what you’re after, I’ve got the addresses.',
    afternoon: 'Afternoon — coffee and something sweet, or the first drink already? Tell me.',
    evening: 'Evening. Dinner, drinks, or just honest food? Tell me what you’re after — I know the spots.',
    late: 'Late one. Döner, pizza, or a bar that’s still open? I know where to find it.',
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

export function greetingFor(hour: number, locale: Locale): { greeting: string; suggestions: string[] } {
  const part = daypartFor(hour)
  return { greeting: GREETINGS[locale][part], suggestions: SUGGESTIONS[locale][part] }
}
