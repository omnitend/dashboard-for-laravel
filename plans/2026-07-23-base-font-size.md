# Base font size: 14px reads small against legacy's 16px

Status: OPEN. Origin: greendragon /purchase-orders list review (PO20),
2026-07-23.

## Problem

James kept sensing app-next pages as "off balance — sizes of things feel all
off". Measured root cause: legacy omnitend rendered table/body text at
**16px**; dfl's `$font-size-base` is **0.875rem (14px)**. So every ported page
shrank ALL its text ~12% while rem-fixed chrome (control padding, input
heights, chips) stayed the same physical size — controls read proportionally
oversized, text reads miniaturised. This is app-wide, including pages already
reviewed; a per-page fix is the wrong altitude.

## James's steer

"I think **16px is probably a good default, at desktop screen sizes anyway**."
The desktop caveat matters: consider whether the base should be responsive
(e.g. 16px at ≥lg, 14–15px below) or a flat 16px — call it out in the
comparison rather than assuming.

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
