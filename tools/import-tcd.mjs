// One-off import: Trinity College Dublin undergraduate courses -> programmes.csv rows.
//
// Trinity publishes, on every course page, the CAO points cutoff with its year,
// the CAO code, and an explicit "International Baccalaureate:" requirement line.
// That is enough to fill ib_points_min honestly for the first time.

import { writeFileSync } from 'node:fs';

const BASE = 'https://www.tcd.ie';
const list = await (await fetch(`${BASE}/courses/undergraduate/a-z-of-ug-courses/`)).text();

const links = [...list.matchAll(/href="(\/courses\/undergraduate\/courses\/[a-z0-9-]+\/?)"[^>]*>([^<]{4,90})</g)]
  .map((m) => ({ h: m[1], t: m[2].replace(/\s+/g, ' ').trim() }))
  .filter((v, i, a) => a.findIndex((z) => z.h === v.h) === i)
  // (JH) courses are joint-honours halves, not standalone degrees.
  .filter((x) => !/\(JH\)/i.test(x.t))
  // Irish-language, vocational and clinical-support routes a Slovak IB student
  // realistically cannot or would not apply to.
  .filter((x) => !/irish|gaeilge|acting|deaf studies|dental (nursing|hygiene|technology)|diploma in/i.test(x.t));

console.log(`courses to fetch: ${links.length}`);

// CAO's official conversion, from the 2026 EU/EFTA guidelines document.
const TABLE = [[45,600],[44,600],[43,594],[42,577],[41,565],[40,553],[39,541],[38,520],[37,508],[36,497],
               [35,481],[34,466],[33,453],[32,442],[31,430],[30,412],[29,400],[28,389],[27,379],[26,368],[25,359],[24,350]];
const lowestIB = (need) => {
  const ok = TABLE.filter(([, p]) => p >= need).map(([ib]) => ib);
  return ok.length ? Math.min(...ok) : null;
};

const SUBJ = [
  [/comput|software|information systems/i, 'Computer Science'],
  [/engineer/i, 'Engineering'],
  [/mathemat/i, 'Mathematics'],
  [/physic|astro/i, 'Physics'],
  [/chemi/i, 'Chemistry'],
  [/biolog|biochem|botany|zoolog|genetic|immunolog|microbiolog|neuroscience|physiolog|biomedical sci/i, 'Biology & Life Sciences'],
  [/environment|geoscience|geography|earth/i, 'Environmental Sciences'],
  [/medicine|dental|pharmac|nursing|health|nutrition|radiation|therap|speech|midwifer/i, 'Medicine & Health'],
  [/psycholog/i, 'Psychology'],
  [/econom/i, 'Economics'],
  [/business|management|commerce/i, 'Business & Management'],
  [/\blaw\b|legal/i, 'Law'],
  [/politic|international relations|european studies|global/i, 'Politics & International Relations'],
  [/sociolog|social (work|studies|policy|science)|anthropol/i, 'Sociology & Anthropology'],
  [/histor|ancient|classic|archaeolog/i, 'History'],
  [/philosoph/i, 'Philosophy'],
  [/language|linguist|english studies|french|german|spanish|italian|russian|polish|literature|classical languages/i, 'Languages & Literature'],
  [/film|media|journalis/i, 'Media & Communication'],
  [/\bart\b|art history|music|drama|theatre|design|visual/i, 'Art & Design'],
  [/architect/i, 'Architecture'],
  [/education|teaching/i, 'Education'],
];
const areasFor = (n) => [...new Set(SUBJ.filter(([re]) => re.test(n)).map(([, a]) => a))].slice(0, 3).join('; ') || 'Liberal Arts';

const esc = (v) => (/[",\r\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const rows = [];
let skipped = 0;

for (const c of links) {
  const html = await (await fetch(BASE + c.h)).text();
  const txt = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const pts = txt.match(/CAO Points\s*(\d{3})\s*\((\d{4})\)/i);
  if (!pts) { skipped++; continue; }
  const cao = +pts[1], year = pts[2];
  const code = (txt.match(/CAO Code\s*([A-Z]{2}\d{3})/i) || [])[1] || '';
  const ibReq = (txt.match(/International Baccalaureate:\s*([^]{0,110}?)(?=English Language Requirements|Course Fees|Advanced GCE|Leaving Certificate|Apply|$)/i) || [])[1];
  const subjects = ibReq ? `IB ${ibReq.trim().replace(/\s+/g, ' ')}` : 'none';
  const needsMaths = /mathemat/i.test(subjects);

  let ib = lowestIB(cao);
  const base = `Last year's CAO cutoff was ${cao} points (${year})${code ? `; CAO code ${code}` : ''}. Cutoffs are set by demand each August and move year to year — this is not a guaranteed minimum.`;
  let note;
  if (ib === null && cao <= 625 && needsMaths) {
    ib = lowestIB(cao - 25);
    note = `${base} Reachable only with the 25 bonus points for HL Maths at grade 4 or better.`;
  } else if (ib === null) {
    note = `${base} ABOVE the 625 points an IB student can reach (45 plus the maths bonus) because the cutoff includes a separate assessment such as the HPAT test or an audition, so no IB equivalent can be given.`;
  } else {
    note = base + (needsMaths ? ' A grade 4+ in HL Maths adds 25 bonus points, so one point lower may suffice.' : '');
  }

  const name = c.t;
  const other = /medicine|dental science/i.test(name) ? 'HPAT admission test'
              : /music education/i.test(name) ? 'Audition or portfolio' : '';

  rows.push([
    'tcd-' + c.h.replace(/\/courses\/undergraduate\/courses\//, '').replace(/\/$/, '').slice(0, 30),
    'tcd', '', name, '', areasFor(name), 'English',
    ib === null ? '' : String(ib), subjects, other,
    '', '', '', '2027-02-01', note,
    BASE + c.h, '2026-08-15', 'AI-DRAFT',
  ].map(esc).join(','));
}

writeFileSync(new URL('./tcd-rows.csv', import.meta.url), rows.join('\n') + '\n');
console.log(`rows written: ${rows.length}, skipped (no published cutoff): ${skipped}`);
