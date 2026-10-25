// One-off import: Charles University (Prague, Plzeň, Hradec Králové) bachelor
// and long-cycle master's programmes -> programmes.csv rows.
//
//   node tools/import-cuni.mjs        writes tools/cuni-rows.csv
//
// Three sources, all Charles's own:
//
//   nakarlovku.cz/search.php       the university's programme finder. It
//                                  answers JSON and only with the session
//                                  cookie its own page sets, so the script
//                                  fetches that page first.
//   nakarlovku.cz/…?program=ID     per programme: city ("Lokace"), tuition
//                                  ("Školné": "zdarma", "7500 EUR" or
//                                  "410000 Kč"), and the link into SIS.
//   is.cuni.cz/…detail_obor        SIS, the admissions system itself: mode
//                                  of study, language, the 2027 application
//                                  deadline, the expected number of places,
//                                  and the faculty's description of the
//                                  entrance procedure.
//
// Left out on purpose: the 104 "se sdruženým studiem" / "with double
// curriculum study" entries. Those are pairings of two teacher-education
// subjects, each pairing listed as its own programme; including them would
// add a hundred near-identical cards for one kind of degree.

import { readFileSync, writeFileSync } from 'node:fs';
import { csvToObjects } from '../js/csv.js';
import { getHtml, czText, toRow, idMaker, czkPerEur, toEur, czkAmount, czechDate } from './lib/czechia.mjs';
import { areasForCz } from './lib/czech-areas.mjs';

const VERIFIED = '2026-10-24';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const { rate, date: rateDate } = await czkPerEur();
console.log(`ČNB rate ${rateDate}: ${rate} CZK per euro`);

// ------------------------------------------------------------- the catalogue

const landing = await fetch('https://nakarlovku.cz/vyhledavac-studia', { headers: { 'user-agent': UA } });
const cookie = landing.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

const catalogue = new Map();
for (let offset = 0; offset < 2000; offset += 20) {
  const res = await fetch(`https://nakarlovku.cz/search.php?typ-programu=BM&offset=${offset}`, {
    headers: {
      'user-agent': UA, cookie, referer: 'https://nakarlovku.cz/vyhledavac-studia', 'x-requested-with': 'XMLHttpRequest',
    },
  });
  const html = JSON.parse(await res.text()).data || '';
  const cards = [...html.matchAll(/<a href='\?program=(\d+)'[^>]*><div class='top'>([^<]*)<\/div><h3>([^<]*)<\/h3>/g)];
  if (!cards.length) break;
  for (const [, id, degree, name] of cards) catalogue.set(id, { degree, name: czText(name) });
}
if (catalogue.size < 250) throw new Error(`programme finder returned ${catalogue.size} programmes — it has changed`);

const singles = [...catalogue].filter(([, p]) => !/sdružen|double curriculum/i.test(p.name));
console.log(`catalogue: ${catalogue.size} programmes, ${singles.length} after dropping teacher-education pairings`);

