# Where this project is

Written so anyone — including a fresh session with no memory of the work — can
pick it up without re-deriving decisions. Update it when the state changes.

**Live:** https://kpolacik.github.io/ib-university-finder/
**Repo:** https://github.com/kpolacik/ib-university-finder

## State

757 programmes · 20 universities · 2 countries · all checks passing.

| Country | Universities | Programmes | Notes |
|---|---|---|---|
| Netherlands | 13 | 202 | **Complete** — every Dutch research university |
| Ireland | 7 | 555 | **Complete** — every Irish university |

Ireland breaks down as UCD 140, UL 87, Trinity 83, DCU 71, Maynooth 64,
UCC 56, Galway 54.

**Every row is `AI-DRAFT`.** Nobody has verified a single one against an
official page. The site says so, loudly, on a banner and on every card.

## The next obvious jobs, in order

1. **Sign off the rows that matter.** Pick the 15–20 programmes actually being
   applied to, open each official page, and replace `AI-DRAFT` with real
   initials. Do not attempt all 757.
2. **UCD's fees, and DCU's English requirement.** These are the last two holes,
   and both are the university's fault rather than nobody having looked.

   UCD's own "EU Undergraduate Fees 2026/27" page says *"Fees published for the
   Colleges below…"* and then publishes nothing below — the only figure on it is
   the €254 student centre levy. The 2025/26 page is the same, and rendering the
   page in a browser shows no tables either. So all 140 UCD rows have no fee.
   Someone will have to email UCD or find the figure in a prospectus.

   DCU's English language requirements page 404s and nothing else on the site
   states an IB equivalence, so its 71 rows show no English requirement.
3. **Connect the Google Sheet.** Two tabs, published to the web as CSV, URLs
   pasted into `js/config.js`. Until then the site reads `data/*.csv` from the
   repo and nobody can maintain it without Git.
4. **Living costs.** Blank for all 20 universities. Nineteen numbers would
   improve the tuition filter more than anything else, because rent dwarfs
   tuition everywhere in this dataset.

## Known gaps

- 20 programmes have no deadline (18 Leiden, plus VU Law in Society and Tilburg
  Psychology, where the university lists several dates without saying which is
  the application deadline).
- 250 of 757 show no English requirement, counting the university default each
  programme inherits. Almost all are Dutch; on the Irish side only DCU's 71 are
  missing, for the reason in job 2.
- 152 of 757 show no tuition figure, again after inheritance. 140 of those are
  UCD; the other 12 are Dutch.
- `student_life_url` is empty everywhere. Never invent these.
- Subject areas are keyword-mapped from course titles across all seven Irish
  universities, and a few are rough.
- **`baseline_requirement` is blank for all six new Irish universities.** UCD
  does state one — "24 or more total points and the award of the IB Diploma" —
  but only on a page headed "for international (non-EU/non-EEA) students only",
  and a Slovak applicant goes through the CAO as an EU applicant. Left blank
  rather than borrowed from the wrong audience. The per-course `ib_points_min`
  carries the number that actually matters anyway.
- **368 of the 555 Irish rows have a blank `ib_subjects`.** Only UCD and
  Trinity publish subject requirements per course; the other five do not, so
  blank here means "not checked", not "nothing to meet". A further 7 Trinity
  rows say `none`, and there that is verified: Trinity runs its "Admission
  Requirements" heading straight into "English Language Requirements" on those
  pages, which is how it says a course asks for no particular subjects.

## The look of it

Redesigned on 2026-08-16. The rules it follows, so a later edit does not undo
them by accident:

- **One accent hue.** Amber and red are *states* — not checked, deadline passed
  — and never decoration. Nothing else is coloured.
- **Type is Geist**, loaded from Google Fonts with the full system stack behind
  it, so a blocked or slow font costs character and nothing else. Figures use
  `font-variant-numeric: tabular-nums` so points and fees line up column-wise
  when two cards sit side by side.
- **No emoji or dingbats.** Every icon is an SVG `<symbol>` in the sprite at the
  top of `index.html`, referenced with `<use>`. The old `★`/`☆` rendered as
  colour emoji on some platforms.
