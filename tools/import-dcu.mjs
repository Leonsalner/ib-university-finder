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
  // "Full time Student Contribution. €2,543 EU Status Fee €5,922 Non EU Fee.
  // €17,000" — three parallel rates, not components that add up. DCU says which
  // applies: "Students who are not entitled to 'free' Undergraduate tuition pay
  // fees as quoted under EU status fee". A Slovak applicant educated in Slovakia
  // *is* entitled — the residency test is three of the last five years anywhere
  // in the EU/EEA — so the €2,543 line is the one that applies.
  fees: (text) => ({
    // The Student Contribution line is the whole bill for a Free Fees student,
    // which DCU states elsewhere as "Payment in full EU Students €2,543". The
    // EU Status Fee beside it is for EU applicants who do not qualify.
    eu: Number((text.match(/Student Contribution\.?\s*€\s?([\d,]+)/i) || [])[1]?.replace(/,/g, '')) || undefined,
    noneu: Number((text.match(/Non EU Fee\.?\s*€\s?([\d,]+)/i) || [])[1]?.replace(/,/g, '')) || undefined,
  }),
  out: 'dcu-rows.csv',
});
