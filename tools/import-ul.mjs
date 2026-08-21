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
  // UL prints "EU fees per year €7,366" on each course page, and that figure is
  // deliberately NOT used here: it is what an EU applicant pays who does not
  // qualify for the Free Fees Initiative. A Slovak applicant educated in
  // Slovakia does qualify, and pays UL's student contribution plus its €104
  // levy instead — €2,604, which UL publishes on its fees pages rather than on
  // the course page. That is the university default in universities.csv.
  //
  // Only the non-EU figure is taken from the course page.
  fees: (text) => ({
    noneu: Number((text.match(/Non-EU fees per year\s*€\s?([\d,]+)/i) || [])[1]?.replace(/,/g, '')) || undefined,
  }),
  out: 'ul-rows.csv',
});