- **Layout is asymmetric**: above 1080px the filters become a sticky rail beside
  the results rather than a drawer above them. Below that they collapse to the
  accordion, and `app.js` only auto-opens the panel at 1080px and up.
- **Motion is transform and opacity only**, and the whole of it stops under
  `prefers-reduced-motion: reduce`. Only the first ten cards animate in;
  staggering 757 would queue animations nobody will ever see.
- **Contrast is checked, not eyeballed.** Every text colour clears WCAG AA
  (4.5:1) against its own background in both light and dark. `--ink-soft` and
  `--ink-faint` both carry real text and both pass; anything paler than
  `--ink-faint` is for rules and borders only, never for words.

### Three traps this hit, all of which looked like working code

- **`[hidden]` loses to any author `display` rule.** The attribute is only
  `display: none` in the UA stylesheet, so `.skeletons { display: grid }` beat
  it and the "hidden" loading block kept its space — pushing the first card
  756px down, below the fold on a laptop. There is now a global
  `[hidden] { display: none !important }`.
- **`content-visibility: auto` skips style recalculation inside a card.** State
  expressed only as CSS on an attribute selector *inside* a card can paint
  stale; the card's own classes are fine, because the card is the containment
  root. That is why the save button swaps which `<symbol>` it references rather
  than only recolouring on `[aria-pressed]` — a content change always lands.
  The old `★`/`☆` swap was accidentally immune to this. Prefer content over
  style for anything that changes inside a card.
- **A CSS `transform` on an inline element in the summary resolved to identity**
  in testing, even set inline, while the same declaration on a `<div>` worked.
  The filter chevron therefore shows one of two icons instead of rotating one.

## Bugs found and fixed, so they are not reintroduced

