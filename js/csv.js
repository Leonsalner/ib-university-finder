// A small RFC 4180 CSV parser.
//
// We cannot use text.split(',') because fields like ib_hl_requirements are
// full of commas ("HL Maths AA 6, HL Physics 5"). Google Sheets quotes those
// fields properly on export, so we just have to honour the quoting rules.

export function parseCsv(text) {
  // Strip a UTF-8 byte order mark if the file has one.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';   // an escaped quote inside a quoted field
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;      // commas and newlines are literal in here
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  row.push(field);
  rows.push(row);

  // Drop blank lines, including the one a trailing newline leaves behind.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

// Turns CSV text into objects keyed by the header row.
// A row with the wrong number of columns is reported and skipped rather than
// silently mangled — one bad edit should not take down the whole page.
export function csvToObjects(text, label) {
  const grid = parseCsv(text);
  const issues = [];

  if (grid.length === 0) {
    return { rows: [], issues: [`${label}: the file is empty.`] };
  }

  const header = grid[0].map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    if (cells.length !== header.length) {
      issues.push(
        `${label} row ${i + 1}: expected ${header.length} columns but found ` +
        `${cells.length}. Row skipped — check for a stray quote mark.`
      );
      continue;
    }
    const obj = { __row: i + 1 };
    header.forEach((key, j) => { obj[key] = cells[j].trim(); });
    rows.push(obj);
  }

  return { rows, issues };
}
