// One-off: the corrections from the second-model verification run
// (CAS/verification/REPORT.md), each re-checked against the official page on
// 2026-10-25 before being applied. Claims that did not survive the re-check
// are listed at the bottom and deliberately not applied.
//
//   node tools/apply-verification-2026-10-25.mjs
//
// Galway and DCU fees come from galway-fees.json / dcu-fees.json, written by a
// script that re-read every course page of those two universities.

import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../js/csv.js';

const root = new URL('../data/', import.meta.url);
const SCRATCH = process.argv[2];
if (!SCRATCH) throw new Error('pass the folder holding galway-fees.json and dcu-fees.json');

const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const load = (f) => { const [head, ...rows] = parseCsv(readFileSync(new URL(f, root), 'utf8')); return { head, rows: rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))) }; };
const save = (f, { head, rows }) => writeFileSync(new URL(f, root), [head.join(','), ...rows.map((r) => head.map((h) => esc(r[h])).join(','))].join('\n') + '\n');

const unis = load('universities.csv');
const progs = load('programmes.csv');
const byId = new Map(progs.rows.map((r) => [r.programme_id, r]));
let changed = 0;
const set = (id, fields) => {
  const r = byId.get(id);
  if (!r) throw new Error(`no row ${id}`);
  for (const [k, v] of Object.entries(fields)) { if (!(k in r)) throw new Error(`no column ${k}`); r[k] = v; }
  r.last_verified = '2026-10-25';
  changed++;
};
const OPEN = 'Open entry: meet the requirements, get a place';
const FIXUS = 'Numerus fixus: limited places';
const SELECTIVE = 'Selective: assessed on your application';

// --------------------------------------------------------------- Netherlands

// Statutory fee 2027/28 is €2,771 (RUG, TU/e, Twente, VU and Radboud pages:
// "EU/EEA 2027-2028 2771"). €2,694 was 2026/27.
for (const u of unis.rows) {
  if (u.country === 'Netherlands' && u.tuition_eu_default === '2694') { u.tuition_eu_default = '2771'; u.last_verified = '2026-10-25'; }
}
// TU/e: "Institutional fee for bachelor's students € 18,600 (26/27) € 22,400 (27/28)".
unis.rows.find((u) => u.university_id === 'tue').tuition_noneu_default = '22400';

// TU Delft: "Numerus clausus: no" (Nanobiology) / "Numerus fixus: No" (ECT);
// "For programmes without a numerus clausus, the deadline is 1 April."
for (const id of ['tud-nano', 'tud-ect']) {
  set(id, { other_requirements: '', admission: OPEN, application_deadline: '2027-04-01',
    deadline_notes: 'No numerus fixus any more; TU Delft closes non-fixus programmes on 1 April.' });
}
// VU PPE: "EU/EEA students …: 1 May"; fee table 2027-2028 "Philosophy,
// Politics and Economics €5.310".
set('vu-ppe', { application_deadline: '2027-05-01', tuition_eu: '5310',
  deadline_notes: 'Early-bird deadline 14 February for international diplomas.' });
// Tilburg UC: "EEA nationals: June 15; non-EEA nationals: May 1"; admissions
// interview.
set('tb-uct', { application_deadline: '2027-06-15', admission: SELECTIVE,
  deadline_notes: '15 June is for EEA nationals (non-EEA: 1 May). An admissions interview by 15 May keeps reserved housing open.' });
// Maastricht admission pages: EBE "15 March 2027, 23:59 CET Ultimate deadline
// for all applicants"; RMT and Sustainable Bioscience "1 May 2027, 23:59 CET
// Deadline for applicants with an EU/EEA or Swiss nationality".
set('um-ebe', { application_deadline: '2027-03-15', deadline_notes: 'International Classroom Essay due earlier, by 15 January 2027.' });
set('um-rmt', { application_deadline: '2027-05-01', deadline_notes: '1 May is for EU/EEA/Swiss applicants (non-EU: 1 April).' });
set('um-sbio', { application_deadline: '2027-05-01', deadline_notes: '1 May is for EU/EEA/Swiss applicants (non-EU: 1 April).' });
// UvA programme pages: English tracks' numerus fixus places.
set('uva-polsci', { other_requirements: 'Numerus fixus (325 places) · Places allocated by lottery', admission: FIXUS,
  application_deadline: '2027-01-15', deadline_notes: 'English track: numerus fixus, so the deadline is 15 January.' });
set('uva-ba', { other_requirements: 'Numerus fixus (500 places)' });
set('uva-ebe', { other_requirements: 'Numerus fixus (550 places)' });
set('uva-psychology', { other_requirements: 'Numerus fixus (270 places)' });
set('uva-archaeology', { official_url: 'https://www.uva.nl/en/programmes/bachelors/archaeology/archaeology.html',
  deadline_notes: 'A joint degree with VU Amsterdam.' });
