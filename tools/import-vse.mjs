// One-off import: Prague University of Economics and Business (VŠE) bachelor
// programmes -> programmes.csv rows.
//
//   node tools/import-vse.mjs        writes tools/vse-rows.csv
//
// VŠE is small enough — 19 full-time Czech-taught and 8 English-taught
// bachelors — and its six faculties run admissions differently enough that
// the rows are written from a table rather than parsed. Every fact in the
// table was read off the faculty's own admissions page on 2026-10-24; the
// comment above each faculty says which page and quotes it.
//
// What the script does check, every run: that both catalogues still list
// every programme named here. A programme VŠE drops makes the run fail
// loudly instead of leaving a dead row behind.
//
// Four faculties (FFÚ, FIS, NF, FM) had not published 2027 deadlines yet; FIS,
// NF and FM still show their 2026 rules. Those rows carry no deadline and say
// so, and their admission line is marked as last year's.

import { writeFileSync } from 'node:fs';
import { getHtml, czText, toRow, idMaker } from './lib/czechia.mjs';
import { areasForCz } from './lib/czech-areas.mjs';

const VERIFIED = '2026-10-24';
const NOT_YET = '2027 deadline not yet published.';
const LAST_YEAR = '2027 rules not yet published; admission shown is from the 2026 rules.';

const FACULTIES = [
  {
    // ffu.vse.cz/uchazeci-bakalarske-studium/prijimaci-rizeni: tests "z
    // matematiky a angličtiny"; the dean waives the exam for applicants who
    // sit "maturitní zkoušku z českého nebo slovenského jazyka", on grades.
    url: 'https://ffu.vse.cz/uchazeci-bakalarske-studium/prijimaci-rizeni/',
    admission: 'Entrance exam: maths and English tests · Waived on school grades if you sit a Czech or Slovak maturita',
    note: NOT_YET,
    programmes: ['Bankovnictví a pojišťovnictví', 'Finance', 'Účetnictví a finanční řízení podniku', 'Zdanění a daňová politika'],
  },
  {
    // fmv.vse.cz/bakalarske-studium/prijimaci-rizeni: "Termín pro podání
    // přihlášky: do 30. dubna 2027"; tests in maths, English and a second
    // foreign language; Czech/Slovak maturita exam "případně úspěšné složení
    // testu z českého jazyka"; waiver for excellent grades.
    url: 'https://fmv.vse.cz/bakalarske-studium/prijimaci-rizeni/',
    deadline: '2027-04-30',
    admission: 'Entrance exam: maths, English and a second foreign language · Can be waived on school grades',
    language: 'Czech or Slovak maturita exam, or a Czech test',
    programmes: ['Mezinárodní obchod', 'Mezinárodní studia a diplomacie', 'Turismus a hospitality management'],
  },
  {
    // fph.vse.cz/uchazeci/bakalarske-studium/prijimaci-zkousky: Czech-taught
    // programmes "do 30. dubna 2027"; PE = maths + one foreign language, AM =
    // English, logical thinking and culture; both can be waived. Applicants
    // from schools outside CZ/SK need 60% in a Czech test.
    url: 'https://fph.vse.cz/uchazeci/bakalarske-studium/prijimaci-zkousky/',
    deadline: '2027-04-30',
    programmes: [
      ['Podniková ekonomika a management', 'Entrance exam: maths and one foreign language · Can be waived on set criteria'],
      ['Arts Management', 'Entrance exam: English, logical thinking and culture tests · Can be waived on set criteria'],
    ],
  },
  {
    // fis.vse.cz/bakalarske-studium/prijimaci-rizeni (2026 rules): one Scio
    // NSZ test, "Obecné studijní předpoklady (OSP/VŠP)"; admission without
    // exam on CZ/SK school grades.
    url: 'https://fis.vse.cz/bakalarske-studium/prijimaci-rizeni/',
    admission: 'Scio OSP/VŠP test · Can be waived on CZ/SK school grades (2026 rules)',
    note: LAST_YEAR,
    programmes: [
      'Analýza ekonomických dat a matematické modelování', 'Aplikovaná informatika', 'Data Analytics',
      'Informační věda a webové technologie', 'Multimédia v ekonomické praxi',
    ],
  },
  {
    // nf.vse.cz/…/prijimaci-rizeni-podrobne-informace-pro-uchazece (2026
    // rules): Scio OSP or VŠP; "Fakulta nevyžaduje od zahraničních uchazečů
    // další test nebo certifikát z českého jazyka".
    url: 'https://nf.vse.cz/homepage/zajemci-o-studium/bakalarske-studium/prijimaci-rizeni-podrobne-informace-pro-uchazece/',
    admission: 'Scio OSP/VŠP test · Can be waived on set criteria (2026 rules)',
    language: 'No Czech certificate required',
    note: LAST_YEAR,
    programmes: ['Ekonomie', 'Národní hospodářství', 'Veřejná správa a regionální rozvoj'],
  },
  {
    // fm.vse.cz/bakalarske-studium/podminky-prijeti (2026/2027 conditions):
    // Scio OSP/VŠP; waived for CZ/SK maturita students averaging 1.90 or
    // better. The Faculty of Management is in Jindřichův Hradec.
    url: 'https://fm.vse.cz/bakalarske-studium/podminky-prijeti/',
    city: 'Jindřichův Hradec',
    admission: 'Scio OSP/VŠP test · Waived for CZ/SK maturita students averaging 1.90 or better (2026 rules)',
    note: LAST_YEAR,
    programmes: ['Management'],
  },
];

