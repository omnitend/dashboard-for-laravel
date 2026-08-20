# DXTable: a default page size that a stored preference can beat, and the matching total

Status: OPEN. Origin: a consumer's control-parity audit against its previous
table component, 2026-08-20. Two small, independent asks that both came out of
the same audit.

---

## 1. `default-per-page` — a fallback the user's stored choice still overrides

### Problem

`DXTable` falls back to **10** rows when the consumer passes no `per-page`, and
an app cannot change that fallback without giving up the per-table persistence.

The persistence rule today (`getInitialPerPage`) is:

1. an **explicitly passed** `per-page` wins outright (#124);
2. otherwise a value stored in `localStorage` for this table's URL wins;
3. otherwise `props.perPage || 10`.

So an app whose house page size is 20 has only bad options:

- **pass `:per-page="20"` everywhere** — every table now takes branch 1, and the
  size the user picked themselves is silently reset on every visit. The feature
  that remembers their choice is switched off app-wide to change a default.
- **leave it at 10** — short lists paginate for nothing. In the audit, a dozen
  index pages that previously showed one page of rows arrived as two or three,
  which reads as a regression to anyone who used the old app.

There is no way to say "start at 20 unless this user has already chosen
otherwise", which is what a *default* means.

### Ask

A `default-per-page` prop that participates at step 3 rather than step 1:

```
per-page (explicit)   →  wins, unchanged (#124)
localStorage          →  wins over default-per-page
default-per-page      →  used when neither of the above applies
10                    →  final fallback, unchanged
```

`per-page` keeps its current meaning exactly; nothing about an existing app
changes unless it opts in. A dashboard-wide default (a provide/inject or theme
value) would be a natural follow-on, but the prop alone solves it.

### Interim in the consumer

Its house table wrapper reads `localStorage` with DXTable's own key format and
only passes `per-page` when nothing is stored — a deliberate but unpleasant
coupling to a private storage-key convention, which is exactly what the prop
would let it delete.

---

## 2. Expose the matching total

### Problem

`DXTable` knows the paginator's `total`, and never surfaces it. There is no
`total` on the exposed instance and no "loaded" event carrying pagination.

A consumer that needs the number of records **matching the current filters** has
to re-implement the fetch. The concrete case: a bulk-edit action ("apply this
change to all N records matching the current filters") must state N before the
user commits, and must be certain N is the same set the table is showing — the
column filters plus whatever the page injected into `api-url`. Others in the
same family: a summary bar ("847 orders, £12,404"), an export button that warns
above a row count, an empty-state that distinguishes "no records" from "no
matches".

### Ask

Either (or both):

- add `total` (and ideally the whole `pagination` object) to `defineExpose`, so
  `tableRef.total` is readable after a fetch; and/or
- emit `@loaded` with `{ items, pagination }` after each successful fetch.

The second is more useful for reacting; the first is enough for a consumer that
reads it on demand.

### Interim in the consumer

The bulk-edit modal issues its own `perPage=1` request when it opens and reads
`total` off the response. That is one extra request at the only moment the
number matters, so it is a tolerable interim — but it duplicates a fetch DXTable
has already made, and it only stays correct while the consumer keeps its own
copy of every filter the table is applying.
