// Diff two sweep snapshots. node diff.mjs A.json B.json [noise.json]
// With a third argument, cells listed there (run-to-run noise) are subtracted,
// so what remains is attributable to the CSS change and nothing else.
import { readFileSync, writeFileSync } from 'node:fs';

// browser_evaluate stores the returned string, so the file is JSON-in-JSON.
const load = (p) => {
  let v = JSON.parse(readFileSync(p, 'utf8'));
  if (typeof v === 'string') v = JSON.parse(v);
  return v;
};
const [aPath, bPath, noisePath] = process.argv.slice(2);
const A = load(aPath);
const B = load(bPath);
const noise = noisePath ? new Set(load(noisePath)) : new Set();

const diffs = [];
for (const vp of Object.keys(A)) {
  const sa = A[vp]?.byState ?? {};
  const sb = B[vp]?.byState ?? {};
  for (const state of Object.keys(sa)) {
    for (const cls of Object.keys(sa[state] ?? {})) {
      const ca = sa[state][cls] ?? {};
      const cb = sb[state]?.[cls] ?? {};
      for (const prop of Object.keys(ca)) {
        if (ca[prop] === cb[prop]) continue;
        const key = `${vp}|${state}|${cls}|${prop}`;
        if (noise.has(key)) continue;
        diffs.push({ key, vp, state, cls, prop, a: ca[prop], b: cb[prop] });
      }
    }
  }
}

let cells = 0;
for (const vp of Object.keys(A))
  for (const state of Object.keys(A[vp].byState))
    for (const cls of Object.keys(A[vp].byState[state]))
      cells += Object.keys(A[vp].byState[state][cls]).length;

console.log(`${aPath} → ${bPath}`);
console.log(
  `  compared ${cells} cells, ${diffs.length} differ${noise.size ? ` (after subtracting ${noise.size} noise cells)` : ''}\n`
);

// group identical (cls, prop, a→b) so 24 states collapse to one line
const groups = new Map();
for (const d of diffs) {
  const k = `${d.cls}|${d.prop}|${d.a}|${d.b}`;
  if (!groups.has(k)) groups.set(k, { ...d, vps: new Set(), states: new Set(), n: 0 });
  const g = groups.get(k);
  g.vps.add(d.vp);
  g.states.add(d.state);
  g.n++;
}
for (const g of [...groups.values()].sort((x, y) => y.n - x.n)) {
  console.log(
    `.${g.cls} { ${g.prop} }  ×${g.n}  vp=[${[...g.vps].join(',')}]  states=${g.states.size}/24`
  );
  console.log(`    A: ${String(g.a).slice(0, 120)}`);
  console.log(`    B: ${String(g.b).slice(0, 120)}`);
}

if (process.env.WRITE_KEYS) {
  writeFileSync(process.env.WRITE_KEYS, JSON.stringify(diffs.map((d) => d.key)));
  console.log(`\nwrote ${diffs.length} keys to ${process.env.WRITE_KEYS}`);
}
