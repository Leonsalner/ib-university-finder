// One-off import: Brno University of Technology (VUT) bachelor programmes ->
// programmes.csv rows.
//
//   node tools/import-vut.mjs        writes tools/vut-rows.csv
//
// The programme list comes from VUT's own e-application
// (vut.cz/eprihlaska), one page per faculty. That is the list of what can
// actually be applied to for 2027/28, which the accreditation catalogue at
// vut.cz/studenti/programy is not: it also lists programmes not open this
// year.
//
// The e-application shows a closing date only once a faculty has opened
// applications. Most open on 1 November 2026, so for those the deadline and
// the entrance procedure come from each faculty's own admissions page, read on
// 2026-10-24 and kept in FACULTY below with the page it came from. The
// faculties are uniform enough inside themselves that one entry each does.

import { writeFileSync } from 'node:fs';
import { getHtml, czText, toRow, idMaker, czechDate } from './lib/czechia.mjs';
import { areasForCz } from './lib/czech-areas.mjs';

const VERIFIED = '2026-10-24';
const BASE = 'https://www.vut.cz/eprihlaska/cs/zadani/vybrat-obor/fakulta';

// Keyed by the faculty's e-application id.
const FACULTY = {
  // fa.vutbr.cz: deadline shown in the e-application; the rules are Rozhodnutí
  // č. 10/2026.
  6: { url: 'https://www.fa.vutbr.cz/studuj-fa/FAQ', admission: 'Entrance exam (see the faculty rules)' },
  // fekt.vut.cz/pro_uchazece/prijimacky: "Přihlas se on-line 1. 11. 2026 až
  // do 31. 3. 2027"; sample tasks in maths (and biology); "Jak postupovat pro
  // prominutí přijímací zkoušky?"
  5: {
    url: 'https://www.fekt.vut.cz/pro_uchazece/prijimacky', deadline: '2027-03-31',
    admission: 'Entrance exam: maths · Exam can be waived on set criteria',
  },
  // fit.vut.cz/applicants/application: "Do 31. března musíte podat a
  // zaplatit přihlášku", then Scio NSZ (OSP, MAT or VŠP) unless you meet a
  // "přednostní přijetí" condition. 750 places on fit.vut.cz/fit/info/rizeni.
  20042: {
    url: 'https://www.fit.vut.cz/applicants/application/.cs', deadline: '2027-03-31',
    admission: 'Scio test (OSP, MAT or VŠP) · Priority admission on set criteria', note: 'About 750 places.',
  },
  // fce.vutbr.cz: dates shown in the e-application; Czech programmes admit on
  // the secondary-school grade average ("Celkový studijní průměr").
  3: {
    url: 'https://www.fce.vutbr.cz/pro-uchazece/prijimacky',
    admission: 'Admission on secondary-school grades (no exam)',
  },
  // fme.vutbr.cz/studuj/prijimacky: "od 1. listopadu 2026 do 31. března
  // 2027"; tests in "matematika a fyzika" unless the waiver criteria are met.
  4: {
    url: 'https://www.fme.vutbr.cz/studuj/prijimacky', deadline: '2027-03-31',
    admission: 'Entrance exam: maths and physics · Exam can be waived on set criteria',
  },
  // favu.vut.cz: "Nejpozději do půlnoci 30. listopadu 2026", portfolio by
  // 3 December 2026.
  11: {
    url: 'https://www.favu.vut.cz/uchazeci/prijimacky/bakalarsky-program',
    admission: 'Portfolio · Talent exam', note: 'Portfolio and questionnaire due by 3 Dec 2026. One studio per application.',
  },
  // cesa.vut.cz/uchazeci/prijimacky: "od 1. 11. 2026 do 31. 3. 2027"; "30
  // otázek z matematiky a fyziky"; "50 studentů ročně".
  814: {
    url: 'https://www.cesa.vut.cz/uchazeci/prijimacky', deadline: '2027-03-31',
    admission: 'Entrance exam: maths and physics test', note: 'About 50 places.',
  },
  // fch.vut.cz/uchazeci/prijimacky: "od 1. 11. 2026 do 31. 3. 2027";
  // "budou přijati na základě stanovených kritérií bez přijímací zkoušky".
  12: {
    url: 'https://www.fch.vut.cz/uchazeci/prijimacky', deadline: '2027-03-31',
    admission: 'No entrance exam — admitted on set criteria',
  },
  // fp.vut.cz/cs/pro-uchazece/prijimacky: "od 1. 11. 2026 do 31. 3. 2027";
  // the e-application text: written "Test studijních předpokladů".
  13: {
    url: 'https://www.fp.vut.cz/cs/pro-uchazece/prijimacky', deadline: '2027-03-31',
    admission: 'Entrance exam: aptitude test · Exam can be waived on set criteria',
  },
};

