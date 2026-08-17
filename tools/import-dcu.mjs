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
  // €17,000" — three parallel rates, not components that add up. DCU's fee
  // pages settle which one applies: "Students who are not entitled to 'free'
  // Undergraduate tuition pay fees as quoted under EU status fee", and the
  // €2,543 is what a Free Fees student pays instead. An applicant arriving from
  // Slovakia has not lived in the EU the three years Free Fees requires, so the
  // EU status fee is the one that applies and the one recorded here.
  fees: (text) => ({
    eu: Number((text.match(/EU Status Fee\.?\s*€\s?([\d,]+)/i) || [])[1]?.replace(/,/g, '')) || undefined,
    noneu: Number((text.match(/Non EU Fee\.?\s*€\s?([\d,]+)/i) || [])[1]?.replace(/,/g, '')) || undefined,
  }),
  out: 'dcu-rows.csv',
});
