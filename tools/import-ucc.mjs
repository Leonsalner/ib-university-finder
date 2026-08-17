// One-off import: University College Cork undergraduate courses.
//
//   node tools/import-ucc.mjs        writes tools/ucc-rows.csv
//
// UCC is the tidiest of the six: its course URLs are the CAO code, so the code
// never has to be read off the page at all.

import { importUniversity } from './lib/irish-import.mjs';
import { getHtml, toText } from './lib/ireland.mjs';

// UCC publishes one fee schedule covering every course, as a table keyed by CAO
// code: "BA - Arts CK101 €5,895 €210 €2,500 €3,185". The columns are Total,
// Capitation, Student Contribution and EU Tuition, so the first figure is the
// whole EU cost and the one worth recording — Ireland's Free Fees Initiative
// needs three years' EU residency, which an applicant arriving for the degree
// will not have, so they pay all three components rather than the €2,710 a
// resident pays.
const FEES = 'https://www.ucc.ie/en/financeoffice/fees/schedules/euundergraduatefees202627/';

async function feesByCode() {
  const text = toText(await getHtml(FEES));
  const map = new Map();
  for (const [, code, total] of text.matchAll(/(CK\d{3})\s*€\s?([\d,]+)\s*€\s?[\d,]+\s*€\s?[\d,]+\s*€\s?[\d,]+/g)) {
    map.set(code, { eu: Number(total.replace(/,/g, '')) });
  }
  if (map.size < 40) throw new Error(`UCC fee schedule parsed only ${map.size} courses — its layout has changed.`);
  return map;
}

await importUniversity({
  universityId: 'ucc',
  base: 'https://www.ucc.ie',
  listUrl: 'https://www.ucc.ie/en/study/undergrad/courses/',
  // Course links look like /en/ck101/ and carry their title as the link text,
  // e.g. "Arts (CK101)". Subject pages nested under a course (/en/ck101/asian/)
  // are not separate CAO choices, so the pattern stops at one path segment.
  linkRe: /href="(?:https:\/\/www\.ucc\.ie)?(\/en\/(?:ck|CK)\d{3}\/)"[^>]*>([^<]{4,90})</g,
  caoCode: (_text, href) => (href.match(/\/(ck\d{3})\//i) || [])[1]?.toUpperCase() ?? null,
  feesByCode,
  out: 'ucc-rows.csv',
});
