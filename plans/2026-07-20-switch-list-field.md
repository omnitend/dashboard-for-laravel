# DXForm `type: "switch-list"` field

Status: SHIPPED 2026-07-20 (#160) — implemented as spec'd; see Outcome at the
end. Origin: greendragon app-next cutover — the
product "Allergens" tab is a list of ~14 labelled toggles that was hand-rolled
as a `#span` slot and drifted from the form's label/input grid (rows not
vertically centred, over-tall, labels/switches unaligned). greendragon shipped a
house `OtSwitchList` as a stopgap; this promotes it to a first-class DXForm field
so consumers write **config, not markup**. Retires `OtSwitchList` on adoption.

Also filed alongside: **B7 (labelled span) is NOT needed** — see the note at the
end. A labelled custom control already works via a normal field + `#value(<key>)`
slot.

## Motivation

A "list of labelled boolean toggles" (allergens, feature flags, notification
opt-ins, permission grids) is common and currently forces a `#span` slot full of
bespoke `<div>`/`<label>` layout that re-derives the label grid by hand and
drifts from it. `checkbox-group` already models the array value but renders as
checkboxes in one block, not as per-row labelled switches aligned to the form
grid.

## API

Add `"switch-list"` to `FieldType` (`resources/js/types/index.ts`).

```ts
{
  key: "allergens",
  type: "switch-list",
  label: "Allergens",          // optional section label (see "Label" below)
  options: [                    // reuse FieldOption; `description` -> row tooltip
    { value: 1, text: "Celery", description: "…" },
    { value: 2, text: "Cereals containing gluten" },
    // …
  ],
  optionsResolver,             // async options supported, same as select/checkbox-group
  switchVariant: "neutral",    // REUSE the existing field prop (#158). Default "success".
  hint, info, help, class, disabled, readonly, when   // all standard field props apply
}
```

- **Value model:** an **array of selected option `value`s** — identical to
  `checkbox-group`, so `defineForm` seeding, validation, and diffing already work.
  Toggling a row adds/removes its `value`. (Rationale: matches the existing
  array-valued precedent; a map/object model would be a new shape to support.)
- **`switchVariant`** already exists on `FieldDefinition` (`"success" | "neutral"`)
  and maps to `DXSwitch onVariant`. A switch-list should default to **`"success"`**
  like every other switch, but real lists usually want **`"neutral"`** (a wall of
  red-off toggles reads as alarming — e.g. allergen "not present"); document that.

## Rendering

New branch in `DXField.vue`, mirroring the existing horizontal `switch`/`checkbox`
treatment so it inherits the exact label/content column split:

- One **`DFormGroup v-bind="horizontalAttrs"`** per option row (or a single group
  wrapping rows — see "Label" below), so each row's label sits in the label
  column (`col-sm-5 col-md-4` etc., right-aligned) and the switch in the content
  column. This is the ONLY correct source of the grid — do not hardcode col
  classes (that is exactly the drift the greendragon stopgap has to carry).
- Each row: `#label` = `DXFieldLabel :label="option.text"` (+ `option.description`
  as the label `title`/tooltip); content = a **track** `DFormCheckbox switch`
  (NOT the filled-box `DXSwitch` — a dense list of filled boxes is too heavy;
  compact track switches are the house choice for lists), coloured by
  `switchVariant`.
- **Vertical centring + dividers:** rows are `align-items: center` with a
  `border-bottom` between them (last row none). Compact vertical padding.
- **Per-row extra slot:** expose `#switch-list-item(<key>)` (scoped:
  `{ option, on }`) rendered in the content column beside the switch, for things
  like the allergen "Notes…" input (bound by the consumer to their own model).

### Label

Two reasonable options — pick one:
1. **No section label** (default): each row is self-labelled; the field's own
   `label` is omitted (like a `hideLabel` group). Simplest; matches the current
   allergen look.
2. **Optional section heading**: if `field.label` is set, render it once above
   the rows (full-width, muted), then the rows. Useful when the list needs a
   title ("Allergens", "Notifications").

Recommend supporting (2) but defaulting to (1) when `label` is absent.

## Reuse / touch points
- `FieldType` union + `FieldDefinition` doc — `resources/js/types/index.ts`.
- `DXField.vue` — new `v-else-if="field.type === 'switch-list'"` branch; reuse
  `horizontalAttrs`, `isHorizontal`, `DXFieldLabel`, `DFormCheckbox`,
  `resolvedOptions`/`optionsResolver` (as `checkbox-group` does), `fieldValue`
  getter/setter, `setValue`.
- `defineForm` — array default seeding already handled by the `checkbox-group`
  path; confirm switch-list uses the same.

## Tests
- Renders one labelled switch row per option, aligned (label in label column).
- Toggling a row adds/removes its value from the array model; error clears on change.
- `switchVariant="neutral"` applies the neutral class; default is success.
- Async `optionsResolver` populates rows on resolve.
- `#switch-list-item` slot renders in the content column with `{ option, on }`.
- Empty options → empty list, no crash.

## Docs / playground / changelog
- `DXFieldExample.vue` / `DXFormExample.vue`: add a switch-list example (allergen-style).
- Component docs page + `FieldType` reference.
- CHANGELOG under Added.

## Migration (greendragon)
Replace `OtSwitchList` + the `#span(allergens)` slot with:
```js
{ key: "allergens", type: "switch-list", label: "Allergens",
  switchVariant: "neutral", options: allergenOptions }
```
plus a `#switch-list-item(allergens)` slot for the notes input. Delete
`ot-switch-list.vue`.

---

## B7 (labelled span) — NOT a new feature; already supported

The sibling brief asked for a way to give a custom `#span` control the form's
label column. **DXField already does this**: the default field branch
(`DFormGroup v-bind="horizontalAttrs"`, DXField.vue ~L269) renders the `#label`
column AND a **`#value(<key>)` slot** in the content column. So a labelled custom
control is a *normal* labelled field with a `#value` slot — no `#span`, no
re-derived col classes:

```js
{ key: "web_shop_availability", label: "Visibility" }   // any non-span field
```
```html
<template #value(web_shop_availability)>…custom widget…</template>
```

`#span` should be reserved for genuinely full-width, label-less blocks (a
sub-table, an activity log). greendragon's `web_shop_availability` should move
from `#span` → labelled field + `#value` slot; no dfl change required. Worth a
one-line docs note contrasting `#span` (full-width, no label) vs `#value`
(keeps the label grid).

---

## Outcome (2026-07-20)

Shipped as spec'd, with two small deltas:

- The async-options prop is the existing **`optionsLoader`** (the spec's
  `optionsResolver` was a guessed name); all the select/checkbox-group
  machinery (stale-response token, reload-on-change) is reused untouched.
- Adjacent fix folded in: `defineForm` seeded an unseeded `checkbox-group` as
  `""` (wrong shape) — both it and `switch-list` now default to `[]`.

Label option (2) implemented as recommended: a muted section heading renders
only when `field.label` is set. Rows are per-option `DFormGroup
v-bind="horizontalAttrs"` with `align-items-center` on the group root (its
horizontal root IS the `.row`), so no deep selector into bvn internals was
needed — dividers/padding sit on DXField-owned wrapper divs.

11 tests, including the two-hop keyed-slot forward
(`#switch-list-item(<key>)` through DXForm→DXFormField→DXField), verified
red with the forward neutered. Screenshot-verified at desktop width: labels
right-aligned in the label column, switches centred, dividers between rows.
535 tests green, typecheck + docs build clean.