// admissions.vse.cz/admission-procedure: "Bachelor programmes – 6,000
// EUR/academic year" with a footnote that 5,000 applied to students "admitted
// before the academic year 2027/2028"; application fee 100 EUR.
const ENGLISH_FEE = 6000;
const ENGLISH = [
  // ibb.vse.cz/admission-process/entrance-exam: "Application Deadline:
  // February 28th, 2027"; an "In-depth Admission Interview". The IBB page
  // itself still says 5,000 EUR.
  {
    name: 'International Business', anchor: 'IBB', url: 'https://ibb.vse.cz/admission-process/entrance-exam/',
    deadline: '2027-02-28', admission: 'Documents · In-depth interview in English',
    note: 'VŠE’s admissions page gives €6,000 for 2027 starters; the programme page still says €5,000.',
  },
  // fba.vse.cz via fph.vse.cz: "1st intake do 28. 2. 2027, 2nd intake do 30.
  // 4. 2027, 3rd intake do 10. 6. 2027".
  {
    name: 'Bachelor of Business Administration', anchor: 'BBA', url: 'https://fba.vse.cz/admissions/bachelors-degree-programs/bba/',
    deadline: '2027-06-10', note: 'Three rounds: 28 Feb, 30 Apr and 10 Jun 2027.',
  },
  {
    name: 'Economics of Markets and Organizations', anchor: 'EMO', url: 'https://emo.vse.cz/',
    deadline: '2027-06-10', note: 'Three rounds: 28 Feb, 30 Apr and 10 Jun 2027.',
  },
  // fis.vse.cz/english/…/economic-data-science: "tuition fee – 6,000
  // EUR/academic year … applicable to students enrolled from September 2027";
  // "application deadlines: 28 February and 30 April"; GAP online test.
  {
    name: 'Economic Data Science', anchor: 'EDS', url: 'https://fis.vse.cz/english/about/bachelors-degree-programs/economic-data-science/',
    deadline: '2027-04-30', admission: 'Online GAP test · CV · Proof of English', note: 'Two rounds: 28 Feb and 30 Apr 2027.',
  },
  { name: 'Finance and Accounting', anchor: 'BIFA', url: 'https://admissions.vse.cz/bachelors-programmes/#BIFA', note: NOT_YET },
  { name: 'International and Diplomatic Studies', anchor: 'IDS', url: 'https://admissions.vse.cz/bachelors-programmes/#IDS', note: NOT_YET },
  {
    name: 'Business Information Systems and Computer Science', anchor: 'BIS', url: 'https://admissions.vse.cz/bachelors-programmes/#BIS',
    note: `New programme, first intake September 2027. ${NOT_YET}`,
  },
  { name: 'Economics', anchor: 'ECON', url: 'https://admissions.vse.cz/bachelors-programmes/#ECON', note: NOT_YET },
];

// ------------------------------------------------- is the table still true?

const czechList = czText(await getHtml('https://www.vse.cz/zajemci-o-studium/bakalarske-obory/nabidka-studia/'));
const englishList = await getHtml('https://admissions.vse.cz/bachelors-programmes/');
const gone = [
  ...FACULTIES.flatMap((f) => f.programmes.map((p) => (Array.isArray(p) ? p[0] : p)))
    .filter((name) => !czechList.includes(`${name} jazyk: čeština , forma: prezenční`)),
  ...ENGLISH.filter((p) => !englishList.includes(`#${p.anchor}`)).map((p) => p.name),
];
if (gone.length) throw new Error(`VŠE no longer lists: ${gone.join(', ')}`);

// --------------------------------------------------------------------- rows

const nextId = idMaker('vse');
const rows = [];

for (const fac of FACULTIES) {
  for (const entry of fac.programmes) {
    const [name, admission] = Array.isArray(entry) ? entry : [entry, fac.admission];
    rows.push(toRow({
      programme_id: nextId(name),
      university_id: 'vse',
      city: fac.city ?? '',
      programme: name,
      degree_type: 'Bc.',
      subject_area: areasForCz(name),
      language: 'Czech',
      admission,
      english_requirement: fac.language ?? '',
      application_deadline: fac.deadline ?? '',
      deadline_notes: fac.note ?? '',
      official_url: fac.url,
      last_verified: VERIFIED,
      verified_by: 'AI-DRAFT',
    }));
  }
}

for (const p of ENGLISH) {
  rows.push(toRow({
    programme_id: nextId(`en-${p.name}`),
    university_id: 'vse',
    programme: p.name,
    degree_type: 'Bc.',
    subject_area: areasForCz(p.name),
    language: 'English',
    admission: p.admission ?? '',
    tuition_eu: ENGLISH_FEE,
    application_deadline: p.deadline ?? '',
    deadline_notes: p.note ?? '',
    official_url: p.url,
    last_verified: VERIFIED,
    verified_by: 'AI-DRAFT',
  }));
}

writeFileSync(new URL('./vse-rows.csv', import.meta.url), `${rows.join('\n')}\n`);
console.log(`rows written: ${rows.length}`);
