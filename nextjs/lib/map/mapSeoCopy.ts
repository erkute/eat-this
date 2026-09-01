/**
 * Der redaktionelle Text der Kartenseite — Intro unter der H1, der Absatz am
 * Ende der Liste und die drei FAQ-Einträge.
 *
 * Eine Quelle, weil zwei Dinge daran hängen: die gerenderte Seite
 * (MapIntro / MapSeoFooter) und das FAQPage-JSON-LD in
 * `app/[locale]/(spa)/map/page.tsx`. Ein FAQPage, dessen Fragen nicht wörtlich
 * auf der Seite stehen, ist eine Behauptung über die Seite, die nicht stimmt —
 * derselbe Grund, aus dem `lib/landing/faqs.ts` neben `buildHomeJsonLd` steht.
 *
 * Nicht in `lib/i18n/translations.ts`: das lesen nur Client-Komponenten über
 * `useTranslation`, und das JSON-LD wird auf dem Server gebaut.
 */

export interface MapFaqEntry {
  q: string;
  a: string;
}

export interface MapSeoCopy {
  /** Die einzige H1 der Seite. */
  h1: string;
  /** Überschrift des Blocks am Listenende.
   *
   *  Wörtlich die Zwischenüberschrift der About-Seite (DE und EN), vom
   *  Betreiber am 01.09.2026 ausgewählt: die Karte und die Seite, auf der er
   *  erklärt warum es sie gibt, sollen denselben Satz sagen. Die vorher hier
   *  stehende Zeile („Berlin essen, ohne 40 Tabs zu öffnen") war grammatisch
   *  schief und im Ton lauter als alles andere auf der Seite. */
  outroHeading: string;
  /** Absätze dieses Blocks. */
  outroParagraphs: string[];
  faqHeading: string;
  faqs: MapFaqEntry[];
}

const COPY: Record<'de' | 'en', MapSeoCopy> = {
  de: {
    h1: 'Berlin Food Map',
    outroHeading: 'Weil Entdecken mehr Spaß macht als Suchen',
    outroParagraphs: [
      'Eat This ist eine kuratierte Food Map für Berlin. Auf der Karte stehen Restaurants, Cafés, Bars, Bäckereien und andere Spots, in die wir selbst gehen — keine Vollerhebung der Stadt, sondern eine kleine Auswahl.',
      'Die Berlin Food Map lässt sich nach Bezirk, Kategorie und Preis filtern. Oder du schaust direkt, was in deiner Nähe liegt und gerade geöffnet hat.',
      'Alle Orte werden redaktionell ausgewählt. Die Karte soll nicht zeigen, was es alles gibt, sondern wo es sich lohnt.',
    ],
    faqHeading: 'Häufige Fragen',
    faqs: [
      {
        q: 'Was ist die Berlin Food Map von Eat This?',
        a: 'Eine kuratierte Karte mit ausgewählten Restaurants, Cafés, Bars und anderen Food-Spots in Berlin.',
      },
      {
        q: 'Welche Restaurants stehen auf der Karte?',
        a: 'Nur redaktionell ausgewählte. Die Auswahl ist bewusst kleiner und enger als bei Karten- oder Bewertungsplattformen.',
      },
      {
        q: 'Kann ich die Food Map filtern?',
        a: 'Ja. Nach Kategorie, Bezirk und Preis — und du kannst dir nur die Spots zeigen lassen, die gerade geöffnet haben.',
      },
    ],
  },
  en: {
    h1: 'Berlin Food Map',
    outroHeading: 'Because discovering is more fun than searching',
    outroParagraphs: [
      'Eat This is a curated food map for Berlin. The map holds restaurants, cafés, bars, bakeries and other spots we go to ourselves — not a survey of the city, just a small selection.',
      "You can filter the Berlin food map by district, category and price. Or look straight at what's near you and open right now.",
      "Every place is picked editorially. The map isn't there to show what exists, but where it's worth going.",
    ],
    faqHeading: 'Common questions',
    faqs: [
      {
        q: 'What is the Eat This Berlin food map?',
        a: 'A curated map of selected restaurants, cafés, bars and other food spots in Berlin.',
      },
      {
        q: 'Which restaurants are on the map?',
        a: 'Only editorially selected ones. The selection is deliberately smaller and narrower than on map or review platforms.',
      },
      {
        q: 'Can I filter the food map?',
        a: 'Yes. By category, district and price — and you can show only the spots that are open right now.',
      },
    ],
  },
};

/** Defensiver Fallback wie in `getLandingFaqs`: gepunktete Pfade umgehen die
 *  Locale-Middleware, dann steht hier ein roher Segmentwert. */
export function getMapSeoCopy(locale: string): MapSeoCopy {
  return COPY[locale === 'en' ? 'en' : 'de'];
}
