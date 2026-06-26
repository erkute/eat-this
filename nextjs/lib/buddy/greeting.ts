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

// ── Home-stage variant ────────────────────────────────────────────────────
// The "Remy kennt die Spots" hero on the home hub speaks one self-contained
// line in his voice (Döner-&-Donuts tone: dry, concrete, no filler, no emojis).
// The identity opener stays constant; the second clause shifts with the daypart
// so the hero reads fresh morning vs. midnight. Two tappable answers per daypart
// hand off to the chat (see HubFragRemy + homeStage.ts).
const STAGE_LINE: Record<Locale, Record<Daypart, string>> = {
  de: {
    morning: 'Hi, ich bin Remy. Ich kenne die besten Spots in Berlin — der Tag ist zu kurz für schlechten Kaffee.',
    midday: 'Hi, ich bin Remy. Ich kenne die besten Spots in Berlin — schnell essen, ohne sich mit Mittelmaß abzufinden.',
    afternoon: 'Hi, ich bin Remy. Ich kenne die besten Spots in Berlin — Kaffee, Kuchen, kurze Pause.',
    evening: 'Hi, ich bin Remy. Ich kenne die besten Spots in Berlin — für Dinner, Drinks und Orte, die den Abend tragen.',
    late: 'Hi, ich bin Remy. Ich kenne die besten Spots in Berlin — wenn es spät wird, zählt nicht nur, was noch offen ist.',
  },
  en: {
    morning: "Hi, I'm Remy. I know the best spots in Berlin — the day's too short for bad coffee.",
    midday: "Hi, I'm Remy. I know the best spots in Berlin — eat quick, without settling for mediocre.",
    afternoon: "Hi, I'm Remy. I know the best spots in Berlin — coffee, cake, a short break.",
    evening: "Hi, I'm Remy. I know the best spots in Berlin — for dinner, drinks, and places that carry the night.",
    late: "Hi, I'm Remy. I know the best spots in Berlin — when it gets late, it's not just about what's still open.",
  },
}

// Two quick answers per daypart — the user's side of the conversation. Tapping
// one opens the chat with that exact question.
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
}

// Daypart-independent opener — server-renders before the client clock is known,
// then the daypart line swaps in after hydration. Both contain "ich bin Remy".
const STAGE_INTRO: Record<Locale, string> = {
  de: 'Hi, ich bin Remy. Ich kenne die besten Spots in Berlin.',
  en: "Hi, I'm Remy. I know the best spots in Berlin.",
}

// Editorial lead — the daypart clause as a standalone sentence (the bold hero's
// headline already carries "Remy kennt die Spots", so the lead need not repeat
// it). Shifts with the time of day; SSR falls back to the generic sub.
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
}

export function stageIntroFor(locale: Locale): string {
  return STAGE_INTRO[locale]
}

export function stageFor(
  hour: number,
  locale: Locale,
): { line: string; lead: string; answers: [string, string] } {
  const part = daypartFor(hour)
  return {
    line: STAGE_LINE[locale][part],
    lead: STAGE_LEAD[locale][part],
    answers: STAGE_ANSWERS[locale][part],
  }
}
