# DXSwitch primitive + switch colour consistency

**Date:** 2026-07-10
**Branch:** `feat/dxswitch-primitive` (stacked on `chore/7-audit-sweep` / PR #86)

## Problem

The library ships two visually different switches:

- **Base `DFormCheckbox` with `switch`** — the raw bootstrap-vue-next switch (round toggle, label beside it, on-state = **primary/indigo**).
- **`DXField` `type: 'switch'`** — a bespoke "filled box" toggle (bordered box sized like a `.form-control`, label inside, on-state = **success/green**), styled via `.dx-switch` `:deep()` rules inlined in `DXField.vue`.

Two problems:
1. The nice filled-box switch isn't reusable — it only exists inside a `DXForm`/`DXField`, so a consumer can't drop it in standalone.
2. The on-state colour is inconsistent: green in a form, blue on the base switch / every checkbox / radio.

## Decisions (agreed with user)

- **Extract a `DXSwitch` primitive** (extended, `DX*`) that owns the filled-box switch. `DXField`'s switch branches consume it — single source of truth for the markup + styling (same dedup as #83).
- **Standardise the switch on-colour on `--bs-primary` (indigo).** The filled switch changes green → primary; the base switch and checkboxes are already primary, so all boolean controls now share one on-colour. **Green stays reserved for real success semantics.**

## Steps

1. **`resources/js/components/extended/DXSwitch.vue`** (new)
   - Root: a plain `<div class="dx-switch" :class="{ 'dx-switch--on': isOn }">` (plain-element root so the scope-id lands and `:deep()` works — CLAUDE.md gotcha).
   - Renders `<DFormCheckbox switch v-model=… v-bind="$attrs">` with a `label` prop and a default slot for the inner label (slot wins; lets `DXField` pass a `DXFieldLabel`).
   - `modelValue` v-model (boolean); `isOn` computed from it.
   - Move the `.dx-switch` `:deep()` styles here from `DXField`, recolouring the on-state **success → primary** (`--bs-primary-bg-subtle`, `--bs-primary`, `--bs-primary-text-emphasis`, `--bs-primary-rgb`).
   - `inheritAttrs: false`, forward `$attrs` to `DFormCheckbox` (disabled/id/name/…).

2. **Export** `DXSwitch` from `resources/js/index.ts`.

3. **Refactor `DXField.vue`** — both switch branches (horizontal `DFormGroup` + vertical `div`) render `<DXSwitch>` instead of the inline `.dx-switch` div + `DFormCheckbox`; drop the `.dx-switch` `:deep()` block (now in `DXSwitch`). Keep the form-field wrapping (row label column, hideLabel, error, hint, info, `value` slot, contextual `switchText`). `switchIsOn` moves into `DXSwitch`; keep `switchModel`/`switchText` in `DXField`.

4. **`tests/components/scoped-deep-styles.test.ts`** — move the `.dx-switch` deep target from `DXField` → `DXSwitch` in `KNOWN_DEEP_TARGETS`; add a DOM-level assertion for `DXSwitch` (rebuild `dist/` first — the test reads the scope-id from the built bundle).

5. **`tests/components/DXSwitch.test.ts`** (new) — renders; `v-model` toggles; `.dx-switch--on` applied when on; label via prop and via slot; `disabled` forwarded; on-state uses primary (assert the checked input's computed colour / class, not green).

6. **Docs** — `DXSwitchExample.vue` + `DXSwitch.mdx` (Live Examples + Props/Slots); add to `docs/src/config/navigation.ts` and the `components.astro` extended table.

7. **CHANGELOG** — Added: `DXSwitch`. Changed: `DXField`/`DXForm` switch on-state colour green → primary (visible change for existing consumers, e.g. the Omni Tend "Product is current" switch).

## Verification

- `npm run typecheck`, `npm run build`, `npm run test:headless` (all green; scoped-deep guard passes against rebuilt `dist/`).
- `npm run docs:build`; screenshot the new `DXSwitch` page **and** the `DXForm`/`DXField` switch to confirm the pill is now indigo, not green.
- Confirm base `DFormCheckbox` switch and checkboxes are unchanged (still primary).

## Notes

- Not a bvn divergence (new composed component) — no `DIVERGENCES.md` entry needed; the colour change is a CHANGELOG note.
- Stacked on #86; retarget the PR to `main` (or merge #86 first) before landing.
