// One-off cleanup:
//   - Rename Hokey Pokey Stargarder + Pankow docs (slug + name)
//   - Hart löschen: jones-ice-cream-2 + tribeca-ice-cream-prenzlauer-berg (published + drafts)
// Usage:
//   set -a; source scripts/.env.local; set +a
//   node scripts/cleanup-hokey-jones-tribeca.mjs

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('Missing SANITY_TOKEN')
  process.exit(1)
}

const MUTATION_URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}?returnIds=true`

// Phase A: completed in transaction ffKd9pj67s5LKcJ2ljRLYM (2 renames + 2 deletes)
// Phase B (partial): Oderberger-Doc rename
const ODERBERGER_ID = 'dc6cb5ca-5419-4957-b789-fe1eb4e4b4df'   // current slug: eispatisserie-hokey-pokey-prenzlauer-berg

const mutations = [
  {
    patch: {
      id: ODERBERGER_ID,
      set: {
        name: 'Hokey Pokey Oderberger',
        'slug': { _type: 'slug', current: 'hokey-pokey-oderberger' },
      },
    },
  },
]

const res = await fetch(MUTATION_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
  body: JSON.stringify({ mutations }),
})

const out = await res.json()
if (out.error) {
  console.error('Sanity error:', JSON.stringify(out.error, null, 2))
  process.exit(1)
}
console.log('OK:', JSON.stringify(out, null, 2))
