#!/usr/bin/env node
/**
 * One-shot seeder: creates the singleton landingPage doc with id "landingPage".
 * Idempotent — re-running overwrites the doc completely (use createOrReplace).
 *
 * Usage:
 *   cd studio && SANITY_TOKEN=<editor-token> node scripts/seed-landing-page.mjs
 */
import {createClient} from '@sanity/client'

const token = process.env.SANITY_TOKEN
if (!token) {
  console.error('Missing SANITY_TOKEN env var')
  process.exit(1)
}

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const doc = {
  _id: 'landingPage',
  _type: 'landingPage',
  hero: {
    headlineDe: 'Die Karte für Menschen, die guten Geschmack haben.',
    headlineEn: 'The map for people who care about food.',
    bodyDe: 'Sorgfältig kuratierte Restaurants, Cafés und Bars — mit ausgewählten Must Eats in ganz Berlin. Entdecke Orte, die wir wirklich empfehlen.',
    bodyEn: 'Carefully curated restaurants, cafés and bars — with selected must eats across Berlin. Discover places we genuinely recommend.',
    ctaLabelDe: 'Karte erkunden',
    ctaLabelEn: 'Explore the Map',
    ctaHref: '/',
  },
  trustBar: {
    lineDe: '{count}+ kuratierte Orte · Regelmäßig aktualisiert',
    lineEn: '{count}+ curated spots · Updated regularly',
  },
  mapPreview: {
    headlineDe: 'Eine kuratierte Art, Berlin zu entdecken.',
    headlineEn: 'A curated way to explore Berlin.',
    bodyDe: 'Eat This ist eine kuratierte Food-Map mit Restaurants, Cafés, Bars und Bäckereien in Berlin. Vom Mittagslunch über Coffee-Spots bis zu Fine-Dining und Late-Night-Drinks — jeder Ort wird nach Qualität und Erfahrung ausgewählt. Für Menschen, die wissen wollen, wo es sich wirklich lohnt zu essen.',
    bodyEn: 'Eat This is a curated food map featuring restaurants, cafés, bars and bakeries across Berlin. From casual lunches and coffee spots to fine dining restaurants and late-night drinks, every place is selected based on quality and experience. Built for people who care about where they eat.',
  },
  mustEats: {
    headlineDe: 'Mehr als nur Restaurant-Empfehlungen.',
    headlineEn: 'More than restaurant recommendations.',
    bodyDe: 'Jeder Spot auf Eat This erscheint direkt auf der Karte. Für ausgewählte Orte highlighten wir zusätzlich bestimmte Gerichte, die wir besonders empfehlen. Must Eats sind eine zweite Kuratierungs-Ebene — sie helfen dir nicht nur zu entscheiden wohin, sondern auch was du dort bestellst.',
    bodyEn: 'Every featured place on Eat This appears directly on the map. For selected spots, we also highlight specific dishes we especially recommend. Must Eats add another layer of curation — helping you discover not only where to go, but also what to order.',
    ctaLabelDe: 'Erste Must Eat freischalten',
    ctaLabelEn: 'Unlock your first Must Eat',
    ctaHref: '/onboarding',
  },
  howWeCurate: {
    headlineDe: 'Sorgfältig ausgewählt.',
    headlineEn: 'Carefully selected.',
    bodyDe: 'Jede Empfehlung auf Eat This wird von uns persönlich besucht, getestet und kuratiert. Nur Orte, hinter denen wir tatsächlich stehen.',
    bodyEn: 'Every recommendation on Eat This is personally visited, tested and curated by our team. Only places we genuinely stand behind.',
  },
  insideMap: {
    headlineDe: 'In der Karte.',
    headlineEn: 'Inside the map.',
    itemsDe: [
      'Kuratierte Restaurant-Spots in ganz Berlin',
      'Interaktive Food-Map',
      'Ausgewählte Must Eats für ausgewählte Orte',
      'Entdeckung nach Kategorien',
      'Regelmäßig aktualisierte Empfehlungen',
      'Direkter Zugriff über die Karte',
    ],
    itemsEn: [
      'Curated restaurant spots across Berlin',
      'Interactive food map',
      'Selected Must Eats for featured places',
      'Category-based discovery',
      'Regularly updated recommendations',
      'Direct access through the map',
    ],
  },
  categories: {
    headlineDe: 'Berlin nach Kategorien.',
    headlineEn: 'Explore Berlin by category.',
  },
  recentlyAdded: {
    headlineDe: 'Frisch hinzugefügt.',
    headlineEn: 'Recently added.',
    bodyDe: 'Neue Restaurants, Cafés, Bars und Must Eats kommen regelmäßig dazu.',
    bodyEn: 'New restaurants, cafés, bars and Must Eats are added regularly across Berlin.',
    sectionCtaLabelDe: 'Alles auf der Karte ansehen',
    sectionCtaLabelEn: 'Browse all on the map',
  },
  packs: {
    headlineDe: 'Berlin in Packs entdecken.',
    headlineEn: 'Start exploring Berlin.',
    bodyDe: 'Jedes Pack schaltet eine kuratierte Auswahl an Restaurant-Spots auf der Karte frei — inklusive der Must Eats für ausgewählte Orte. Vom Frühstücks-Spot bis zur Fine-Dining-Adresse: jede Empfehlung ist sorgfältig kuratiert und direkt mit der Karte verknüpft.',
    bodyEn: 'Each pack unlocks a curated selection of restaurant spots on the map — including selected Must Eats for featured places. From breakfast spots and coffee shops to pizza places, fine dining restaurants and bars, every recommendation is carefully curated and connected directly to the map.',
    starter: {
      titleDe: 'Starter Pack — Kostenlos',
      titleEn: 'Starter Pack — Free',
      bodyDe: 'Schalte 10 zufällige Restaurant-Spots und Must Eats in Berlin frei.',
      bodyEn: 'Unlock 10 random restaurant spots and Must Eats across Berlin.',
      ctaLabelDe: 'Jetzt starten',
      ctaLabelEn: 'Get Started',
    },
    category: {
      titleDe: 'Kategorie Packs — €2,99',
      titleEn: 'Category Packs — €2,99',
      bodyDe: 'Schalte kuratierte Restaurant-Empfehlungen und Must Eats frei für:',
      bodyEn: 'Unlock curated restaurant recommendations and Must Eats for:',
      bulletsDe: ['Frühstück', 'Lunch', 'Dinner', 'Süßes', 'Drinks', 'Coffee', 'Fine Dining', 'Pizza', 'Fast Food'],
      bulletsEn: ['Breakfast', 'Lunch', 'Dinner', 'Sweets', 'Drinks', 'Coffee', 'Fine Dining', 'Pizza', 'Fast Food'],
      ctaLabelDe: 'Benachrichtige mich',
      ctaLabelEn: 'Notify me',
    },
    complete: {
      titleDe: 'Complete Berlin — €20',
      titleEn: 'Complete Berlin — €20',
      bodyDe: 'Das volle Erlebnis freischalten:',
      bodyEn: 'Unlock the full experience:',
      bulletsDe: [
        '150+ kuratierte Restaurant-Spots',
        'Ausgewählte Must Eats in ganz Berlin',
        'Alle Kategorien auf der Karte freigeschaltet',
      ],
      bulletsEn: [
        '150+ curated restaurant spots',
        'Selected Must Eats across Berlin',
        'All categories unlocked on the map',
      ],
      ctaLabelDe: 'Benachrichtige mich',
      ctaLabelEn: 'Notify me',
    },
  },
  whyEatThis: {
    headlineDe: 'Für Menschen, die guten Geschmack haben.',
    headlineEn: 'Built for people who care about food.',
    bodyDe: 'Sorgfältig kuratierte Orte, ausgewählte Must Eats — eine bewusstere Art, Berlin zu entdecken.',
    bodyEn: 'Carefully curated places, selected Must Eats and a more thoughtful way to explore Berlin.',
  },
  newsletter: {
    headlineDe: 'Bleib an der Karte dran.',
    headlineEn: 'Stay close to the map.',
    bodyDe: 'Gelegentliche Updates, neue Empfehlungen und ausgewählte Must Eats aus Berlin.',
    bodyEn: 'Occasional updates, new recommendations and selected Must Eats from Berlin.',
    ctaLabelDe: 'Abonnieren',
    ctaLabelEn: 'Subscribe',
  },
  finalCta: {
    headlineDe: 'Berlin durch bessere Empfehlungen entdecken.',
    headlineEn: 'Explore Berlin through better recommendations.',
    bodyDe: 'Restaurants, Cafés, Bars und ausgewählte Must Eats — alles sorgfältig kuratiert.',
    bodyEn: 'Restaurants, cafés, bars and selected Must Eats — all carefully curated.',
    ctaLabelDe: 'Karte erkunden',
    ctaLabelEn: 'Explore the Map',
    ctaHref: '/',
  },
}

console.log('Seeding landingPage doc…')
const res = await client.createOrReplace(doc)
console.log('Done:', res._id, '(rev', res._rev, ')')