- **A capped regex silently became "no requirement" (fixed 2026-08-16).**
  `import-tcd.mjs` captured the text after "International Baccalaureate:" with
  a 110-character limit. Trinity's requirements routinely run longer than that
  ("SL Grade 5 Mathematics HL Grade 5 in two of Physics, Chemistry, Biology,
  ..."), so the match failed outright and the code fell through to writing
  `none` — telling a student there was no subject requirement where Trinity
  demands several. **39 of 79 rows were wrong.** Trinity now states a real
  subject requirement on 66 rows where it managed 20 before.

  The lesson is not "the number 110 was too small". It is that the failure
  branch of a parser must never be the reassuring answer. Every importer here
  now writes blank — "not checked" — when it cannot read something, and only
  writes `none` on positive evidence that the university means none.

- **Stream courses inherit from a parent page.** Trinity's "Chemistry: Chemical
  Sciences" does not repeat the requirement; it links to the parent course that
  carries it. The importer follows that link once, which recovered 15 rows.

## Decisions already made, so they are not relitigated

- **One row per programme**, joined to a university by `university_id`. Two
  tabs, so university-level facts are typed once.
- **Unknown never hides a programme** from a filter. It is shown and labelled.
- **`none` and blank are different.** `none` means the university says there is
  no requirement; blank means nobody has checked. Blank defaults to "not
  checked" so a forgotten cell never reads as "nothing to meet".
- **`?` means "differs from the university default, value unknown"** and never
  inherits. Used where a university college charges more than the standard rate
  but the figure has not been confirmed.
- **Non-EU tuition is not collected.** Everyone using this site is an EU
  citizen. The columns still exist; nothing reads them. The Irish importers do
  fill `tuition_noneu` where a page happens to print it, because it costs
  nothing to keep.
- **The Irish fee recorded is the full EU fee, not the student contribution.**
  Ireland's Free Fees Initiative needs three years' EU residency, which someone
  arriving from Slovakia for the degree will not have. So they pay tuition plus
  contribution plus levy — UCC's "Total Fees" column, Maynooth's "Total Fee",
  DCU's "EU Status Fee", Galway's "Total EU Fee", UL's "EU fees per year" —
  and not the €2,500-ish a resident pays. Recording the resident figure would
  understate the cost by two to five thousand euro a year.
- **Irish points are last year's demand-driven cutoffs**, not minimums, and the
  cards say so. Conversions never assume the HL Maths bonus. The one exception
  is UCD, which publishes an IB total it will accept, so UCD's numbers are real
  minimums and its cutoff sits in the note instead.
- **Cutoffs come from the CAO, not from the universities' own pages.** Only the
  CAO says what a cutoff *meant*: `AQA` (everyone qualified got in, so there was
  no cutoff at all), `#` (a test, interview, portfolio or audition also
  applied), `*` (not everyone on that score got a place — ties went to random
  selection). A bare number without those markers misleads. The CAO also
  publishes Round 2, which is lower than the Round 1 figure universities tend to
  advertise: UL's own page says 499 for Psychology, the CAO's Round 2 says 496.
- **Where several programmes share one CAO code, every row says so.** UL's
  LM116 is "Engineering (Common Entry)" and covers Civil, Biomedical and the
  rest; UL's LM002 Arts covers every Arts subject; UCD's DN250 covers three
  agriculture degrees. You apply to the code, not the programme, so the cutoff
  belongs to the code. 180 rows carry that sentence.
- The **UK is excluded**: post-Brexit, EU students pay international fees of
  roughly £25,000–38,000, so it is not a realistic option for this cohort.

## Country notes worth keeping

- **Netherlands** admits on *subjects*, not totals — only 1 of 202 Dutch rows
  has a points minimum, and that is correct, not missing data.
- **Ireland** publishes a CAO cutoff per course and an official IB conversion,
  which is why 542 of the 555 Irish rows have a number. It also issues **no
  conditional offers** — decisions arrive mid-August.
- **Where each Irish university hides its data**, since finding this again was
  most of the work: UCD's course list is drawn by JavaScript from an internal
  reporting endpoint and its plain HTML carries no list at all (the importer
  replays the query token the course browser itself sends, and fails loudly if
  UCD rotates it). UCC encodes the CAO code in the URL (`/en/ck101/`). Galway
  links every course twice, once under its title and once under its CAO code.
  UL's index mixes degree pages with subject pages; only the code separates
  them. UCD and Maynooth answer `403` to a bare Node fetch, so every request
  carries a browser user-agent.
- **And where each hides its fees**: UCC and Maynooth publish one schedule for
  every course, keyed by CAO code — UCC as an HTML table, Maynooth as a PDF
  (which is what `tools/lib/pdf.mjs` reads). DCU and UL print the fee on each
  course page. Galway prints one figure for all courses. UCD publishes nothing
  readable. Maynooth's PDF link carries a version and date in its filename and
  is discovered from the fees page, never hardcoded — it was already at V.2
  while search engines still pointed at V.1. Two rows in that PDF have parts
  that do not sum to their stated total, and those are skipped rather than
  recorded wrong.
- **Denmark** was investigated and set aside: the University of Copenhagen
  teaches every bachelor in Danish, and the English-taught undergraduate
  offering is thin and split across seven institutions.
- **Czechia** is the best unexplored option for Slovak students specifically:
  Czech-taught degrees are free and Slovak speakers can realistically take them.

## Running it

```bash
python -m http.server 8765      # then open http://localhost:8765
node tools/check.mjs            # 45 checks, must end "All checks passed"
node tools/make-snapshot.mjs    # rebuild data/fallback.json after data changes
```

The importers are one-off and already run; their output is merged into
`data/programmes.csv`. Re-run one only to refresh a university:

```bash
node tools/import-ucd.mjs       # writes tools/ucd-rows.csv, does not merge
```

`tools/lib/cao-points.mjs` parses the CAO's Level 8 points table and is shared
by all seven. `tools/lib/pdf.mjs` is the PDF text extractor that used to be
`pdftext.mjs`; the command-line tool still works and now wraps it. `tools/lib/irish-import.mjs` is the whole flow for the five
cutoff-only universities, so `import-ucc.mjs` and its siblings are just a list
URL, a link pattern and a CAO-code pattern. Two stand alone: `import-ucd.mjs`,
because UCD publishes an IB minimum outright, and `import-tcd.mjs`, because
Trinity states a subject requirement per course and hides some of them on
parent pages.

Never open the CSVs in Excel — see MAINTENANCE.md.
