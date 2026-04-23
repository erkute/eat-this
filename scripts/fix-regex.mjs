import { readFileSync, writeFileSync } from 'fs'

const path = '/Users/ersane/Downloads/Projekte/Eat This/nextjs/public/js/app.min.js'
let code = readFileSync(path, 'utf8')

// The broken regex /^/news// needs to be /^\/news\//
const broken = String.raw`/^/news//`
const fixed = '/^\\/news\\/'  // represents the regex literal /^\/news\//
// Actually build the correct string character by character
const correctRegex = '/^' + '\\' + '/news' + '\\' + '//'

console.log('Looking for:', JSON.stringify(broken))
console.log('Replacing with:', JSON.stringify(correctRegex))

const idx = code.indexOf(broken)
if (idx === -1) {
  console.log('Pattern not found!')
  process.exit(1)
}

code = code.slice(0, idx) + correctRegex + code.slice(idx + broken.length)
writeFileSync(path, code)

// Verify
const verify = readFileSync(path, 'utf8')
const newIdx = verify.indexOf(broken)
console.log(newIdx === -1 ? '✓ Broken pattern gone' : '✗ Still broken!')
console.log('Context after fix:', JSON.stringify(verify.slice(idx - 20, idx + 40)))
