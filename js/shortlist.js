// The starred list, kept in localStorage. No accounts, no server — it lives in
// this browser on this device, and that is the whole design.
//
// Entries are keyed by programme_id, which is why that column must never be
// edited once a row exists: change it and everyone's saved star points at
// nothing. Ids that no longer exist in the sheet are simply ignored on load.

import { BULLET } from './data.js';

const STORAGE_KEY = 'ib-university-finder:shortlist:v1';

export function loadShortlist() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return new Set(Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : []);
  } catch {
    // Corrupt value, or storage blocked in private browsing. Start empty
    // rather than break the page — the shortlist is a convenience, not the site.
    return new Set();
  }
}

export function saveShortlist(shortlist) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...shortlist]));
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------- export

const EXPORT_COLUMNS = [
  ['University', (r) => r.university],
  ['Programme', (r) => r.programme],
  ['Degree', (r) => r.degreeType],
  ['City', (r) => r.city],
  ['Country', (r) => r.country],
  ['Deadline', (r) => (r.deadline ? r.deadline.toISOString().slice(0, 10) : '')],
  ['Deadline notes', (r) => r.deadlineNotes],
  ['Admission', (r) => r.admission.join(BULLET)],
  ['IB points', (r) => (r.ibPointsMin === null ? 'not published' : String(r.ibPointsMin))],
  ['Subject requirements', (r) => (r.noSubjectsRequired ? 'none required' : (r.ibSubjects || 'not checked'))],
  ['Other requirements', (r) => r.otherRequirements.join(BULLET)],
  ['Language', (r) => r.englishRequirement.join(BULLET)],
  ['Tuition EU per year', (r) => (r.tuitionEu === null ? 'not published' : String(r.tuitionEu))],
  ['Apply via', (r) => r.applicationSystem],
  ['Official page', (r) => r.officialUrl || ''],
  ['Last checked', (r) => (r.lastVerified ? r.lastVerified.toISOString().slice(0, 10) : 'never')],
  ['Checked by', (r) => r.verifiedBy],
];

export function toCsv(rows) {
  const lines = [EXPORT_COLUMNS.map(([heading]) => escapeCsv(heading)).join(',')];
  for (const row of rows) {
    lines.push(EXPORT_COLUMNS.map(([, read]) => escapeCsv(read(row))).join(','));
  }
  return lines.join('\r\n');
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename, csv) {
  // The BOM is what makes Excel open this as UTF-8 instead of mangling
  // "Kraków" into "KrakÃ³w".
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
