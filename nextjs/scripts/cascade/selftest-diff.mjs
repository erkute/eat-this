// Self-test for diff-details.mjs: mutate exactly one value in a copy of the B
// snapshot and confirm the diff reports exactly one differing cell, naming the
// right property. A diff that cannot fail is not evidence.

// Self-test for diff-details.mjs: mutate exactly one value in a copy of the B
// snapshot and confirm the diff reports exactly one differing cell. A diff that
// cannot fail is not evidence.
import { readFileSync, writeFileSync } from 'node:fs';
const SEP = '\u0001';
let j = JSON.parse(readFileSync('details-B.json', 'utf8'));
if (typeof j === 'string') j = JSON.parse(j);
const state = j.restaurant['320x720'].byState['detail/kind=restaurant'];
const key = Object.keys(state)[0];
const parts = state[key].split(SEP);
const idx = 57;
const was = parts[idx];
parts[idx] = 'MUTATED';
state[key] = parts.join(SEP);
writeFileSync('details-B-mutated.json', JSON.stringify(JSON.stringify(j)));
console.log(`mutated ${key} value #${idx}: "${was}" -> "MUTATED"`);
