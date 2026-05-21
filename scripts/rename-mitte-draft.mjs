// Rename the freshly-imported Mitte draft to match Filialen-Pattern
//   name: Eispatisserie Hokey Pokey Mitte → Hokey Pokey Mitte
//   slug: eispatisserie-hokey-pokey-mitte → hokey-pokey-mitte

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN

if (!TOKEN) { console.error('Missing SANITY_TOKEN'); process.exit(1) }

const MUTATION_URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}?returnIds=true`

const DRAFT_ID = 'drafts.f21bc5d6-a70c-4f0a-a764-2a568ceae98e'

const mutations = [
  {
    patch: {
      id: DRAFT_ID,
      set: {
        name: 'Hokey Pokey Mitte',
        slug: { _type: 'slug', current: 'hokey-pokey-mitte' },
      },
    },
  },
]

const res = await fetch(MUTATION_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({ mutations }),
})
const out = await res.json()
if (out.error) { console.error('Sanity error:', JSON.stringify(out.error, null, 2)); process.exit(1) }
console.log('OK:', JSON.stringify(out, null, 2))
