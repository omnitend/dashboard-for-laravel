# DXCurrencyInput — the money input leaf (#152) + minor-units mode (#116)

## Problem

`DXField` already had a `currency` type (with the #69 blur-padded display),
but the logic lived inline, so a money input *outside* a form (a VAT-review
correction column, a filter) re-inlined the `£`-prefix + `toFixed` + parse
foot-guns — and a cleared hand-rolled input emits `NaN`. Separately (#116),
legacy pence-integer columns had no way to be edited as pounds, so the
discounts port fell back to a "pence" number input.

## Shape

One new extended leaf, `DXCurrencyInput` (74th component), extracted from
DXField's currency branch and then used by it:

- Model is always `number | null`; clearing emits `null` (never `NaN`/`""`).
- Display/model split from #69 preserved: padded on blur/seed, never
  reformatted mid-edit (local ref, resync only while unfocused).
- `minorUnits` (#116): display = value / 10^decimals, emit =
  `Math.round(input × 10^decimals)` — the round guards `19.99 × 100 =
  1998.999…`. `min`/`max`/`step` stay in major units. Exposed on fields as
  `minorUnits: true` (scale follows `decimals`, so JPY-style `decimals: 0`
  is identity).
- Consumer listeners flow through `$attrs` onto the inner `DFormInput` (no
  re-emit — Vue merges them with the internal handlers).

## Behaviour change

An emptied `currency` field now writes `null` to the form model (previously
left `""`). Recorded in CHANGELOG; it's the predictable shape #152 asked for.

## Outcome

Landed 2026-07-20. DXField currency tests passed unchanged (display parity);
13 new component tests cover round-trip, empty→null, blur padding, mid-edit
non-reformat, minorUnits float-safety, and decimals-scaling. Docs page +
example + nav entry added; forms.md documents `minorUnits`. 524 tests green,
typecheck + docs build clean.

Post-review addendum (same day, 28bc6c7): Codex found a real P1 — the
`Math.round(num * scale)` guard failed at half-unit boundaries (`1.005 × 100 =
100.4999…` → 100) and negative halves rounded to `-0`. Rounding is now
decimal-safe (toPrecision snap) with halves away from zero, and a hostile
`decimals` prop is clamped instead of throwing. Both red-first tested.
