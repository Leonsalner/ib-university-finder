// Minimal PDF text extractor: inflate the content streams and pull the strings
// out of the text-showing operators. Enough to read a table, not a renderer.
//
// This was tools/pdftext.mjs, which is now the command-line wrapper around it.
// Maynooth publishes its fee schedule only as a PDF, so an importer needs it
// too.

import { inflateSync } from 'node:zlib';

const decode = (raw) => raw
  .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
  .replace(/\\([()\\])/g, '$1');

/** Every text block in the PDF, one string per content stream. */
export function pdfTextBlocks(buf) {
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
    try { chunks.push(inflateSync(buf.subarray(start, e)).toString('latin1')); } catch { /* not deflate */ }
    at = e + 9;
  }

  return chunks.map((c) => {
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
}

/** Every block joined, for when you just want to run one regex over the lot. */
export const pdfText = (buf) => pdfTextBlocks(buf).join('\n');
