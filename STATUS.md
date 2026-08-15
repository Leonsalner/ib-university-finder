# Where this project is

Written so anyone — including a fresh session with no memory of the work — can
pick it up without re-deriving decisions. Update it when the state changes.

**Live:** https://kpolacik.github.io/ib-university-finder/
**Repo:** https://github.com/kpolacik/ib-university-finder

## State

281 programmes · 14 universities · 2 countries · all checks passing.

| Country | Universities | Programmes | Notes |
|---|---|---|---|
| Netherlands | 13 | 202 | **Complete** — every Dutch research university |
| Ireland | 1 | 79 | Trinity only. Six universities remain |

**Every row is `AI-DRAFT`.** Nobody has verified a single one against an
official page. The site says so, loudly, on a banner and on every card.

## The next obvious jobs, in order

1. **Sign off the rows that matter.** Pick the 15–20 programmes actually being
   applied to, open each official page, and replace `AI-DRAFT` with real
   initials. Do not attempt all 281.
2. **Connect the Google Sheet.** Two tabs, published to the web as CSV, URLs
   pasted into `js/config.js`. Until then the site reads `data/*.csv` from the
   repo and nobody can maintain it without Git.
3. **The remaining six Irish universities** — UCD, Cork, Galway, DCU, Limerick,
   Maynooth. `tools/import-tcd.mjs` is the working pattern; each university
   needs its own selectors but the shape is the same.
4. **Living costs.** Blank for all 14 universities. Thirteen numbers would
   improve the tuition filter more than anything else, because rent dwarfs
   tuition everywhere in this dataset.

## Known gaps

- 20 programmes have no deadline (18 Leiden, plus VU Law in Society and Tilburg
  Psychology, where the university lists several dates without saying which is
  the application deadline).
- 179 have no English requirement — mostly the Dutch universities that do not
  publish one per programme.
- `student_life_url` is empty everywhere. Never invent these.
- Trinity's subject areas are keyword-mapped and a few are rough.

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
  cards say so. Conversions never assume the HL Maths bonus.
- The **UK is excluded**: post-Brexit, EU students pay international fees of
  roughly £25,000–38,000, so it is not a realistic option for this cohort.

## Country notes worth keeping

- **Netherlands** admits on *subjects*, not totals — only 1 of 202 Dutch rows
  has a points minimum, and that is correct, not missing data.
- **Ireland** publishes a CAO cutoff per course and an official IB conversion,
  which is why 76 of the 79 Trinity rows have a number. It also issues **no
  conditional offers** — decisions arrive mid-August.
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

Never open the CSVs in Excel — see MAINTENANCE.md.
