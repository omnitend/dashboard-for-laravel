# Base font size: 14px reads small against legacy's 16px

Status: **DECIDED 2026-07-24 — base → 16px (`1rem`), FLAT (not responsive).**
Signed off against a real three-base recompile (14/15/16px) of a dense DXTable
index; 16px read balanced where 14px read miniaturised against the chrome. The
three-tier 16/14/12 scale falls out of Bootstrap defaults (base 16 → `.875em`
small = 14 → `.75em` badge = 12), so badges self-correct from ~10.5px. Per the
plan, #169 (43px button vs input height) is settled INSIDE this change so heights
re-derive once. Origin: greendragon /purchase-orders list review (PO20),
2026-07-23.

## Execution checklist (re-audit at 16px)

- [x] `$font-size-base: 0.875rem` → `1rem`.
- [x] `--dx-input-height` grows (`1.5em` of a now-16px input): 35px → ~38px.
      Re-check everything pinned to it (DXSwitch box min-height tracks it).
- [x] PO18 sm/lg equalisation — parity holds (suite green, ratio-based).
- [x] Badges → 12px automatically (`.75em`); confirm, and check the badge
      padding still reads right at the larger glyph.
- [x] Optical tweaks — re-verified at 16px by screenshot: the `0.325em` margin
      is em-based so it scales with the label, and the box still sits on the
      text’s visual centre. No re-tune needed. Ratio test is scale-invariant.
- [x] Sidebar/navbar metrics (#93/#95) — pinned in absolute rem, so unaffected
      by the base (navbar-height tests still pass at 64/47px).
- [ ] #169 button height — input height shifted 35→~38px; #169 updated with the
      new figures. Still a deferred decision (James deferred it); the split
      persists proportionally at the new base, nothing to force here.
- [x] Tests: audited; the height/size assertions are ratio- or relative-based
      (or pin rem-fixed chrome), so all 709 pass at 16px unchanged.
- [x] Screenshot confirmed against the real built dist (dense page + optical
      tweaks + badges).

## Problem

James kept sensing app-next pages as "off balance — sizes of things feel all
off". Measured root cause: legacy omnitend rendered table/body text at
**16px**; dfl's `$font-size-base` is **0.875rem (14px)**. So every ported page
shrank ALL its text ~12% while rem-fixed chrome (control padding, input
heights, chips) stayed the same physical size — controls read proportionally
oversized, text reads miniaturised. This is app-wide, including pages already
reviewed; a per-page fix is the wrong altitude.

## James's steer (refined 2026-07-23)

A three-tier type scale, not just a base bump:

- **16px — the default** for most content ("it has to be 16px for most
  stuff"): body text, table cells, form controls, buttons.
- **14px — the small tier**: secondary text that today uses `.small`/
  `<small>` (sub-lines under names, hints, muted meta).
- **12px — the extra-small tier**: fine print (badge text, eyebrow labels,
  WC-style annotations, table footnote captions).

In Bootstrap terms roughly: `$font-size-base: 1rem` (16), `$small-font-size:
.875em` (14), and a deliberate 12px (`.75rem`) tier for the smallest chrome —
today's badges land near 10.5px, which is too small at the new base; they
should sit on the 12px tier, matching legacy's 12px badges.

Earlier caveat still stands: "at desktop screen sizes anyway" — consider
whether the base should be responsive (16px at ≥lg, smaller below) or flat;
show it in the comparison rather than assuming.

## Ask

1. **A properly-themed comparison** — recompile the theme at 14 / 15 / 16px
   `$font-size-base` and screenshot a representative dense page (a DXTable
   index with badges, filters and buttons). A body-font-override simulation
   exists in greendragon (scratchpad `font-comparison.html`) but it
   UNDERCOUNTS: rem-derived control text (inputs, buttons, some headings)
   doesn't scale in the simulation, while a real base change moves it.
2. **Then the change itself** (pending James's screenshot sign-off): bump
   `$font-size-base`, and re-check everything that was tuned in px/rem against
   the 14px base — `--dx-input-height` maths, the sm/lg control equalisation
   (PO18), DXSwitch box, badge scale, table density, the dashboard
   sidebar/navbar metrics (#93/#95), and the optical-centring tweaks (B14
   caret, the checkbox margin ask) whose em values were judged against 14px
   text.
3. Interacts with the open "two height anchors" question (43px buttons vs
   35px inputs, same plans batch): if the base grows, settle both together so
   heights are re-derived once, not twice.

## Downstream

greendragon takes the change via a normal dfl bump; no interim exists (a page-
level font override would fork the system). The review-log entry is PO20.
