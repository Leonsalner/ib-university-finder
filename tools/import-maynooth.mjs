// One-off import: Maynooth University undergraduate courses.
//
//   node tools/import-maynooth.mjs   writes tools/maynooth-rows.csv

import { importUniversity } from './lib/irish-import.mjs';

await importUniversity({
  universityId: 'maynooth',
  base: 'https://www.maynoothuniversity.ie',
  listUrl: 'https://www.maynoothuniversity.ie/study-maynooth/undergraduate-studies/courses',
  linkRe: /href="(\/study-maynooth\/undergraduate-studies\/courses\/[a-z0-9-]+)"[^>]*>([^<]{4,110})</g,
  // "CAO/MU Apply code : MH106"
  caoCode: (text) => (text.match(/CAO\/MU Apply code\s*:?\s*(MH\d{3})/i) || [])[1]?.toUpperCase() ?? null,
  out: 'maynooth-rows.csv',
});
