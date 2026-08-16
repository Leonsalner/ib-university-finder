// The CAO's own points table for Level 8 (honours bachelor) courses.
//
//   https://www2.cao.ie/points/l8.php
//
// Every Irish university page quotes its own cutoffs, but only the CAO says
// what a cutoff *means*. Three of its markers change the answer entirely:
//
//   AQA  every qualified applicant was offered a place — there was no cutoff,
//        so the real requirement is the university's matriculation minimum
//   #    entry also needed a test, interview, portfolio or audition, so the
//        number alone never decided the offer
//   *    not everyone on that score got a place — ties were broken by random
//        selection, so the number is a floor that was not sufficient
//
// A row that quotes "432 points" without saying which of these applied is
// telling an IB applicant something close to false. That is why this file
// exists rather than trusting each university's own number on its own.

import { getHtml } from './ireland.mjs';

const SOURCE = 'https://www2.cao.ie/points/l8.php';

/** One points value: the number plus whatever the CAO flagged about it. */
function parseValue(raw) {
  if (!raw) return null;
  const token = raw.trim();
  if (!token) return null;
  if (/^AQA$/i.test(token)) return { points: null, aqa: true, test: false, notAll: false, newComp: false };
  if (/^v$/i.test(token)) return { points: null, aqa: false, test: false, notAll: false, newComp: true };
  const num = token.match(/(\d{2,4})/);
  if (!num) return null;
  return {
    points: Number(num[1]),
    aqa: false,
    test: token.includes('#'),
    notAll: token.includes('*'),
    newComp: token.includes('v'),
  };
}

/**
 * Fetches the table and returns Map<caoCode, entry>.
 *
 * `entry.latest` is Round 2 where the CAO published one and Round 1 otherwise —
 * Round 2 is the lower, later cutoff, and quoting the higher Round 1 number
 * would overstate what an applicant actually needed.
 */
export async function fetchCaoPoints() {
  const html = await getHtml(SOURCE);

  // The table is plain fixed-width text inside <PRE> blocks, unchanged in shape
  // for years. Parsing the text is steadier here than parsing markup.
  const text = html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  const map = new Map();

  for (const line of text.split('\n')) {
    // CODE, two-plus spaces, title, two-plus spaces, then one or two values.
    const m = line.match(/^([A-Z]{2}\d{3})\s\s+(\S.*?)\s\s+(\S.*?)\s*$/);
    if (!m) continue;
    const [, code, title, tail] = m;
    const [r1, r2] = tail.split(/\s\s+/).map(parseValue);
    const latest = r2 ?? r1;
    if (!latest) continue;
    map.set(code, { code, title: title.trim(), round1: r1, round2: r2 ?? null, latest });
  }

  if (map.size < 500) {
    throw new Error(`CAO points table parsed only ${map.size} courses — its layout has changed.`);
  }
  return map;
}

/**
 * The sentence that goes in deadline_notes for a CAO-entry course, given what
 * the CAO published about it. Returns null where there is nothing to say.
 */
export function caoNote(entry) {
  if (!entry) return null;
  const { latest, round1, round2 } = entry;
  const round = round2 ? 'Round 2' : 'Round 1';

  if (latest.aqa) {
    return `In 2025 the CAO offered a place to every qualified applicant for ${entry.code} — there was no points `
      + 'cutoff, so meeting the university\'s minimum entry requirements is what matters here, not a points total.';
  }
  if (latest.points === null) {
    return `The CAO lists ${entry.code} as a new competition for available places in 2025, with no points cutoff published.`;
  }

  const parts = [`Last year's CAO cutoff was ${latest.points} points (2025 ${round}; code ${entry.code}).`];
  if (round2 && round1?.points && round1.points !== latest.points) {
    parts.push(`Round 1 closed higher, at ${round1.points}.`);
  }
  parts.push('Cutoffs are set by demand each August and move year to year — this is not a guaranteed minimum.');
  if (latest.test) {
    parts.push('The CAO flags this course as also requiring a test, interview, portfolio or audition, so points alone never decided the offer.');
  }
  if (latest.notAll) {
    parts.push('Not everyone on that score was offered a place — the last places went to random selection.');
  }
  return parts.join(' ');
}
