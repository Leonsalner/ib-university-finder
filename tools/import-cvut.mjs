// One-off import: Czech Technical University in Prague (ČVUT / CTU) bachelor
// programmes -> programmes.csv rows.
//
//   node --use-system-ca tools/import-cvut.mjs     writes tools/cvut-rows.csv
//
// --use-system-ca because cvut.cz serves an incomplete certificate chain:
// browsers and curl fill in the missing intermediate, Node's bundled store
// does not, and every fetch fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE. The
// Windows certificate store has the intermediate.
//
// CTU has no central catalogue to read. "Termín podání přihlášek ke studiu a
// termín přijímacího řízení si určují samy fakulty" (cvut.cz/prijimaci-rizeni),
// and the university's e-application (prihlaska.cvut.cz) did not answer from
// here at all. So the rows are a table, one entry per faculty, read off each
// faculty's admissions page on 2026-10-24. The script checks that each
// faculty page still names every programme listed for it.
//
// As of that date only FS, FIT and FA had published their 2027 round. FSv,
// FEL, FJFI, FD and FBMI still showed the 2026 one, so their rows have no
// deadline and their admission line is marked as last year's.
//
// Left out: MÚVS's one bachelor (teacher training for vocational instructors),
// and the English-taught versions FJFI offers of four programmes, which need
// a fee and deadline nobody has read yet.

import { writeFileSync } from 'node:fs';
import { getHtml, czText, toRow, idMaker } from './lib/czechia.mjs';
import { areasForCz } from './lib/czech-areas.mjs';

const VERIFIED = '2026-10-24';
const LAST_YEAR = '2027 round not yet published; admission shown is from the 2026 rules.';

