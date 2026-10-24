// Shared pieces for the Czech importers (Charles, Masaryk, CTU, VUT, VŠE).
//
// Czech universities differ from the Dutch and Irish ones in three ways that
// shape every row written from here:
//
//   * Admission is decided by each faculty's own entrance exam (or by waiving
//     it), not by an IB points total. ib_points_min stays blank on every Czech
//     row, and the `admission` column says what the hurdle actually is.
//   * Czech-taught study is free at a public university, for Slovak students
//     too. English-taught study is charged, in koruna.
//   * Fees are published in CZK. The site works in euros, so a CZK fee is
//     converted at the Czech National Bank's rate on the day of the import, and
//     the row's note keeps the original figure, because the euro number moves
//     with the exchange rate and the koruna number does not.

import { getHtml, toText, idMaker as plainIdMaker } from './ireland.mjs';

export { getHtml, toRow, areasFor } from './ireland.mjs';

// The shared idMaker keeps only a-z and 0-9, which turns "Účetnictví" into
// "etnictv". Folding the accents off first keeps Czech ids readable.
export function idMaker(prefix) {
  const next = plainIdMaker(prefix);
  return (title) => next(title.normalize('NFD').replace(/\p{Diacritic}/gu, ''));
}

// toText leaves numeric entities alone, and Czech pages write half their
// diacritics as &#283; and friends — "p&#345;ij&#237;mac&#237;" would match
// nothing.
export const czText = (html) =>
  toText(html.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

/** ČNB's EUR rate for today, as CZK per euro. */
export async function czkPerEur() {
  const txt = await getHtml(
    'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt',
  );
  const date = txt.split('\n')[0].split(' ')[0];
  const line = txt.split('\n').find((l) => l.includes('|EUR|'));
  if (!line) throw new Error('ČNB daily rates have no EUR line — the file format has changed.');
  return { rate: Number(line.split('|')[4].replace(',', '.')), date };
}

/** A CZK amount in whole euros, rounded to the nearest 10 so it does not look more exact than it is. */
export const toEur = (czk, rate) => Math.round(czk / rate / 10) * 10;

/** "120,000 CZK", "120 000 Kč" or "120.000,-" -> 120000. */
export const czkAmount = (s) => Number(String(s).replace(/[^\d]/g, ''));

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "31 Oct 2026" or "31 October 2026" -> "2026-10-31". */
export function englishDate(s) {
  const m = String(s).match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/);
  if (!m || !MONTHS[m[2].toLowerCase()]) return '';
  return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** "28. 2. 2027" or "28.02.2027" -> "2027-02-28". */
export function czechDate(s) {
  const m = String(s).match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}