// Programmes that differ from their faculty, keyed by name as the
// e-application prints it.
const PROGRAMME = {
  // fa.vutbr.cz/studyarchitecture/bachelor: "Tuition fee (from EU): 4600 EUR
  // per year", "Application deadline: 8th February 2027", B2 English, 30
  // places, 4 years.
  'Architecture and Urban Design': {
    url: 'https://www.fa.vutbr.cz/studyarchitecture/bachelor', tuition: 4600,
    english: 'B2 certificate', note: 'About 30 places. Four years.',
  },
  // e-application: "a four-stage procedure … a short online interview …
  // There is no written entrance examination."
  'Civil Engineering': { admission: 'Documents · Online interview (no written exam)', tuition: '?' },
  // Closes on 4 January, months before FAST's other programmes, so the
  // grade-average rule cannot be assumed to apply. Not read further.
  'Architektura pozemních staveb': { admission: '' },
  // fekt.vut.cz/en/applicants/studies_in_english/fees: "EUR 1,000 for EU and
  // Ukrainian students". No 2027 closing date on the English pages.
  'Electrical Engineering': {
    url: 'https://www.fekt.vut.cz/en/applicants/studies_in_english', tuition: 1000, deadline: '',
    admission: 'See the faculty’s English admission rules',
    note: 'Applications open 1 Nov 2026; the faculty’s English pages give no 2027 closing date.',
  },
  // e-application: B1 English; "Přijímací zkouška je písemná z matematiky a
  // fyziky. Může být prominuta" for Scio OSP or maths in the top 50%.
  'Fundamentals of Mechanical Engineering': {
    url: 'http://www.fme.vutbr.cz/en/studuj/studia-en', tuition: '?', deadline: '', english: 'B1 (e.g. IELTS 5)',
    admission: 'Entrance exam: maths and physics · Waived for Scio OSP or maths in the top 50%',
    note: 'Applications open 1 Nov 2026; no 2027 closing date found.',
  },
  // fme.vutbr.cz: talent exam on 16 April 2027, "Zkoušku není možné
  // prominout".
  'Průmyslový design ve strojírenství': {
    admission: 'Entrance exam: maths and physics (can be waived) · Talent exam 16 Apr 2027 (cannot be waived)',
  },
  'Konstrukční inženýrství': {
    admission: 'Entrance exam: maths and physics · Motivation letter by 31 Mar 2027 · Exam can be waived on set criteria',
  },
  // e-application: oral group interview in English, "může být prominuta";
  // "Studium je zpoplatněno", amount set by dean's decision.
  'Entrepreneurship and Small Business Development': {
    admission: 'Group interview in English (can be waived)', tuition: '?',
  },
};

const nextId = idMaker('vut');
const rows = [];
let total = 0;

for (const [fid, fac] of Object.entries(FACULTY)) {
  const html = await getHtml(`${BASE}/${fid}`);
  const blocks = html.split(/<h3 class="title-vafle title-program">/).slice(1);
  if (!blocks.length) throw new Error(`faculty ${fid}: no programmes on its e-application page`);

  for (const block of blocks) {
    const name = czText(block.slice(0, block.indexOf('</h3>')));
    const values = [...block.matchAll(/<span class="param-value[^"]*"[^>]*>([^<]*)<\/span>/g)].map((m) => m[1].trim());
    const [type, mode, title, language] = values;
    if (type !== 'bakalářský' || mode !== 'prezenční') continue;
    total++;

    // A green "přihlašování do" date is the closing date of an open round;
    // a yellow "od" date only says when the round opens.
    const closes = (block.match(/title="přihlašování do uvedeného data">([^<]+)</) || [])[1];
    const over = PROGRAMME[name] ?? {};
    const english = language === 'angličtina';

    rows.push(toRow({
      programme_id: nextId(name),
      university_id: 'vut',
      programme: name,
      degree_type: title,
      subject_area: areasForCz(name),
      language: english ? 'English' : 'Czech',
      admission: over.admission ?? fac.admission,
      // Czech-taught: free. English-taught: the faculty's figure where it
      // publishes one, otherwise "?" — never the university's 0.
      tuition_eu: over.tuition ?? (english ? '?' : ''),
      english_requirement: over.english ?? '',
      application_deadline: over.deadline ?? (closes ? czechDate(closes) : fac.deadline ?? ''),
      deadline_notes: [over.note ?? fac.note].filter(Boolean).join(' '),
      official_url: over.url ?? fac.url,
      last_verified: VERIFIED,
      verified_by: 'AI-DRAFT',
    }));
  }
}

writeFileSync(new URL('./vut-rows.csv', import.meta.url), `${rows.join('\n')}\n`);
console.log(`rows written: ${rows.length} of ${total} full-time bachelor programmes open for 2027/28`);
