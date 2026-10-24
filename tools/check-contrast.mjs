// Checks every text colour in css/styles.css against the background it is
// actually painted on, in both light and dark.
//
//   node tools/check-contrast.mjs
//
// Why this exists: the first pass of the 2026-08 redesign shipped seven text
// colours below WCAG AA, one of them at 2.63:1, and none of it was visible by
// eye — the palette looked fine. A redesign that swaps the token values is
// exactly the change that reintroduces that, so it gets a check rather than a
// careful look.
//
// Needs no libraries. It reads the token blocks straight out of the stylesheet,
// so it cannot drift from the real values the way a second copy of the palette
// would.
//
// Deliberately out of scope: WCAG 1.4.11 non-text contrast for input borders
// and other component boundaries (--line against --surface). Holding hairline
// borders to 3:1 would mean redesigning them to be much darker, which is a
// design decision, not a regression. Text is what regressed before.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'css/styles.css'), 'utf8');

// ----------------------------------------------------------------- the pairs
//
// Each entry is a colour as it is genuinely rendered: the token the rule sets,
// the token of the nearest ancestor that paints a background, and where to look
// if it fails. Keep this list honest — a pair that is not here is not checked.
//
// `min` defaults to 4.5. It drops to 3 only where WCAG allows it: text at or
// above 24px (or 18.66px bold), and graphical objects such as an icon.
const PAIRS = [
  // on the bare page
  ['--ink',         '--page',        'body text'],
  ['--ink-soft',    '--page',        '.tagline'],
  ['--ink-faint',   '--page',        '#masthead-stat'],

  // on the warm panel: filter rail, shortlist bar, empty state, skeletons, and
  // a card whose country has no tint of its own
  ['--ink',         '--surface',     '.result-count, a neutral .card-title'],
  ['--ink-soft',    '--surface',     '.empty-state, .card-uni'],
  ['--ink-faint',   '--surface',     '.card-place, .facts dt, .verified, .hint, .field label'],
  ['--save',        '--surface',     '.shortlist-count'],

  // on the panel's hover shade
  ['--ink',         '--surface-2',   '.filters > summary:hover'],
  ['--ink-faint',   '--surface-2',   '.chip:hover'],

  // on white: the requirements inset, and every control that sits on a panel
  ['--ink',         '--inset',       '.field input, .button'],
  ['--ink-soft',    '--inset',       '.req-label, .req-quiet, .req-none'],
  ['--ink-faint',   '--inset',       '.ib-label, .req-unit, .star icon'],
  ['--warn',        '--inset',       '.req-unknown — "Not checked yet"'],
  ['--link',        '--inset',       '.official-link'],
  ['--tint-nl-ink', '--inset',       '.req-number on a Dutch card (33.6px serif)', 3],
  ['--tint-ie-ink', '--inset',       '.req-number on an Irish card (33.6px serif)', 3],

  // on a Dutch card
  ['--tint-nl-ink', '--tint-nl',     '.card-title'],
  ['--ink',         '--tint-nl',     '.facts dd'],
  ['--ink-soft',    '--tint-nl',     '.card-uni'],
  ['--ink-faint',   '--tint-nl',     '.card-place, .degree, .facts dt, .verified'],

  // on an Irish card
  ['--tint-ie-ink', '--tint-ie',     '.card-title'],
  ['--ink',         '--tint-ie',     '.facts dd'],
  ['--ink-soft',    '--tint-ie',     '.card-uni'],
  ['--ink-faint',   '--tint-ie',     '.card-place, .degree, .facts dt, .verified'],

  // the brand accent, which appears only outside cards
  ['--accent',      '--accent-soft', '.filters-count, a checked .chip'],
  ['--ink',         '--accent-soft', '.banner body text'],

  // state surfaces
  ['--warn',        '--warn-soft',   '.note, .badge-urgent, .badge-stale, .issues, .banner-warn'],
  ['--danger',      '--danger-soft', '.badge-past, .badge-danger, .banner-danger'],
  ['--save',        '--save-soft',   '.star[aria-pressed="true"] icon', 3],
];

// ----------------------------------------------------------------- the tokens

/** The custom properties declared in one `:root { ... }` block. */
function tokensFrom(block) {
  const out = {};
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[name] = value.trim();
  }
  return out;
}

/** The body of the first `:root { ... }` at or after `from`. */
function rootBlock(text, from = 0) {
  const start = text.indexOf(':root', from);
  if (start === -1) return null;
  const open = text.indexOf('{', start);
  const close = text.indexOf('}', open);
  if (open === -1 || close === -1) return null;
  return text.slice(open + 1, close);
}

const light = tokensFrom(rootBlock(css) ?? '');

const darkAt = css.indexOf('@media (prefers-color-scheme: dark)');
if (darkAt === -1) throw new Error('No dark-mode block found in css/styles.css.');
const dark = { ...light, ...tokensFrom(rootBlock(css, darkAt) ?? '') };

// ------------------------------------------------------------------- contrast

function rgb(hex) {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

// WCAG relative luminance.
function luminance(hex) {
  const parts = rgb(hex);
  if (!parts) return null;
  const [r, g, b] = parts.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a === null || b === null) return null;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// ----------------------------------------------------------------------- run

let failures = 0;
let missing = 0;

for (const [themeName, tokens] of [['light', light], ['dark', dark]]) {
  console.log(`\n${themeName}`);

  for (const [fgName, bgName, where, min = 4.5] of PAIRS) {
    const fg = tokens[fgName];
    const bg = tokens[bgName];

    if (!fg || !bg) {
      console.log(`  MISS  ${fgName} on ${bgName} — token not declared`);
      missing++;
      continue;
    }

    const r = ratio(fg, bg);
    if (r === null) {
      console.log(`  MISS  ${fgName} on ${bgName} — not a hex colour (${fg} / ${bg})`);
      missing++;
      continue;
    }

    const ok = r >= min;
    if (!ok) failures++;
    const shown = r.toFixed(2).padStart(5);
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'}  ${shown}:1  (needs ${min})  ${fgName} on ${bgName}`
      + `${ok ? '' : `\n          ${fg} on ${bg} — used by ${where}`}`,
    );
  }
}

const problems = failures + missing;
console.log(
  problems
    ? `\n${failures} below the minimum, ${missing} unresolvable. `
      + 'Darken the foreground token or lighten its background — do not lower the minimum.'
    : `\nAll ${PAIRS.length * 2} colour pairs pass.`,
);
process.exit(problems ? 1 : 0);
