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
// Kept short on purpose (2026-10-24): it appears on 500-odd cards, and the long
// version made every card a paragraph. A course needing a test or interview
// gets no sentence here, because the importers already tag it under "Other".
export function caoNote(entry) {
  if (!entry) return null;
  const { latest } = entry;

  if (latest.aqa) {
    return `2025: every qualified applicant got a place (code ${entry.code}) — no cutoff.`;
  }
  if (latest.points === null) {
    return `No 2025 cutoff published (code ${entry.code}).`;
  }

  // The latest round is the one quoted — Round 2 where there was one, which is
  // lower than the Round 1 figure universities tend to advertise.
  const parts = [
    `2025 CAO cutoff: ${latest.points} points (code ${entry.code}).`,
    'Changes yearly — not a guaranteed minimum.',
  ];
  if (latest.notAll) parts.push('Some applicants on that score missed out (random draw).');
  return parts.join(' ');
}
