// Read the text out of a PDF, for eyeballing a fee schedule or a points table.
//
//   node tools/pdftext.mjs <file.pdf> [search term]
//
// The extractor itself lives in tools/lib/pdf.mjs so importers can use it too.

import { readFileSync } from 'node:fs';
import { pdfTextBlocks } from './lib/pdf.mjs';

const file = process.argv[2];
const needle = (process.argv[3] || '').toLowerCase();
const pages = pdfTextBlocks(readFileSync(file));

console.log(`text blocks: ${pages.length}`);

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