const FACULTIES = [
  {
    // fsv.cvut.cz/uchazeci/bakalarske-studium/prijimaci-rizeni (2026): one
    // maths test for all programmes, 15 questions, "Minimální počet bodů pro
    // přijetí je 8"; can be waived; Architektura a stavitelství adds an
    // architecture exam and interview.
    list: 'https://web.fsv.cvut.cz/zajemce-o-studium/bakalar/',
    url: 'https://www.fsv.cvut.cz/uchazeci/bakalarske-studium/prijimaci-rizeni/',
    admission: 'Entrance exam: maths test · Can be waived on set criteria (2026 rules)',
    note: LAST_YEAR,
    programmes: [
      'Stavební inženýrství', 'Stavitelství', 'Management a ekonomika ve stavebnictví',
      'Stavby, krajina a životní prostředí',
      ['Architektura a stavitelství', 'Entrance exam: maths test + architecture exam and interview (2026 rules)'],
      ['Scénické technologie', null, 'SCÉNICKÉ TECHNOLOGIE'],
      'Geodézie a kartografie',
      ['Civil Engineering', 'Entrance exam: maths test (2026 rules) · Proof of English', 'Civil engineering', 'English'],
    ],
  },
  {
    // fs.cvut.cz/zajemci-o-studium/informace-o-prijimacim-rizeni: "Přihláška
    // bude otevřená od 1. listopadu 2026 do 31. března 2027"; maths test on
    // 16 June 2027, 12 of 24 to pass; waived for, among others, Slovak
    // maturita maths at 85%+ or Scio maths at the 50th percentile.
    list: 'https://www.fs.cvut.cz/zajemci-o-studium/formy-studia/bakalarske-programy/',
    url: 'https://www.fs.cvut.cz/zajemci-o-studium/informace-o-prijimacim-rizeni/',
    deadline: '2027-03-31',
    admission: 'Entrance exam: maths test · Waived for e.g. Slovak maturita maths 85%+ or Scio maths 50th percentile+',
    programmes: ['Automatizace a aplikovaná informatika', 'Strojní inženýrství', 'Udržitelná mobilita – Pohony a vozidla'],
  },
  {
    // fel.cvut.cz/…/prijimaci-rizeni-do-bakalarskeho-studia (still 2026/27):
    // closed "31. března 2026"; one maths test, 15 questions, for all
    // programmes.
    list: 'http://www.fel.cvut.cz/cz/prestudent/studium-bakalarske.html',
    url: 'https://fel.cvut.cz/cs/uchazeci/prijimaci-rizeni/prijimaci-rizeni-krok-za-krokem/prijimaci-rizeni-do-bakalarskeho-studia',
    admission: 'Entrance exam: maths test (2026 rules)',
    note: LAST_YEAR,
    programmes: [
      'Elektrotechnika, energetika a management', 'Elektronika a komunikace', 'Lékařská elektronika a bioinformatika',
      'Kybernetika a robotika', 'Otevřená informatika', 'Otevřené elektronické systémy', 'Softwarové inženýrství a technologie',
    ],
  },
  {
    // fjfi.cvut.cz: 2026-2027 round, closed 31 August 2026; "přijímací
    // zkouška prominuta (při splnění podmínek)"; study in Czech, shown by "maturitní
    // zkouškou z českého nebo slovenského jazyka, případně certifikátem úrovně B2".
    list: 'https://www.fjfi.cvut.cz/cz/uchazeci/bakalarske-studium/programy-bakalarskeho-studia',
    url: 'https://www.fjfi.cvut.cz/cz/uchazeci/bakalarske-studium/prijimaci-rizeni-do-bakalarskeho-navazujiciho-magisterskeho-studia',
    admission: 'Entrance exam: maths · Can be waived on set criteria (2026 rules)',
    language: 'Czech or Slovak maturita exam, or Czech B2',
    note: LAST_YEAR,
    programmes: [
      // FJFI's page for this one names both Prague and Děčín.
      ['Aplikace informatiky v přírodních vědách', null, null, null, '?'],
      'Aplikovaná algebra a analýza', 'Aplikované matematicko-stochastické metody', 'Fyzikální inženýrství',
      'Jaderné inženýrství', 'Matematické inženýrství', 'Jaderná a částicová fyzika', 'Jaderná chemie',
      'Kvantové technologie', 'Radiologická technika', 'Vyřazování jaderných zařízení z provozu',
    ],
  },
  {
    // fa.cvut.cz/cs/uchazeci/bc-programy (Architektura a urbanismus):
    // "Přihlášky se podávají do 30. listopadu"; two rounds — Scio, spatial
    // imagination, general knowledge and talent tests, then an interview
    // with home assignments.
    list: 'https://www.fa.cvut.cz/cs/uchazeci/bc-programy/',
    url: 'https://www.fa.cvut.cz/cs/uchazeci/bc-programy/',
    programmes: [
      ['Architektura a urbanismus', 'Talent exam + Scio and spatial tests · Interview with home assignments (2nd round)', null, null, null, '2026-11-30'],
      ['Krajinářská architektura', '', null, null, null, '', 'Only the Architektura a urbanismus page was read; check this one’s own page.'],
      ['Design', '', null, null, null, '', 'Only the Architektura a urbanismus page was read; check this one’s own page.'],
    ],
  },
  {
    // fd.cvut.cz/zajemci-o-studium/prijimaci-rizeni (2026): applications
    // "od 1. ledna 2026 do 31. března 2026", for Prague or Děčín.
    list: 'https://www.fd.cvut.cz/zajemci-o-studium/prijimaci-rizeni.html',
    url: 'https://www.fd.cvut.cz/zajemci-o-studium/prijimaci-rizeni.html',
    admission: 'Entrance exam (see the dean’s conditions, 2026 rules)',
    note: `${LAST_YEAR} Taught in Prague and Děčín; you pick the site in the application.`,
    programmes: [['Dopravní inženýrství', null, 'Dopravní inženýrství (DOI)'], ['Technologie údržby letadel', null, 'Technologie údržby letadel (TUL)'], ['Profesionální pilot', null, 'Profesionální pilot (PIL)']],
  },
  {
    // fbmi.cvut.cz/cs/uchazec/prijimaci-rizeni (2026): test, "min. 13 bodů z
    // 30 možných"; some programmes waive it on the school grade average. The
    // faculty is at Sítná 3105, Kladno.
    list: 'https://www.fbmi.cvut.cz/cs/uchazec/studium-formy?section=bakalarske',
    url: 'https://www.fbmi.cvut.cz/cs/uchazec/prijimaci-rizeni',
    city: 'Kladno',
    admission: 'Entrance exam: written test · Some programmes waive it on school grades (2026 rules)',
    note: LAST_YEAR,
    programmes: [
      'Biomedicínská technika', 'Informatika a kybernetika ve zdravotnictví', 'Optika a optometrie', 'Radiologická asistence',
      'Fyzioterapie', 'Zdravotnické záchranářství', 'Laboratorní diagnostika ve zdravotnictví',
      'Bezpečnost a ochrana obyvatelstva', 'Biomedicínské nanotechnologie',
    ],
  },
  {
    // fit.cvut.cz/bc_prijimaci-rizeni: "Vyplňte přihlášku (do 31. 3. 2027)";
    // maths test on 1 or 2 June 2027, 70 of 100 guarantees a place; waived for
    // e.g. Scio maths or OSP at the 90th percentile. Czech B2 is only asked of
    // applicants who are not Czech or Slovak citizens.
    list: 'https://fit.cvut.cz/bc_prijimaci-rizeni',
    url: 'https://fit.cvut.cz/bc_prijimaci-rizeni',
    deadline: '2027-03-31',
    admission: 'Entrance exam: maths test · Waived for e.g. Scio maths or OSP at the 90th percentile',
    programmes: [
      'Informatika',
      // fit.cvut.cz/en/…/bachelor-study-program: by 31 March 2027; FIT maths
      // test on 12 May or a Scio test by 24 April; English at B2, and
      // schooling in English counts. The Czech page is the one checked, so
      // the check looks for the Czech name of the same programme.
      ['Informatics', 'Maths test (12 May) or a Scio maths/GAP test', 'Informatika', 'English', null, null, null,
        'https://fit.cvut.cz/en/applicants/admissions-procedure/bachelor-study-program', 'B2 · or schooling in English'],
    ],
  },
];