// -------------------------------------------------- facts read off by hand
//
// Where SIS gives an English-taught programme's entry route in prose — and
// every place it names an IB result — the wording below is read off that SIS
// page on 2026-10-24. Keyed by programme id.
const BY_HAND = {
  // MFF Computer Science: "IB: score of 6 or higher in Mathematics: analysis
  // and approaches HL or … applications and interpretation HL (total score on
  // the IB diploma is not a factor for admission)"; English "IB: English 6".
  36423: {
    admission: 'No exam: meet the reasoning requirement (e.g. IB Maths HL 6)',
    ib_subjects: 'Maths AA or AI HL 6 (IB total not a factor)',
    english_requirement: 'IB English 6 · or a recognised test (see page)',
  },
  // FSV Economics and Finance: documents plus "a predicted or final score" in
  // IB Group 5 maths; "A minimum overall predicted or final IB subject score
  // of 30 out of 42 is required".
  36346: {
    admission: 'Assessed on documents: CV, motivation letter, maths results',
    ib_subjects: 'Maths (any course, predicted grades accepted)',
    note: 'Charles states a minimum IB score of 30 out of 42.',
  },
  36345: { admission: 'Assessed on documents: CV, motivation letter · SAT/ACT/Scio strongly recommended' },
  36347: { admission: 'Assessed on documents: CV, motivation letter, recommendation' },
  36344: { admission: 'Assessed on documents: CV, motivation letter' },
  36343: { admission: 'Assessed on documents: CV, motivation video, essay' },
  37211: { admission: 'Entrance exam · Motivation letter, sports doctor’s report' },
  37212: { admission: 'Entrance exam · Motivation letter, sports doctor’s report' },
  37213: { admission: 'Entrance exam · Motivation letter' },
  36283: { admission: 'Online interview on two set books' },
  // FF Psychology: "Posouzení portfolia uchazeče bez účasti uchazeče".
  37295: { admission: 'Portfolio review (grades, motivation, CV) — no attendance' },
  36324: { admission: 'Scio GAP test' },
  // 1st Faculty, English-taught Dentistry and General Medicine: exam waived
  // for "IBDP celkový výsledek nejméně 36 bodů, souhrnně nejméně 13 bodů ze
  // dvou předmětů na úrovni HL, přičemž jeden z nich musí být Chemistry nebo
  // Biology".
  37447: { admission: 'Entrance exam · Waived for IB 36+ with 13+ from two HL sciences (one Chemistry or Biology)' },
  37448: { admission: 'Entrance exam · Waived for IB 36+ with 13+ from two HL sciences (one Chemistry or Biology)' },
  // 2nd Faculty General Medicine: waiver for IB "ze tří předmětů (z nichž dva
  // musejí být na vyšší úrovni - chemie a biologie …) se součtem 19. Celkový
  // součet bodů v IB musí být nejméně 35", at most 25 IB/EB applicants.
  36252: { admission: 'Entrance exam · Waived for IB 35+ with 19+ from Chemistry HL, Biology HL and Physics or Maths (25 places)' },
  // 3rd Faculty General Medicine: IB "na vyšší úrovni z chemie, biologie a
  // anglického jazyka: Celkem – minimální počet bodů: 19".
  37218: { admission: 'Entrance exam · Waived for 19+ from Chemistry, Biology and English at HL' },
  // Hradec Králové Pharmacy: waiver for Biology HL 5 / SL 6, one of Chemistry,
  // Maths or Physics HL 5 / SL 6, and "celkové skóre IB: minimálně 32 bodů".
  36259: { admission: 'Entrance exam: chemistry, biology, botany, English · Waived for IB 32+ with Biology HL 5 and a science HL 5' },
  // PřF Science: waiver for "nejméně jedné vyšší úrovně (HL) a jedné
  // standardní úrovně (SL) z biologie, chemie nebo fyziky s minimálním
  // predikovaným hodnocením 13 bodů".
  37453: { admission: 'Entrance exam · Waived for predicted 13+ from one HL and one SL in Biology, Chemistry or Physics' },
  // FSV Ekonomie a finance: waiver includes "predikované nebo výsledné známky
  // … Mathematics Analysis and Approaches Higher level … alespoň 6 bodů nebo
  // … Standard level v hodnotě 7 bodů".
  36885: { admission: 'Scio test · Waived for predicted Maths AA HL 6 or SL 7' },
};

// ----------------------------------------------------------------- reading

const field = (txt, label, next) => (txt.match(new RegExp(`${label}:? +(.*?) +(?:${next})`)) || [])[1] || '';

