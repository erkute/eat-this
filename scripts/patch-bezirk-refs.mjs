// Patches all restaurant documents with bezirkRef based on their district field
// Usage: SANITY_TOKEN=xxx node scripts/patch-bezirk-refs.mjs

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('Missing SANITY_TOKEN')
  process.exit(1)
}

const BEZIRK_MAP = {
  'Kreuzberg':       '12c567c0-8063-4962-a4f0-69e7fca6f14a',
  'Neukölln':        'c3a8c2cb-9229-44f2-ae4c-30c742ae9318',
  'Mitte':           '43309b8f-1475-4dd4-891b-8da8d03d5438',
  'Prenzlauer Berg': '078e666d-4af3-4ac6-80ae-1ea4c6862ef3',
  'Charlottenburg':  'd75c5a02-5f30-46a1-96ee-d33b30f2f3aa',
  'Schöneberg':      '6a763728-fdbe-4a45-a474-08b452b6574a',
  'Friedrichshain':  '1bb055dc-29fc-4110-b81d-941a897dfd70',
  'Steglitz':        '0c5cbeb4-1291-4264-8ee2-37ecc288b83d',
  'Wedding':         '4a2ea57e-9869-4828-9805-96d44c08224c',
  'Dahlem':          'fadc8cf5-3ae5-46bb-9da7-961579bae8af',
}

