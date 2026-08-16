// One-off import: Dublin City University undergraduate courses.
//
//   node tools/import-dcu.mjs        writes tools/dcu-rows.csv

import { importUniversity } from './lib/irish-import.mjs';

await importUniversity({
  universityId: 'dcu',
  base: 'https://www.dcu.ie',
  listUrl: 'https://www.dcu.ie/courses',
  // /courses/undergraduate/<faculty>/<course-slug>
  linkRe: /href="(\/courses\/undergraduate\/[a-z0-9-]+\/[a-z0-9-]+)"[^>]*>([^<]{4,110})</g,
  // "CAO Code: DC115"
  caoCode: (text) => (text.match(/CAO Code:?\s*(DC\d{3})/i) || [])[1]?.toUpperCase() ?? null,
  // Church of Ireland, Gaeltacht and Irish Sign Language teaching pathways are
  // restricted routes a Slovak IB applicant cannot enter.
  skip: (title) => /church of ireland|gaeltacht|sign language|restricted/i.test(title),
  out: 'dcu-rows.csv',
});
