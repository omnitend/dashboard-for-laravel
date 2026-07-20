# DXTable 0.33 provider-mode request contract broke consumers (REGRESSION)

Status: RESOLVED 2026-07-20 — root cause corrected below (§Root cause,
corrected) and fixed by the new `api-adapter` prop + bare-array grace, shipping
in 0.33.1. Originally: REPORTED 2026-07-20 by greendragon. Severity: HIGH — every provider-mode
DXTable list page renders **empty** ("No accounts found") against a backend that
worked on 0.32. greendragon has **rolled back to 0.32** and is blocked from
adopting 0.33 (theme #157/#154/#95, switch-list, DXCurrencyInput) until resolved.

## Symptom

On dfl 0.33, an `<ot-listing>`/`DXTable` provider page (e.g. `/next/accounts`,
backed by Laravel + spatie QueryBuilder via `LTApiController`) shows **zero rows**
though the API returns HTTP 200. The console gate passes (an empty list logs
nothing) — this is a silent data regression.

## Root cause — the provider REQUEST params changed incompatibly

Same page, same backend, only the dfl version differs:

**0.32 (works — 10 rows):**
```
/api/accounts?include=accounting_category&paginate=true&page=1&perPage=10&sort=name
```

**0.33 (broken — bare array, empty table):**
```
/api/accounts?include=accounting_category&page=1&perPage=10&sortBy=name&sortOrder=asc&filterValues[]=accounting_category.primary_category&filterValues[]=accounting_category.secondary_category
```

Three breaking changes:

1. **`paginate=true` was DROPPED.** This is the fatal one. `LTApiController`
   paginates only when `paginate=true` is present; without it the endpoint
   returns a **bare JSON array of ALL rows** (1442 accounts), not `{data,total}`.
   DXTable provider mode can't parse a bare array → renders "No rows". (Verified:
   the 0.33 response body is a 1442-element array; the 0.32 one is paginated.)

2. **`sort=name` → `sortBy=name&sortOrder=asc`.** The sort param name/shape
   changed. spatie QueryBuilder reads `sort=name` / `sort=-name`; it ignores
   `sortBy`/`sortOrder`, so server-side sort silently breaks too.

3. **`filterValues[]=<column keys>` added** (the new server-supplied-filter-values
   feature — good, and close to what we asked for in B2/B3). But a backend that
   doesn't implement it shouldn't be sent it in a way that changes results, and
   it must degrade gracefully when `response.data.filterValues` is absent.

## Ask

The provider request contract is a PUBLIC integration surface — changing param
names (`paginate` removed, `sort`→`sortBy`/`sortOrder`) is a breaking change that
should be either (a) avoided/kept backward-compatible, (b) made adaptable via a
request-param mapping option on DXTable (so a consumer can map to its backend's
convention), or (c) called out loudly in the CHANGELOG with a migration note. At
minimum: keep sending `paginate=true` (or document the new pagination trigger),
keep `sort` (or make it configurable), and make `filterValues` opt-in / graceful.

## greendragon side

Holding at **0.32** (`^0.32.0`) — all list pages load. Will re-bump once the
provider contract is restored or an adapter option lands. The desirable 0.33
wins we're waiting on: muted DXTable headers (#157), vivid progress fills (#154),
denser natural-case sidebar (#95, lets us delete our shell.css overrides),
switch-list (#160), DXCurrencyInput (#152).

---

## Root cause, corrected (dfl side, 2026-07-20)

The provider request params did **NOT** change between 0.32 and 0.33 — the
`params` construction (`page/perPage/filters/sortBy/sortOrder` +
`filterValues` on initial load) is byte-identical in both tags, and
`paginate=true` / `include=…` / `sort=name` were never dfl params in any
version. What changed is the **transport**: #132 moved DXTable off axios onto
the library's own fetch client.

The 0.32 wire shape was manufactured by the consumer's own
`lib-next/ltapi-dxtable-adapter.js` — an axios request+response interceptor
pair (self-described as an "INTERIM shim") installed on the default axios
instance, translating dfl's params into the backend's spatie convention and
synthesizing paginator metadata on the way back. 0.33 bypasses it because the
requests no longer flow through axios — the migration note in the 0.33.0
CHANGELOG covered interceptors, but only offered `api.setDefaultHeader` /
`setBaseURL`, which cannot express param/response ADAPTATION. That gap is the
legitimate part of this report.

## Resolution (0.33.1)

New opt-in **`api-adapter`** prop on DXTable — the sanctioned home for exactly
what the axios shim did, table-scoped and keeping the built-in provider's
error handling and pager:

```ts
apiAdapter?: {
  request?: (params) => params;                       // return = wire params
  response?: (body, { params }) => { data, pagination?, filterValues? };
}                                                     // params = dfl-shape originals
```

Plus: a bare-array response now degrades to visible rows (no pager) instead of
a silently empty table.

Migration for the consumer: delete `installLtApiDxTableAdapter` and pass its
two translate functions as `:api-adapter` from the listing wrapper — the
request fn is unchanged; the response fn takes `(body, { params })` and no
longer needs to parse the URL for `page`/`perPage` (they're in `params`).