/** The entry route as bullet items, from SIS's "Způsob ověření" plus the description. */
function admissionFor(sis) {
  const how = (sis.match(/Způsob ověření: (.*?) (?:Datum|Odlišné|Podmínky|Doporučen|Informace)/) || [])[1] || '';
  const at = sis.indexOf('Popis ověření a kritéria hodnocení');
  const desc = at > 0 ? sis.slice(at, at + 3000) : '';
  const parts = [];
  if (/přijímací zkouška/.test(how)) {
    if (/talentov/i.test(desc)) parts.push('Talent exam');
    else if (/portfoli/i.test(desc)) parts.push('Entrance exam: portfolio');
    else parts.push('Entrance exam');
  }
  if (/SCIO/i.test(how)) parts.push('Scio test');
  if (/jiná forma/.test(how) && !parts.length) parts.push('Assessed on submitted documents');
  if (/přijímací zkouška/.test(how) && /ústní|pohovor/i.test(desc)) parts.push('Oral part or interview');
  if (/Podmínky pro upuštění od přijímací zkoušky/.test(sis)) parts.push('Exam can be waived on set criteria');
  return parts;
}

/** What the page says about proving Czech, for Czech-taught rows. Blank where it says nothing. */
function czechLanguage(sis) {
  // Faculty of Arts and others: proof of Czech or Slovak, the first route
  // being a maturita exam in Czech or Slovak as a mother tongue.
  if (/dokladem o jazykových kompetencích v češtině nebo ve slovenštině/.test(sis)) {
    return 'Proof of Czech or Slovak, e.g. a Slovak-language maturita exam (see page)';
  }
  // Medical faculties: "uchazeči, kteří nemají maturitní zkoušku z češtiny
  // nebo slovenštiny, doloží doklad o vykonané zkoušce z českého jazyka na
  // úrovni C1".
  if (/nemají maturitní zkoušku z češtiny nebo slovenštiny/.test(sis)) {
    return 'Czech or Slovak maturita exam, or Czech at C1';
  }
  return '';
}

const CITY = { Praha: 'Prague', Plzeň: 'Plzeň', 'Hradec Králové': 'Hradec Králové' };

// programme_id must never change once published. Five programmes are called
// "General Medicine" and three "Dentistry", so an id built from the name gets
// its -2/-3 suffix from catalogue order — and the finder does not return the
// same order twice. A re-run on 2026-10-25 swapped faculties and cities
// between ids that way. So an id already in data/programmes.csv is reused for
// the same SIS record (id_obor), and only a record never seen before gets a
// new name-based id.
const sisKey = (url) => (url.match(/id_obor=(\d+)/) || [])[1];
const knownIds = new Map(
  csvToObjects(readFileSync(new URL('../data/programmes.csv', import.meta.url), 'utf8'), 'programmes').rows
    .filter((r) => r.university_id === 'cuni')
    .map((r) => [sisKey(r.official_url), r.programme_id]),
);
const takenIds = new Set(knownIds.values());
const makeId = idMaker('cuni');
const nextId = (name, url) => {
  const known = knownIds.get(sisKey(url));
  if (known) return known;
  let id;
  do id = makeId(name); while (takenIds.has(id));
  takenIds.add(id);
  return id;
};
const rows = [];
const skipped = { notFullTime: 0, noSis: 0 };

