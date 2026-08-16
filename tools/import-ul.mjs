// One-off import: University of Limerick undergraduate courses.
//
//   node tools/import-ul.mjs         writes tools/ul-rows.csv
//
// UL's alphabetical index mixes degree pages with subject pages. A subject page
// ("Psychology") has no course code and describes a subject you can take inside
// several degrees; a degree page ("Psychology - BSc") carries "Course code
// LM102". Keying on the code is what separates them, so no extra filter is
// needed — the subject pages fall out on their own.

import { importUniversity } from './lib/irish-import.mjs';

await importUniversity({
  universityId: 'ul',
  base: 'https://www.ul.ie',
  listUrl: 'https://www.ul.ie/study/undergraduate/alphabetical-list-of-courses',
  linkRe: /href="(\/study\/undergraduate\/[a-z0-9-]+)"[^>]*>\s*([^<]{4,110})/g,
  // "Course code LM102"
  caoCode: (text) => (text.match(/Course code\s+(LM\d{3})/i) || [])[1]?.toUpperCase() ?? null,
  out: 'ul-rows.csv',
});
