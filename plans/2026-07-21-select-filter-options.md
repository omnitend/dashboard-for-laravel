# DXTable — `filter: "select"` option sourcing (greendragon B2 + B3)

Status: **B2 DONE 2026-07-21** (shipped in DXTable; see below). **B3 DEFERRED** —
it needs `api-adapter` contract design and is not started. Origin: list pages
whose column filters are single-select facets. Lower priority than the other
open specs; both are about *where a select-filter column's options come from* so
the page doesn't hand-compute them.

Today a `filter: "select"` column needs the consumer to supply `filterOptions`
explicitly. Two common cases could be handled by DXTable directly.

---

## B2 — client-side auto-derive from loaded data — **DONE**

For a **client-side** table (all rows loaded, `clientSide` / `source: {mode:
'client'}`), a `filter: "select"` column now **auto-derives** its options from
the distinct values present in the loaded data, instead of the page computing
them. legacy lt-table did this.

### As shipped

**ON by default**, not opt-in as originally proposed — the behaviour it replaces
is an EMPTY dropdown, which can only ever be a bug, and dfl's convention is that
new behaviour defaults to the battle-tested usage rather than to
back-compatibility. The opt-out is a field flag:

```ts
{ key: "status", filter: "select" }                              // derives — no config
{ key: "status_id", filter: "select", deriveFilterOptions: false } // opts out
```

Precedence is unchanged at the top: explicit `filterOptions` wins, then
server-supplied `filterValues` (prop or API), then the derived values.

Implementation notes (all in `DXTable.vue`):

- `derivedFilterOptions` is a **computed** over `props.fields` + `resolvedItems`
  only — so it derives from the FULL loaded row set, never the filtered rows
  (which would collapse the dropdown to the value just picked, with no way back)
  and never the current page. Being a computed with no dependency on the filters
  is the structural guard, not just a comment.
- Distinct values keyed by their STRING form — exactly what the client-side
  select filter compares — so every option offered is one the filter can match.
- Sorted numerically when the values are numbers, otherwise locale + `numeric`
  (so `Lane 2` precedes `Lane 10`).
- `null` / `undefined` / `''` skipped: `filterNullText` already gives that case a
  real label.
- A column `formatter` labels the option; the option's value stays raw.
- Dot-path keys resolve through the same helper as the row filter
  (`clientSideFilterValueOf`), extracted so a derived option can never be a
  value the filter then fails to match.
- Provider/API and Inertia modes do NOT derive (one page of rows only).
  `fieldsNeedingFilterValues` is untouched: it is read only by
  `internalProvider`, and provider mode and client-side mode are mutually
  exclusive.

Tests: `tests/components/DXTable-DerivedFilterOptions.test.ts` (9 cases, each
watched fail against the unfixed code). Docs: DXTable.mdx → "Where a `select`
filter's options come from".

---

## B3 — server-side aggregates carried by `api-url` — **DEFERRED**

Not started. It needs `api-adapter` contract design (a new request param and a
new response block, both of which every adapter would have to understand), which
is a bigger decision than B2 and shouldn't ride along with it.


For a **server-side** table (`api-url`), the faceted-filter options can't be
derived from the current page of rows. Today greendragon fetches them with a
**separate `onMounted` `vapi.get(… aggregates …)`** in the page
(`ot-accounts.vue`), because DXTable's own `api-url` fetch neither sends an
`aggregates` param nor exposes the `aggregates` block the API returns.

Proposed: let a `filter: "select"` column declare an aggregate that DXTable
requests through its `api-url` and feeds back into that column's `filterOptions`:

```ts
{ key: "primary_category_id", filter: "select", aggregate: "distinctPrimaryCategories" }
```

DXTable adds `aggregates[]=distinctPrimaryCategories` (or the backend convention's
shape — this should go **through the `api-adapter`** so the param/response
translation stays backend-agnostic, same seam as pagination/sort) to its request,
reads the returned `aggregates` block, and populates the column's filter options.
Removes the page-level fetch entirely.

## Notes

- Both are additive and opt-in; explicit `filterOptions` remains supported.
- B3 must route through `DXTableApiAdapter` so it works for LTApiController
  (greendragon) and any other backend — the adapter already owns request/response
  translation as of 0.33.1, so aggregates should ride the same path.
- greendragon reference for B3's page-side pattern: `ot-accounts.vue`'s
  `onMounted` aggregates fetch (the thing this removes).
