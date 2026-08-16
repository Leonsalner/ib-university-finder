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
  // UL is the only one of the six to publish an unambiguous per-course fee:
  // "EU fees per year €7,366". It genuinely varies by course — Arts is €5,662 —
  // so this belongs on the programme row, not as a university default.
  //
  // This is the fee that matters for this cohort. Ireland's Free Fees Initiative
  // needs three years' EU residency, which an applicant arriving for the degree
  // will not have, so they pay the EU fee rather than the student contribution.
  fees: (text) => ({
    eu: Number((text.match(/EU fees per year\s*€\s?([\d,]+)/i) || [])[1]?.replace(/,/g, '')) || undefined,
    noneu: Number((text.match(/Non-EU fees per year\s*€\s?([\d,]+)/i) || [])[1]?.replace(/,/g, '')) || undefined,
  }),
  out: 'ul-rows.csv',
});
