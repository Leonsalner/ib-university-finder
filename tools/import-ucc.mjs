// One-off import: University College Cork undergraduate courses.
//
//   node tools/import-ucc.mjs        writes tools/ucc-rows.csv
//
// UCC is the tidiest of the six: its course URLs are the CAO code, so the code
// never has to be read off the page at all.

import { importUniversity } from './lib/irish-import.mjs';

await importUniversity({
  universityId: 'ucc',
  base: 'https://www.ucc.ie',
  listUrl: 'https://www.ucc.ie/en/study/undergrad/courses/',
  // Course links look like /en/ck101/ and carry their title as the link text,
  // e.g. "Arts (CK101)". Subject pages nested under a course (/en/ck101/asian/)
  // are not separate CAO choices, so the pattern stops at one path segment.
  linkRe: /href="(?:https:\/\/www\.ucc\.ie)?(\/en\/(?:ck|CK)\d{3}\/)"[^>]*>([^<]{4,90})</g,
  caoCode: (_text, href) => (href.match(/\/(ck\d{3})\//i) || [])[1]?.toUpperCase() ?? null,
  out: 'ucc-rows.csv',
});
