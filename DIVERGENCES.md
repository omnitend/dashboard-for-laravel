# Divergences from bootstrap-vue-next

This library wraps **bootstrap-vue-next** (bvn) and bundles a pinned version.
In a few places our public API intentionally differs from the underlying bvn
API — almost always because we *shield* consumers from a bvn breaking change so
that bumping bvn doesn't force every consuming app to migrate.

This file is the **ledger** of those intentional divergences. The plan is to
**converge on bvn's API in a future major version**, shipping a documented
migration path (ideally an automated codemod) so consumers can update
mechanically rather than by hand.

> **Maintainer rule:** whenever you add or remove a shield/divergence, update
> this file in the same change.

---

## Why we can't "support both with a deprecation"

The two formatter/handler styles below are **indistinguishable at runtime** —
`(value) => …` and `({ value }) => …` are both one-argument functions, and JS
gives no way to ask whether a parameter is destructured. `fn.length` only
disambiguates the multi-arg case (`length >= 2` is definitely the old
positional form); the common single-arg form is ambiguous, so auto-detection
would silently break the majority case. Hence: we keep a single, stable
(positional) contract now, and converge later via an **explicit, source-level
migration** (a codemod sees the actual AST, so it *can* disambiguate).

---

## Active divergences

### 1. Table field `formatter` signature

| | |
| --- | --- |
| **Our API** | positional `(value, key, item) => string` |
| **bvn API (≥ 0.43)** | single object `({ value, key, item }) => string` |
| **Shielded in** | `resources/js/components/base/DTable.vue` → `shieldedFields` computed |
| **Applies to** | `DTable` and `DXTable` field definitions (`field.formatter`) |
| **Introduced** | bvn 0.43; shield added when bumping bvn 0.40.8 → 0.45.6 (library 0.6.0) |

**Why:** bvn moved the formatter from positional args to a single object.
Without the shield, every consumer's `formatter: (value) => …` would silently
receive the whole `{ value, key, item }` object as `value` — producing
`$[object Object]` / `NaN` with **no TypeScript error** (the type is still
`(value, …) => string`). A silent runtime break is the worst kind.

**Convergence (future major):** delete the wrap in `shieldedFields` so field
formatters pass straight through to bvn. Consumers change:

```diff
- formatter: (value, key, item) => `$${value.toFixed(2)}`
+ formatter: ({ value, key, item }) => `$${value.toFixed(2)}`
```

**Codemod:** automatable at the source level. A jscodeshift / ast-grep
transform finds `formatter:` properties inside field-definition arrays/objects
and rewrites the first parameter to a destructured object
(`(value) =>` → `({ value }) =>`, `(value, key, item) =>` →
`({ value, key, item }) =>`), leaving the body untouched. The source codemod
can disambiguate the single-arg case that runtime detection cannot.

---

### 2. Table `row-clicked` event payload

| | |
| --- | --- |
| **Our API** | three positional args `(item, index, event)` |
| **bvn API (≥ 0.43)** | single object `{ item, index, event }` |
| **Shielded in** | `resources/js/components/base/DTable.vue` → `handleRowClicked` |
| **Applies to** | `DTable` `@row-clicked`; surfaced through `DXTable` (`rowClicked` event → `handleRowClick(item, index, event)`) |
| **Introduced** | bvn 0.43; shield added at library 0.6.0 |

**Why:** part of the same bvn 0.43 single-object refactor across table emits.
Re-emitting the historic positional shape preserves consumers' handlers.

**Convergence (future major):** re-emit bvn's object payload. Consumers change:

```diff
- <DXTable @row-clicked="(item, index, event) => open(item)" />
+ <DXTable @row-clicked="({ item, index, event }) => open(item)" />
```

**Codemod:** automatable — rewrite `@row-clicked` / `rowClicked` handler
signatures from positional to a destructured object.

---

### 3. `DButton` `icon` — glyph-name string vs bvn boolean

| | |
| --- | --- |
| **Our API** | `icon?: string` — a Bootstrap Icons glyph name (`icon="save"` → `<i class="bi bi-save">`) |
| **bvn API** | `icon?: boolean` — icon-button styling mode (inherited from `BLinkProps`) |
| **Shielded in** | `resources/js/components/base/DButton.vue` (declared prop + template) |
| **Applies to** | `DButton` |
| **Introduced** | issue #76 |

**Why:** #76 wanted a terse leading-icon API (`icon="save"`) matching the admin
apps being migrated onto this library. `icon` is the natural name, but bvn
already uses `icon` as a `boolean`. Because we declare `icon` as a prop it's
stripped from `$attrs`, so bvn's boolean icon-button mode is **unreachable**
through `DButton`. This is a type-incompatible takeover, not a pass-through.

