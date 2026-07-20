# #51 — multi-value autocomplete column filters (DXTable)

Follow-up to #49 (select filters became a `DAutocomplete` typeahead).
`filterMultiple: true` on a `filter: 'select'` field lets a column filter hold
SEVERAL values (status in [active, pending]).

## The encoding question answers itself now

The issue asked for a design note on the query-param encoding. Since #132 the
built-in provider goes through our own `api.get`, whose serializer already
emits `filters[status][]=active&filters[status][]=pending` for an array value
— the bracket form Laravel parses natively — and Inertia's `router.get`
qs-encodes arrays the same way. So the array simply flows through both server
modes untouched; nothing new to agree on.

## Changes

- **Contract**: the filters map widens to `Record<string, string | string[]>`
  (prop, emits, internal ref). An empty array means "no filter" and is removed
  from the map like `''`.
- **Opt-in**: `filterMultiple?: boolean` on `TableField` — only meaningful
  with `filter: 'select'`; single-value stays the default.
- **UI**: the filter cell renders `DAutocomplete multiple` (array model,
  chips). The `__dx_filter_all__` "All …" sentinel row is OMITTED in multiple
  mode — its job (a discoverable way back to unfiltered) is served by chip
  removal and the ✕ clear; a "no filter" row inside a multi-select reads as a
  selectable value. `filterNullText` (match-absent) stays available as a
  pickable value alongside real ones.
- **Client-side mode**: array membership — the row matches when its value
  equals ANY selected value (exact-match semantics, same as single select);
  the null sentinel inside the array matches absent values.
- **Guards**: every `.trim()` on a filter value (`hasActiveFilters`, the
  predicate's active-key scan, `handleFilterChange`'s empty check) learns the
  array shape instead of throwing on it.

## Tests (written first)

- Multi filter renders chips input; selecting two values narrows client-side
  rows to the union; removing all chips restores every row.
- Null sentinel in the array matches rows with an absent value.
- Provider mode: `api.get` receives `filters: { status: ['a', 'p'] }`.
- Single-value fields are untouched (regression).

## Outcome

Landed as planned, 2026-07-20. Five tests written first and watched red; all
green after: client-side union + null-sentinel-in-array + empty-array cases,
the full interaction path (two accumulating chip selections through bvn's
typeahead → `update:filters` arrays → rows narrowed), and the omitted "All …"
sentinel. One test-authoring lesson recorded in the test itself: a listener on
`update:filters` flips DXTable into CONTROLLED filters mode, so an
interaction test must bind-and-feed-back (real v-model), not just listen —
listen-only reads as one-value-at-a-time replacement. The predicate refactor
made scalar filtering the one-candidate case of the array rule, so
single-value behaviour is provably unchanged (existing DXTable suite intact).