for (const [id, card] of singles) {
  const nkUrl = `https://nakarlovku.cz/vyhledavac-studia?program=${id}`;
  const nkHtml = await getHtml(nkUrl);
  const sisUrl = (nkHtml.match(/https:\/\/is\.cuni\.cz\/studium\/prijimacky\/index\.php\?do=detail_obor&(?:amp;)?id_obor=\d+&(?:amp;)?fakulta=\d+/) || [])[0]?.replace(/&amp;/g, '&');
  if (!sisUrl) { skipped.noSis++; continue; }

  const nk = czText(nkHtml);
  const sis = czText(await getHtml(sisUrl));
  if (field(sis, 'Forma studia', 'Druh') !== 'prezenční') { skipped.notFullTime++; continue; }

  const english = /^angličtina/.test(field(sis, 'Jazyk výuky', 'Standardní'));
  const deadline = czechDate(field(sis, 'Termín podání přihlášky:', 'Poznámka|Poplatek|Charakteristika'));
  const places = (sis.match(/Předpokládaný počet přijímaných: (\d+)/) || [])[1];
  const city = CITY[field(nk, 'Lokace', 'Termín')] ?? '?';

  const fee = field(nk, 'Školné', 'Lokace');
  let tuition = '?';
  let feeNote = '';
  if (/^zdarma$/i.test(fee)) tuition = '';            // inherits the university's 0
  else if (/EUR/.test(fee)) tuition = czkAmount(fee);
  else if (/Kč/.test(fee)) {
    tuition = toEur(czkAmount(fee), rate);
    feeNote = `Fee is ${czkAmount(fee).toLocaleString('en-IE')} CZK (euros at ČNB rate, ${rateDate}).`;
  }
  if (english && tuition === '') tuition = '?';    // English-taught is never free

  // SIS can qualify the headline fee in a note. Computer Science: headline
  // 7500 EUR, note "The tuition fee for students from the EU/EEA/Ukraine is
  // 4200 EUR". Science: headline 3000 EUR, note "Pro studenty z oblastí mimo
  // EU/EHP/Ukrajiny činí poplatek 6000 EUR". The headline alone put the
  // non-EU figure on the CS card until a re-check caught it (2026-10-25).
  let tuitionNonEu = '';
  const sisFeeNote = (sis.match(/Poznámka k poplatku[^:]*: (.{0,240})/) || [])[1] || '';
  const euRate = sisFeeNote.match(/students from the EU\S*[^.]{0,40}? is (\d[\d ,]*) EUR/i);
  const nonEuRate = sisFeeNote.match(/mimo EU\S*[^.]{0,40}? činí poplatek (\d[\d ,]*) EUR/i);
  if (euRate && typeof tuition === 'number') { tuitionNonEu = tuition; tuition = czkAmount(euRate[1]); }
  if (nonEuRate) tuitionNonEu = czkAmount(nonEuRate[1]);

  // Three FTVS entries (Fyzioterapie, Trenér, Kondiční trenér) say "Jazyk
  // výuky: čeština" and also carry a "Poplatek za studium v cizím jazyce" — a
  // fee for study in a foreign language. Charles's pages contradict
  // themselves, so the fee is not stated as fact and the card says why.
  if (!english && /Poplatek za studium v cizím jazyce/.test(sis)) {
    tuition = '?';
    feeNote = `Charles's pages conflict: listed as Czech-taught, but with a ${czkAmount(fee).toLocaleString('en-IE')} CZK fee for study in a foreign language. Check which before applying.`;
  }

  const hand = BY_HAND[id] ?? {};
  rows.push(toRow({
    programme_id: nextId(card.name, sisUrl),
    university_id: 'cuni',
    city: city === 'Prague' ? '' : city,
    programme: card.name,
    degree_type: card.degree,
    subject_area: areasForCz(card.name),
    language: english ? 'English' : 'Czech',
    ib_points_min: '',
    ib_subjects: hand.ib_subjects ?? '',
    admission: hand.admission ?? admissionFor(sis).join(' · '),
    tuition_eu: tuition,
    tuition_noneu: tuitionNonEu,
    english_requirement: hand.english_requirement ?? (english ? '' : czechLanguage(sis)),
    application_deadline: deadline,
    deadline_notes: [places ? `About ${places} places.` : '', hand.note, feeNote].filter(Boolean).join(' '),
    official_url: sisUrl,
    last_verified: VERIFIED,
    verified_by: 'AI-DRAFT',
  }));
}

writeFileSync(new URL('./cuni-rows.csv', import.meta.url), `${rows.join('\n')}\n`);
console.log(
  `rows written: ${rows.length}\n`
  + `  skipped ${skipped.notFullTime} not full-time, ${skipped.noSis} with no SIS link`,
);
