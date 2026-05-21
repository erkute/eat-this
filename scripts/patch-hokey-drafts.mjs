// Patches the 2 Hokey Pokey filiale drafts with Voice-B content (Filialen-Template),
// then publishes them. Brand-Lead derived from hokey-pokey-stargarder, Standort-Tails
// per location.

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN

if (!TOKEN) { console.error('Missing SANITY_TOKEN'); process.exit(1) }

const MUTATION_URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}?returnIds=true`

const BOUTIQUE_DRAFT = 'drafts.7fc51377-0917-4ea4-ac5c-409bff7e4c7b'
const MITTE_DRAFT = 'drafts.f21bc5d6-a70c-4f0a-a764-2a568ceae98e'

const BOUTIQUE_CONTENT = {
  description: 'Hokey Pokey hat sich als Eispatisserie etabliert und nicht als klassische Eisdiele — französisches und italienisches Patisserie-Handwerk trifft Fine-Dining-Aromatik. Die Boutique gegenüber dem Stammhaus in der Stargarder 72 läuft mehr als Concept-Store: neben dem Eis stehen Tafeln Schokolade aus eigener Produktion in der Auslage. Pralinen und Marken-T-Shirts ergänzen die Theke, die Idee ist die Eismarke zum Mitnehmen statt zum Sofortverzehr. Die Sortenkarte spiegelt das Stammhaus in kleinerer Auswahl, mit dem signature Butter-Karamell-Popcorn als Anker und den rotierenden Patisserie-Linien drumherum.',
  descriptionEn: 'Hokey Pokey runs as an ice-cream patisserie rather than a classic ice parlour — French and Italian patisserie craft meets fine-dining flavour thinking. The Boutique across the street from the Stargarder 72 main house leans more concept-store: alongside the scoops, the case carries bars of in-house chocolate. Pralines and branded T-shirts round out the counter, the idea being to take the brand home rather than eat it on the spot. The flavour board mirrors the main house in shorter form, with the signature butter-caramel-popcorn as anchor and the rotating patisserie lines around it.',
  shortDescription: 'Boutique gegenüber dem Hokey-Pokey-Stammhaus in der Stargarder — Eis, eigene Schokolade und Marken-T-Shirts unter einem Dach.',
  shortDescriptionEn: 'Boutique across from the Hokey Pokey main house on Stargarder — ice cream, in-house chocolate and branded T-shirts under one roof.',
  tip: 'Tafeln Schokolade und Pralinen sind das, was im Stammhaus gegenüber nicht steht — wer ein Geschenk mitnehmen will, kommt hierher statt in die Eisdiele.',
  tipEn: "The chocolate bars and pralines are the things the main house across the street doesn't carry — pick this side if you're after a take-home gift, not a scoop.",
  instagramHandle: 'eispatisserie_hokeypokey',
  seo: {
    metaTitle: 'Hokey Pokey Boutique — Eis & Concept-Store in Prenzlauer Berg',
    metaTitleEn: 'Hokey Pokey Boutique — Ice Cream & Concept Store in Prenzlauer Berg',
    metaDescription: 'Boutique-Filiale gegenüber dem Hokey-Pokey-Stammhaus in der Stargarder Straße — Eispatisserie, eigene Schokoladentafeln, Pralinen und Marken-Merch.',
    metaDescriptionEn: 'Boutique branch across from the Hokey Pokey main house on Stargarder Straße — ice-cream patisserie, in-house chocolate bars, pralines and branded merch.',
  },
}

const MITTE_CONTENT = {
  description: 'Hokey Pokey hat sich als Eispatisserie etabliert und nicht als klassische Eisdiele — französisches und italienisches Patisserie-Handwerk trifft Fine-Dining-Aromatik. In Mitte sitzt die Filiale auf der Torstraße, dem Boulevard zwischen Rosenthaler Platz und Alex, und hält die Theke deutlich länger offen als der Rest der Familie. Die Sortenkarte folgt dem Stammhaus mit Butter-Karamell-Popcorn als Signature und rotierenden Patisserie-Linien. Daneben Geschenkpackungen, Stoffbeutel und kleine Süßwaren — das Format Eis plus Mitbringsel funktioniert hier neben dem Lauf-Publikum aus der Torstraße bis 22 Uhr.',
  descriptionEn: 'Hokey Pokey reads as an ice-cream patisserie rather than a classic ice parlour — French and Italian patisserie craft meets fine-dining flavour thinking. In Mitte the branch sits on Torstraße, the boulevard between Rosenthaler Platz and Alex, and keeps the counter open noticeably later than the rest of the family. The flavour board follows the main house with butter-caramel-popcorn as signature and the rotating patisserie lines around it. Around the scoops, gift packs, tote bags and small sweets fill the shelves — the format ice plus take-home works here alongside the Torstraße foot traffic, running until 22:00.',
  shortDescription: 'Mitte-Filiale auf der Torstraße zwischen Rosenthaler Platz und Alex — Hokey Pokey mit längeren Abendzeiten und Mitbringsel-Sortiment.',
  shortDescriptionEn: 'Mitte branch on Torstraße between Rosenthaler Platz and Alex — Hokey Pokey with longer evening hours and a take-home line.',
  tip: 'Hier läuft die Theke bis 22 Uhr — der Move für nach dem Abendessen in Mitte, wenn Stargarder und Pankow schon dichtgemacht haben.',
  tipEn: 'The counter runs until 22:00 — the move for after-dinner in Mitte, when Stargarder and Pankow have already closed.',
  instagramHandle: 'eispatisserie_hokeypokey',
  seo: {
    metaTitle: 'Hokey Pokey Mitte — Eispatisserie auf der Torstraße',
    metaTitleEn: 'Hokey Pokey Mitte — Ice-Cream Patisserie on Torstraße',
    metaDescription: 'Mitte-Filiale der Hokey-Pokey-Eispatisserie auf der Torstraße — rotierende Sorten, Butter-Karamell-Popcorn als Signature, Theke bis 22 Uhr.',
    metaDescriptionEn: 'Mitte branch of the Hokey Pokey ice-cream patisserie on Torstraße — rotating flavours, butter-caramel-popcorn signature, counter open until 22:00.',
  },
}

const mutations = [
  { patch: { id: BOUTIQUE_DRAFT, set: BOUTIQUE_CONTENT } },
  { patch: { id: MITTE_DRAFT, set: MITTE_CONTENT } },
]

const res = await fetch(MUTATION_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({ mutations }),
})
const out = await res.json()
if (out.error) { console.error('Sanity error:', JSON.stringify(out.error, null, 2)); process.exit(1) }
console.log('OK:', JSON.stringify(out, null, 2))
