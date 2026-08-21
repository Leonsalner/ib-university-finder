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
  // Take contribution + levy, which Galway also prints as its "Total Fee"
  // column. That is what a Free Fees student pays; the larger "Total EU Fee"
  // is for EU applicants who do not qualify, and Galway's own page says most
  // CAO applicants do. The levy is 340 rather than 140 on five courses, which
  // is why this stays per course instead of becoming a university default.
  fees: (text) => {
    const m = text.match(
      /Total EU Fee Total Non-EU Fee\s+\S+\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)\s+€\s?([\d,]+)/,
    );
    if (!m) return {};
    const n = (s) => Number(s.replace(/,/g, ''));
    const [tuition, contribution, , levy, , totalEu, totalNonEu] = m.slice(1).map(n);
    if (tuition + contribution + levy !== totalEu) return {};
    return { eu: contribution + levy, noneu: totalNonEu };
  },
  out: 'galway-rows.csv',
});
