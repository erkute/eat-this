/**
 * Patch all Must-Eat cards with data read from the card images.
 * Run: node patch-musteats.mjs
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
})

const cards = [
  { id: 'mustead-main',    order: 0,  dish: 'Banh Mi',          restaurant: 'Saveur',               district: 'Schöneberg',      description: 'Baguette, tofu, vegan pâté & mayonnaise, marinated radish & carrots, cucumber' },
  { id: 'mustead-main-1',  order: 1,  dish: 'Spicy Thai Sausage', restaurant: 'Bar Basta',           district: 'Mitte',           description: 'With mashed potatoes & ginger jus' },
  { id: 'mustead-main-2',  order: 2,  dish: 'Biang Biang Lamb', restaurant: 'Wen Cheng',             district: 'Prenzlauer Berg', description: 'Lamb, Wencheng sauce, cumin, scallions, red bell pepper, garlic, cilantro, and mint' },
  { id: 'mustead-main-3',  order: 3,  dish: 'Pizza',            restaurant: 'Gemello',               district: 'Prenzlauer Berg', description: 'Pumpkin cream, vegan Salsicia, mushrooms & sauteed parsley stems, chestnut crunch' },
  { id: 'mustead-main-4',  order: 4,  dish: 'Galette',          restaurant: 'Bubar',                 district: 'Charlottenburg',  description: 'Authentic Breton buckwheat galette with a fried egg – crispy and handmade' },
  { id: 'mustead-main-5',  order: 5,  dish: 'Ice Cream',        restaurant: 'Hokey Pokey',           district: 'Prenzlauer Berg', description: 'Insanely creamy, handcrafted ice cream packed with pure, intense flavors' },
  { id: 'mustead-main-6',  order: 6,  dish: 'Tomate Slice',     restaurant: 'Slice Society',         district: 'Mitte',           description: 'Tomato sauce, garlic butter breadcrumbs, chili oil, olive oil' },
  { id: 'mustead-main-7',  order: 7,  dish: 'Pizza Aubergine',  restaurant: 'Gazzo',                 district: 'Neukölln',        description: 'Geröstete Auberginen, Parmesan, Knoblauch, Mozzarella, Basilikum, Tomatensauce' },
  { id: 'mustead-main-8',  order: 8,  dish: 'Morning Bun',      restaurant: 'Sofi',                  district: 'Mitte',           description: 'Croissant dough infused with aromatic cardamom and zesty orange' },
  { id: 'mustead-main-9',  order: 9,  dish: 'Cappuccino',       restaurant: 'Jules Coffee & Roastery', district: 'Schöneberg',    description: 'Not your average coffee' },
  { id: 'mustead-main-10', order: 10, dish: 'ODB Sandwich',     restaurant: 'Bar Basta',             district: 'Mitte',           description: 'Meatball, melting onions, kale and ricotta salata in a milk bun' },
  { id: 'mustead-main-11', order: 11, dish: 'Cookies',          restaurant: 'Jones Ice Cream',       district: 'Schöneberg',      description: 'Big, flat, and soft at heart — baked with golden edges and a chewy center' },
  { id: 'mustead-main-12', order: 12, dish: 'Döner',            restaurant: 'Hasir',                 district: 'Kreuzberg',       description: 'Juicy veal, fresh salad, and signature sauces in crispy bread' },
  { id: 'mustead-main-13', order: 13, dish: 'Rinder Schaufel',  restaurant: 'Schüsseldienst',        district: 'Schöneberg',      description: '18hr slow-cooked | Potato-leek mash, sesame-soy zucchini, chili pearls, napa' },
  { id: 'mustead-main-14', order: 14, dish: 'Sabich',           restaurant: 'Kitten Deli',           district: 'Kreuzberg',       description: 'Roasted eggplant with tahini, soft-boiled egg, potatoes, mango chutney, and harissa' },
  { id: 'mustead-main-15', order: 15, dish: 'Sandwich',         restaurant: "Romeo's",               district: 'Kreuzberg',       description: 'Vegan Szechuan tofu, chili crisp, and coriander mayo on fluffy potato bread' },
  { id: 'mustead-main-16', order: 16, dish: 'Grilled Cheese',   restaurant: 'Aera',                  district: 'Charlottenburg',  description: 'Fresh bread, with butter, cheese and egg' },
  { id: 'mustead-main-17', order: 17, dish: 'Donut',            restaurant: 'Atelier Dough',         district: 'Kreuzberg',       description: 'Not so plain donut' },
  { id: 'mustead-main-18', order: 18, dish: 'Single Burger',    restaurant: 'All In.',               district: 'Prenzlauer Berg', description: 'Beef patty, american cheese, grilled onions, cornichons, secret sauce' },
  { id: 'mustead-main-19', order: 19, dish: 'Breakfast Plate',  restaurant: 'Sofi',                  district: 'Mitte',           description: 'Sourdough bread with whipped butter, sea salt, cheese and a soft-boiled egg' },
]

console.log(`Patching ${cards.length} must-eat cards…`)

for (const c of cards) {
  await client.patch(c.id).set({
    dish:        c.dish,
    restaurant:  c.restaurant,
    district:    c.district,
    price:       c.price || '',
    order:       c.order,
    description: c.description,
  }).commit()
  console.log(`  ✓ ${c.dish} — ${c.restaurant}`)
}

console.log('✅ All cards updated.')