**Convergence (future major):** to be decided — either rename our prop (e.g.
`leadingIcon`) and restore bvn's boolean `icon`, or keep the string form and
drop bvn's boolean mode deliberately. A codemod can rewrite `icon="name"` call
sites either way. Tracked alongside the icon-strategy spike (#77).

---

### 4. `DButton` `loading` / `loadingText` — anti-flash override of bvn's native loading

| | |
| --- | --- |
| **Our API** | `loading`/`loadingText` drive an **anti-flash** spinner (delayed show + minimum display), rendered by us |
| **bvn API** | `BButton` has native `loading`/`loadingText`/`loadingFill` that show a spinner **immediately** |
| **Shielded in** | `resources/js/components/base/DButton.vue` (declared props + spinner state machine) |
| **Applies to** | `DButton` |
| **Introduced** | issue #76 |

**Why:** #76 asked for the anti-flash behaviour (no spinner for sub-`spinnerDelay`
actions; a `minSpinnerTime` floor once shown) that bvn's immediate spinner
doesn't provide. Same prop names and types as bvn, but we intercept them so
bvn's native loading never fires — the behaviour differs. `loadingFill` is not
re-exposed. Unlike #1/#2 this is an *enhancement* of a same-typed prop, so it's
source-compatible with bvn; only the runtime timing differs.

**Convergence (future major):** decide whether the anti-flash timing becomes the
default everywhere or an opt-in, then either keep this override or delegate to
bvn. No consumer source change needed (types match); document the timing
behaviour in the changelog.

---

### 5. `DFormSelect` `null` option value — round-trips where bvn drops it

| | |
| --- | --- |
| **Our API** | a `select` option with `value: null` (and a `null` model) selects/round-trips correctly; emit stays `null` |
| **bvn API** | `BFormSelect` renders the option's value as a plain `value` attribute, so `null` is omitted → the browser uses the option **text** as its value and a `null` model matches nothing (renders blank) |
| **Shielded in** | `resources/js/components/base/DFormSelect.vue` (intercepts `options`/`modelValue`, maps `null` ↔ a private sentinel) |
| **Applies to** | `DFormSelect` |
| **Introduced** | issue #81 |

**Why:** legacy Bootstrap-Vue (BS4) handled a `null` option value; bvn's
`BFormSelect` does not. A "None"/"no selection" option stored as `null` is very
common, so without this every consumer repeats a sentinel workaround. Same prop
names/types as bvn (`options`, `modelValue`) — this is a same-typed behavioural
enhancement (like #4), source-compatible with bvn; only the `null`-handling
runtime behaviour differs. The sentinel is internal and never leaves the
component (the consumer's model and emitted value stay `null`).

**Known limitation:** the sentinel is decoded on the model/emit boundary but
**not** inside bvn's `option` scoped slot — a consumer using
`<template #option="{ value }">` receives the private sentinel string (not
`null`) for the null option. Nothing in this library uses that slot, and
decoding it would mean special-casing the slot name in the forwarder (against
the "don't enumerate known slots" rule), so it's left as-is until a consumer
needs it.

**Convergence (future major):** if a future bvn fixes `null` option handling
natively, drop the encode/decode in `DFormSelect` and pass straight through. No
consumer source change needed (types match); document in the changelog.
(Radios likely need the same treatment — tracked in #81.)

---

## Components that are NOT wrapped (raw bvn passthrough)

These are exported directly as the underlying bvn component (not a `D*`
wrapper), so they follow bvn's API exactly and carry **no wrapper-stability
guarantee** — a bvn change to them flows straight through to consumers.

- `DCarousel` → `BCarousel`, `DCarouselSlide` → `BCarouselSlide`
  (bvn 0.45 registers carousel slides by scanning slot vnodes for the slide
  component type, which a wrapper component in between breaks. See
  `resources/js/index.ts`.)

---

## Notes for a future convergence release

- Roll all convergences into **one major version** so consumers migrate once.
- Ship a **codemod** (jscodeshift or ast-grep) plus a migration guide with
  before/after examples. The test suite (`tests/`) and the playground are the
  guardrails — convergence is mechanical with clear instructions.
- On convergence, remove the converged entry from this file and document the
  break in `CHANGELOG.md`.

---

## `DAutocomplete` — the clear (✕) is hidden when there is nothing to clear

**bvn:** `BAutocomplete`'s `hasSelection` excludes only `null` and `undefined`,
so an **empty string counts as a selection** and the clear button renders on an
empty field.

**Ours:** `DAutocomplete` treats `''` (and an empty array, for `multiple`) as *no
value* and forces `no-clear-button` in that state.

**Why:** `DXTable` renders this control for every `select` column filter, so a
freshly loaded table showed a ✕ on every empty filter — reading as "these have a
value you should clear" when they don't, and putting an inert button in the tab
order (#108). A consumer's explicit `no-clear-button` still wins; the shield only
ever *hides* the button, never forces it on.

**Convergence:** drop the shield if bvn tightens `hasSelection` to exclude the
empty string.

---