const RESTAURANTS = [
  { _id: 'restaurant-aerde-restaurant', district: 'Kreuzberg' },
  { _id: 'restaurant-akkurat-caf', district: 'Kreuzberg' },
  { _id: 'restaurant-albatross-b-ckerei', district: 'Kreuzberg' },
  { _id: 'restaurant-alt-berliner-wirtshaus-henne', district: 'Kreuzberg' },
  { _id: 'restaurant-anima', district: 'Friedrichshain' },
  { _id: 'restaurant-ari-s', district: 'Kreuzberg' },
  { _id: 'restaurant-atelier-dough', district: 'Kreuzberg' },
  { _id: 'restaurant-aviv-030', district: 'Neukölln' },
  { _id: 'restaurant-babka-krantz', district: 'Steglitz' },
  { _id: 'restaurant-bar-basta', district: 'Mitte' },
  { _id: 'restaurant-barra', district: 'Neukölln' },
  { _id: 'restaurant-bergmanns', district: 'Kreuzberg' },
  { _id: 'restaurant-berlin-burger-international', district: 'Neukölln' },
  { _id: 'restaurant-berta-restaurant', district: 'Kreuzberg' },
  { _id: 'restaurant-bertie', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-beuster', district: 'Neukölln' },
  { _id: 'restaurant-boii-boii', district: 'Kreuzberg' },
  { _id: 'restaurant-bonanza-coffee-heroes', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-borchardt', district: 'Mitte' },
  { _id: 'restaurant-bottega-seppel', district: 'Charlottenburg' },
  { _id: 'restaurant-boutique-de-la-maison', district: 'Kreuzberg' },
  { _id: 'restaurant-buya-ramen-factory', district: 'Kreuzberg' },
  { _id: 'restaurant-caligari', district: 'Neukölln' },
  { _id: 'restaurant-capvin-rosenh-fe', district: 'Mitte' },
  { _id: 'restaurant-ch-let-suisse', district: 'Dahlem' },
  { _id: 'restaurant-chipperfield-kantine', district: 'Mitte' },
  { _id: 'restaurant-chungking-noodles', district: 'Kreuzberg' },
  { _id: 'restaurant-cocolo-ramen-mitte', district: 'Mitte' },
  { _id: 'restaurant-coda-dessert-dining', district: 'Neukölln' },
  { _id: 'restaurant-common', district: 'Neukölln' },
  { _id: 'restaurant-companion-tee-kaffee', district: 'Neukölln' },
  { _id: 'restaurant-concierge-coffee', district: 'Kreuzberg' },
  { _id: 'restaurant-crapulix', district: 'Steglitz' },
  { _id: 'restaurant-diener-tattersall', district: 'Charlottenburg' },
  { _id: 'restaurant-doubleeye', district: 'Schöneberg' },
  { _id: 'restaurant-doyum-restaurant', district: 'Kreuzberg' },
  { _id: 'restaurant-engelsbecken', district: 'Charlottenburg' },
  { _id: 'restaurant-enoiteca-il-calice', district: 'Charlottenburg' },
  { _id: 'restaurant-estelle', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-father-carpenter', district: 'Mitte' },
  { _id: 'restaurant-file-asto', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-five-elephant', district: 'Kreuzberg' },
  { _id: 'restaurant-fr-hst-ck-3000', district: 'Schöneberg' },
  { _id: 'restaurant-frau-mittenmang', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-freundschaft', district: 'Mitte' },
  { _id: 'restaurant-gazzo', district: 'Neukölln' },
  { _id: 'restaurant-gemello', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-gnam-pasta-factory', district: 'Kreuzberg' },
  { _id: 'restaurant-hasir', district: 'Schöneberg' },
  { _id: 'restaurant-imren-grill-restaurant', district: 'Schöneberg' },
  { _id: 'restaurant-ita-bistro', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-jaja', district: 'Neukölln' },
  { _id: 'restaurant-johann-b-ckerei', district: 'Schöneberg' },
  { _id: 'restaurant-jolie-bistrot', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-jones-ice-cream', district: 'Schöneberg' },
  { _id: 'restaurant-jules-geisberg', district: 'Schöneberg' },
  { _id: 'restaurant-julius', district: 'Wedding' },
  { _id: 'restaurant-jungbluth', district: 'Steglitz' },
  { _id: 'restaurant-kanal61', district: 'Kreuzberg' },
  { _id: 'restaurant-kitten-deli', district: 'Neukölln' },
  { _id: 'restaurant-kn-delwirtschaft-nord', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-kur-me', district: 'Kreuzberg' },
  { _id: 'restaurant-la-bolognina', district: 'Neukölln' },
  { _id: 'restaurant-la-c-te', district: 'Neukölln' },
  { _id: 'restaurant-la-cantine-d-augusta', district: 'Schöneberg' },
  { _id: 'restaurant-lala', district: 'Kreuzberg' },
  { _id: 'restaurant-le-balto', district: 'Neukölln' },
  { _id: 'restaurant-liu-du', district: 'Mitte' },
  { _id: 'restaurant-mamida', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-material', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-nanum', district: 'Kreuzberg' },
  { _id: 'restaurant-november-brasserie', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-onette', district: 'Schöneberg' },
  { _id: 'restaurant-ora-restaurant-wine-bar', district: 'Kreuzberg' },
  { _id: 'restaurant-otto', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-philomeni-s-greek-delicious', district: 'Charlottenburg' },
  { _id: 'restaurant-pinci', district: 'Mitte' },
  { _id: 'restaurant-pluto', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-restaurant-893-ry-tei', district: 'Charlottenburg' },
  { _id: 'restaurant-restaurant-jolesch', district: 'Kreuzberg' },
  { _id: 'restaurant-san', district: 'Mitte' },
  { _id: 'restaurant-sardinen-bar', district: 'Schöneberg' },
  { _id: 'restaurant-sasaya', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-sathutu', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-saveur-de-b-nh-m', district: 'Schöneberg' },
  { _id: 'restaurant-sch-sseldienst', district: 'Schöneberg' },
  { _id: 'restaurant-schmidt-z-ko', district: 'Steglitz' },
  { _id: 'restaurant-sfera', district: 'Neukölln' },
  { _id: 'restaurant-sh-do-udon-lab', district: 'Friedrichshain' },
  { _id: 'restaurant-smash-d-eatery-x-forn-simsim', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-sofi', district: 'Mitte' },
  { _id: 'restaurant-soi-co-plant-based-cafe', district: 'Mitte' },
  { _id: 'restaurant-soopoollim', district: 'Mitte' },
  { _id: 'restaurant-sori-ramen', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-spumante', district: 'Kreuzberg' },
  { _id: 'restaurant-st-bart', district: 'Kreuzberg' },
  { _id: 'restaurant-sterelli', district: 'Charlottenburg' },
  { _id: 'restaurant-stoke', district: 'Kreuzberg' },
  { _id: 'restaurant-story-coffee-r-sterei-p-berg', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-sway', district: 'Neukölln' },
  { _id: 'restaurant-tacos-el-rey', district: 'Kreuzberg' },
  { _id: 'restaurant-taktil', district: 'Neukölln' },
  { _id: 'restaurant-takumi-nine-1', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-teller-berlin', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-the-barn-caf', district: 'Mitte' },
  { _id: 'restaurant-the-grain', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-tribeca-ice-cream', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-trio', district: 'Mitte' },
  { _id: 'restaurant-w-pizza-mitte', district: 'Mitte' },
  { _id: 'restaurant-wen-cheng-1', district: 'Prenzlauer Berg' },
  { _id: 'restaurant-westberlin', district: 'Kreuzberg' },
  { _id: 'restaurant-zeit-caf', district: 'Schöneberg' },
  { _id: 'restaurant-zum-heiligen-teufel', district: 'Kreuzberg' },
]

const MUTATION_URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`

async function patchBatch(mutations) {
  const res = await fetch(MUTATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ mutations }),
  })
  return res.json()
}

let patched = 0
const BATCH = 20

for (let i = 0; i < RESTAURANTS.length; i += BATCH) {
  const chunk = RESTAURANTS.slice(i, i + BATCH)
  const mutations = chunk.map(r => {
    const bezirkId = BEZIRK_MAP[r.district]
    if (!bezirkId) {
      console.warn(`No Bezirk found for district: ${r.district} (${r._id})`)
      return null
    }
    return {
      patch: {
        id: r._id,
        set: {
          bezirkRef: { _type: 'reference', _ref: bezirkId },
        },
      },
    }
  }).filter(Boolean)

  const result = await patchBatch(mutations)
  if (result.error) {
    console.error('Error:', result.error)
    process.exit(1)
  }
  patched += chunk.length
  console.log(`Patched ${patched}/${RESTAURANTS.length}...`)
}

console.log('\nDone! All restaurants linked to their Bezirk.')
