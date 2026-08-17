// One-off import: Maynooth University undergraduate courses.
//
//   node tools/import-maynooth.mjs   writes tools/maynooth-rows.csv

import { importUniversity } from './lib/irish-import.mjs';
import { getHtml, getBuffer } from './lib/ireland.mjs';
import { pdfText } from './lib/pdf.mjs';

// Maynooth publishes its fee schedule only as a PDF, linked from the fees page
// with a version and a date in the filename. The link is discovered rather than
// hardcoded — the file was already at V.2 while search engines still pointed at
// V.1, and a stale fee is exactly the kind of wrong number this project exists
// to avoid.
const FEES_PAGE = 'https://www.maynoothuniversity.ie/student-fees-grants/undergraduate';

async function feesByCode() {
  const page = await getHtml(FEES_PAGE);
  const href = [...page.matchAll(/href="([^"]*EU%20UG%20FEES[^"]*\.pdf)"/gi)]
    .map((m) => m[1])
    .filter((u) => !/PART-TIME/i.test(u))[0];
  if (!href) throw new Error('no EU undergraduate fees PDF linked from the Maynooth fees page');

  const text = pdfText(await getBuffer(new URL(href, FEES_PAGE).href));
  const map = new Map();
  let inconsistent = 0;

  // "MH106 BA - Psychology 3,915 2,500 150 6,565"
  //  code  name              tuition contrib levy total
  for (const m of text.matchAll(/(MH\d{3})\s+(.+?)\s+([\d,]{3,7})\s+([\d,]{3,7})\s+(\d{2,4})\s+([\d,]{3,7})(?=\s|$)/g)) {
    const [, code, , tuition, contrib, levy, total] = m;
    const n = (s) => Number(String(s).replace(/,/g, ''));
    // The PDF has at least one row whose parts do not add up to its stated
    // total (MH402: 4,817 + 2,500 + 150 given as 6,565). Which figure is right
    // is unknowable from here, so the row is left without a fee rather than
    // recorded wrong.
    if (n(tuition) + n(contrib) + n(levy) !== n(total)) { inconsistent++; continue; }
    map.set(code, { eu: n(total) });
  }

  if (inconsistent) console.log(`  maynooth: ${inconsistent} fee rows skipped — the PDF's own parts do not sum to its total`);
  if (map.size < 25) throw new Error(`Maynooth fee PDF parsed only ${map.size} courses — its layout has changed.`);
  return map;
}

await importUniversity({
  universityId: 'maynooth',
  base: 'https://www.maynoothuniversity.ie',
  listUrl: 'https://www.maynoothuniversity.ie/study-maynooth/undergraduate-studies/courses',
  linkRe: /href="(\/study-maynooth\/undergraduate-studies\/courses\/[a-z0-9-]+)"[^>]*>([^<]{4,110})</g,
  // "CAO/MU Apply code : MH106"
  caoCode: (text) => (text.match(/CAO\/MU Apply code\s*:?\s*(MH\d{3})/i) || [])[1]?.toUpperCase() ?? null,
  feesByCode,
  out: 'maynooth-rows.csv',
});
