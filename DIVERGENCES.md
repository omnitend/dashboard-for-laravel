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