// Utrecht key facts: PPE "2027-2028: € 5,542"; UCU "€ 5,750 (EU/EEA) …
// € 21,600 (non EU/EEA)", "Admission: Selective".
set('uu-ppe', { tuition_eu: '5542' });
set('uu-ucu', { tuition_eu: '5750', tuition_noneu: '21600', admission: SELECTIVE });
// RUG: renamed; "EU/EEA 2027-2028 4950", "non-EU/EEA 2027-2028 17200".
set('rug-grl', { programme: 'Global Politics & Sustainability', tuition_eu: '4950', tuition_noneu: '17200' });
// RUG UCG: "EU/EEA 2027-2028 5494", "non-EU/EEA 2027-2028 17700".
set('rug-ucg', { tuition_eu: '5494', tuition_noneu: '17700' });
// Radboud: "Great news: No more numerus fixus! … 100% guaranteed a spot".
set('ru-biology', { other_requirements: '', admission: OPEN,
  deadline_notes: 'No numerus fixus any more: Radboud guarantees a place if you meet the requirements and apply on time.' });

// ------------------------------------------------------------------ Ireland

// Galway course pages, "Fees for Academic Year 2027/28": a Free Fees student
// pays contribution + levy (€2,350 + €150 = €2,500; €2,700 where the levy is
// €350). Non-EU = the "Non-EU Tuition" column.
const galway = JSON.parse(readFileSync(`${SCRATCH}/galway-fees.json`, 'utf8'));
for (const g of galway) {
  if (!g.table) continue;
  if (g.id === 'galway-pharmacy') { set(g.id, { tuition_eu: '2700' }); continue; } // no non-EU column
  set(g.id, { tuition_eu: String(g.table[4]), tuition_noneu: String(g.table[2]) });
}
// DCU course pages: "Non EU Fee. €…" (no year printed; every page changed
// since the August import).
const dcu = JSON.parse(readFileSync(`${SCRATCH}/dcu-fees.json`, 'utf8'));
for (const d of dcu) if (d.nonEu) set(d.id, { tuition_noneu: d.nonEu });
// Trinity: "must apply by 2nd January 2026 for September 2026 entry".
set('tcd-columbia-dual-degree', { application_deadline: '2027-01-02',
  deadline_notes: 'Own deadline, 2 January — the page still shows the 2026 cycle; assumed unchanged for 2027.' });
// Maynooth MH201's page gives "Closing Date 01 July 2027"; the CAO application
// itself still closes 1 February. Noted, not changed.
set('maynooth-bachelor-of-science', { deadline_notes: 'Maynooth lists 1 July 2027 for this course, but your CAO application must be in by 1 February.' });
// UCD's hub deep link now opens a generic course search.
set('ucd-business-and-law', { official_url: 'https://www.ucd.ie/quinn/courses/businessandlaw/' });

// Removed:
//  - galway GY133 Education (CS & Maths): page 404, gone from Galway's course index.
//  - dcu Theology and Religious Studies: the page is DC300, part-time, for
//    mature students; the full-time route (DC009) is already a row.
//  - Maynooth MH601/MH602/MH603: "discontinuing for entry in September 2027"
//    (Maynooth's deferral-applicants page).
const REMOVE = new Set([
  'galway-bachelor-of-arts-education-computer-s', 'dcu-theology-and-religious-studies',
  'maynooth-bsc-computer-sci-software-engineeri', 'maynooth-bsc-multimedia-mobile-web-developme',
  'maynooth-bsc-computer-science-software-engin', 'maynooth-bsc-multimedia-mobile-web-developme-2',
  'maynooth-bsc-computational-thinking',
]);
for (const id of REMOVE) if (!byId.has(id)) throw new Error(`no row ${id} to remove`);
progs.rows = progs.rows.filter((r) => !REMOVE.has(r.programme_id));

// Not applied, because the re-check did not support them:
//  - Galway IB minimums "below the 26 floor": the 26–36 bands are on Galway's
//    page for international (non-EU) applicants. A Slovak applicant goes
//    through the CAO, and those rows carry the CAO-cutoff conversion.
//  - VUT Architektura pozemních staveb 2 January: VUT's own e-application
//    shows "přihlašování do 4. 1. 2027".
//  - Maynooth MH201 1 July as the deadline: see the note above.

save('universities.csv', unis);
save('programmes.csv', progs);
console.log(`changed ${changed} row edits, removed ${REMOVE.size} rows`);
