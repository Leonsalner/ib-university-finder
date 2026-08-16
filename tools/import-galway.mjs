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
  out: 'galway-rows.csv',
});
