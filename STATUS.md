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
2. **Fees for UCD, UCC, DCU and Maynooth.** Still blank, so the tuition filter
   ignores 331 of the 757 rows. UL (86 rows, per course) and Galway (54 rows,
   one university-wide figure) are done. None of the other four publishes a fee
   on the course page, so this means finding each fees page by hand.
   DCU is the awkward one: its course pages print "Student Contribution €2,543.
   EU Status Fee €5,922" without saying whether the second figure includes the
   first, so it was left blank rather than guessed at. Galway's equivalent table
   is explicit — €3,098 tuition + €2,500 contribution + €140 levy = €5,738
   "Total EU Fee" — which is why Galway could be filled and DCU could not.
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
- 746 of 757 have no English requirement — the Dutch universities mostly do not
  publish one per programme, and none of the six new Irish universities has had
  its university-level default filled in yet.
- `student_life_url` is empty everywhere. Never invent these.
- Subject areas are keyword-mapped from course titles across all seven Irish
  universities, and a few are rough.
- The six new Irish universities have **no baseline requirement and no English
  requirement** at university level — blank, meaning nobody has checked. Fees
  are done for UL and Galway only; see job 2.
- **368 of the 555 Irish rows have a blank `ib_subjects`.** Only UCD and
  Trinity publish subject requirements per course; the other five do not, so
  blank here means "not checked", not "nothing to meet". A further 7 Trinity
  rows say `none`, and there that is verified: Trinity runs its "Admission
  Requirements" heading straight into "English Language Requirements" on those
  pages, which is how it says a course asks for no particular subjects.

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
  citizen. The columns still exist; nothing reads them.
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
by all seven. `tools/lib/irish-import.mjs` is the whole flow for the five
cutoff-only universities, so `import-ucc.mjs` and its siblings are just a list
URL, a link pattern and a CAO-code pattern. Two stand alone: `import-ucd.mjs`,
because UCD publishes an IB minimum outright, and `import-tcd.mjs`, because
Trinity states a subject requirement per course and hides some of them on
parent pages.

Never open the CSVs in Excel — see MAINTENANCE.md.