// ------------------------------------------------- is the table still true?

const missing = [];
for (const fac of FACULTIES) {
  const page = czText(await getHtml(fac.list)).replace(/­/g, '');
  for (const entry of fac.programmes) {
    const [name, , listed] = Array.isArray(entry) ? entry : [entry];
    if (!page.includes(listed ?? name)) missing.push(`${name} (${fac.list})`);
  }
}
if (missing.length) throw new Error(`no longer listed:\n  ${missing.join('\n  ')}`);

// --------------------------------------------------------------------- rows

const nextId = idMaker('cvut');
const rows = [];

for (const fac of FACULTIES) {
  for (const entry of fac.programmes) {
    const [name, admission, , language, city, deadline, note, url, english] = Array.isArray(entry) ? entry : [entry];
    const isEnglish = language === 'English';
    rows.push(toRow({
      programme_id: nextId(name),
      university_id: 'cvut',
      city: city ?? fac.city ?? '',
      programme: name,
      degree_type: name === 'Design' ? 'BcA.' : 'Bc.',
      subject_area: areasForCz(name),
      language: isEnglish ? 'English' : 'Czech',
      admission: admission ?? fac.admission ?? '',
      // English-taught study is charged, and no fee has been read: "?",
      // never the university's 0.
      tuition_eu: isEnglish ? '?' : '',
      english_requirement: english ?? (isEnglish ? '' : fac.language ?? ''),
      application_deadline: deadline ?? fac.deadline ?? '',
      deadline_notes: note ?? fac.note ?? '',
      official_url: url ?? fac.url,
      last_verified: VERIFIED,
      verified_by: 'AI-DRAFT',
    }));
  }
}

writeFileSync(new URL('./cvut-rows.csv', import.meta.url), `${rows.join('\n')}\n`);
console.log(`rows written: ${rows.length}`);
