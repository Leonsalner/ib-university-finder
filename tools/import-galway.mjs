// One-off import: University of Galway undergraduate courses.
//
//   node tools/import-galway.mjs     writes tools/galway-rows.csv

import { importUniversity } from './lib/irish-import.mjs';

await importUniversity({
  universityId: 'galway',
  base: 'https://www.universityofgalway.ie',
  listUrl: 'https://www.universityofgalway.ie/courses/undergraduate-courses/',
  // Links on the index are written relative to a sibling directory
  // ("/courses/undergraduate-courses/../undergraduate-courses/x.html"). Each
  // course is linked twice, once under its title and once under its CAO code;
  // the runner dedupes on the URL and keeps the first, which is the title.
  linkRe: /href="([^"]*\/undergraduate-courses\/[a-zA-Z0-9_%À-ſ-]+\.html)"[^>]*>([^<]{4,110})</g,
  // "CAO Code GY104 CAO Points 541 (2025)"
  caoCode: (text) => (text.match(/CAO Code\s+(G[YZ]\d{3})/i) || [])[1]?.toUpperCase() ?? null,
  // Every Galway course page carries its own fee table:
  //
  //   EU Tuition | Student Contribution | Non-EU Tuition | Levy |
  //   Total Fee  | Total EU Fee         | Total Non-EU Fee
  //
  // These genuinely differ by course — Arts is €5,738 and Allied Health is
  // €8,208 — so there is no university default any more. There used to be one,
  // set to €5,738, and it was right for exactly one of the 54 courses.
  //
  // "Total EU Fee" is the column to take: tuition + contribution + levy, which
  // is what an applicant without three years' EU residency pays. "Total Fee" is
  // the smaller number a Free Fees student pays and would understate the cost.
  // The row is skipped unless those three parts actually sum to it.
  fees: (text) => {
    const m = text.match(
      /Total EU Fee Total Non-EU Fee\s+\S+\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)/,
    );
    if (!m) return {};
    const n = (s) => Number(s.replace(/,/g, ''));
    const [tuition, contribution, , levy, , totalEu, totalNonEu] = m.slice(1).map(n);
    if (tuition + contribution + levy !== totalEu) return {};
    return { eu: totalEu, noneu: totalNonEu };
  },
  out: 'galway-rows.csv',
});
