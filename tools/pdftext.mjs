// Minimal PDF text extractor: inflate the content streams and pull the strings
// out of the text-showing operators. Enough to read a table, not a renderer.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const file = process.argv[2];
const needle = (process.argv[3] || '').toLowerCase();
const buf = readFileSync(file);

// Walk every "stream ... endstream" and inflate the ones that are Flate encoded.
const chunks = [];
let at = 0;
while (true) {
  const s = buf.indexOf('stream', at);
  if (s === -1) break;
  const e = buf.indexOf('endstream', s);
  if (e === -1) break;
  let start = s + 6;
  if (buf[start] === 0x0d) start++;
  if (buf[start] === 0x0a) start++;
  try { chunks.push(inflateSync(buf.subarray(start, e)).toString('latin1')); } catch {}
  at = e + 9;
}

// Pull the literal strings out of Tj / TJ / ' / " operators.
const decode = (raw) => raw
  .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
  .replace(/\\([()\\])/g, '$1');

const pages = chunks.map((c) => {
  const parts = [];
  const re = /\(((?:[^()\\]|\\.)*)\)\s*(Tj|TJ|'|")|\[((?:[^\][\\]|\\.)*)\]\s*TJ/g;
  let m;
  while ((m = re.exec(c))) {
    if (m[1] !== undefined) parts.push(decode(m[1]));
    else if (m[3] !== undefined) {
      const inner = /\(((?:[^()\\]|\\.)*)\)/g;
      let n; const line = [];
      while ((n = inner.exec(m[3]))) line.push(decode(n[1]));
      parts.push(line.join(''));
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}).filter((t) => t.length > 20);

console.log(`streams: ${chunks.length}, text blocks: ${pages.length}`);

if (needle) {
  const hits = pages.map((t, i) => ({ i, t })).filter(({ t }) => t.toLowerCase().includes(needle));
  console.log(`blocks containing "${needle}": ${hits.length}`);
  for (const { i, t } of hits.slice(0, 6)) {
    console.log(`\n----- block ${i} -----`);
    console.log(t.slice(0, 3000));
  }
} else {
  console.log(pages.slice(0, 3).join('\n---\n').slice(0, 2000));
}
