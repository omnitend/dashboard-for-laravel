# DXTable decomposition — collapse the triplicated render (#123) and break up the god-component behind a façade (#129)

**Date:** 2026-07-18
**Issues:** [#123](https://github.com/omnitend/dashboard-for-laravel/issues/123) (three near-identical `<DTable>` blocks), [#129](https://github.com/omnitend/dashboard-for-laravel/issues/129) (DXTable is table + CRUD + modal + request client)
**Type:** Pure internal refactor. **No public API change** — `DXTable`'s props, emits, slots and exposed methods stay byte-identical. Consumers see nothing.
**Blast radius:** Large. `DXTable.vue` is 2615 lines and central. Land **behind the full suite (441 tests, 120 DXTable-family)**, in its own session, one reviewable step at a time — not alongside new behaviour.

---

## Why now

`DXTable.vue` is 2615 lines and is five things at once: a table, a CRUD controller, a modal manager, a form-schema interpreter, and a request client. Two concrete costs:

- **#123:** the template carries **three near-identical `<DTable>` blocks** (lines 44–165 provider, 168–284 client-side, 287–404 inertia) plus **three near-identical pagination footers** (407–452, 455–500, 503–548). Every fix in the 0.24–0.26 run had to be applied three times (`assert s.count(old) == 3`). A fix landing in two modes out of three is invisible to a reviewer and is exactly the failure class this component keeps producing.
- **#129:** any table change risks a modal regression and vice-versa; every feature is a large-surface edit.

**Key structural finding (verified by a full read + an independent script map):** the editor/CRUD concern and the table/data concern are **largely separable**. The editor never reads `items`, `provider`, `apiUrl`, sort/filter/perPage state, or the client-side pipeline. The coupling is **three thin, explicit seams**:

1. `props.editFields` presence → `rowsAreInteractive` / actionable-row styling.
2. `handleRowClick` → the row→modal bridge (it also emits `rowClicked` regardless).
3. `refresh()` called after each successful create/edit/delete to invalidate whichever data source is active.

That is the seam the façade is built on.

---

## Target architecture

`DXTable.vue` becomes a **thin façade** (target ~500–700 lines: props/emits, mode detection, the single table render, and wiring) composing:

| Piece | Kind | Responsibility |
| --- | --- | --- |
| **one `<DTable>` block** | template + `tableModeBindings` computed | The filter row, custom headers, dotted-cell rendering, slot forwarding — **once** instead of 3× (#123). |
| **`DXTablePagination.vue`** | component | The pager + per-page selector + info text — once instead of 3× (#123). Owns its own `:deep(.pagination)` styles. |
| **`useResourceEditor.ts`** | composable | All create/edit/delete state, form seeding, submission, toasts, slot-key computeds (#129). |
| **`DXTableEditorModal.vue`** | component | The `<DModal>` + `<DXForm>` + edit-slot forwarding (#129). Presentational; driven by the composable's state. |

Everything else (sorting, filtering, per-page/localStorage, the client-side pipeline, the provider/request client) stays in `DXTable` for now — it is the "table" concern and is not triplicated. A later pass could extract a `useDataTable` composable, but that is **out of scope**; this plan is about killing the triplication and lifting out the editor.

---

## Execution — sequential, each step lands behind the full suite

Each step is an independent commit that keeps `npm test` green. **Between every step:** run the full suite AND live-verify in the docs (all three data modes render; edit/create/delete work) — hot reload lies, so rebuild (`npm run build`) before the docs check. Per the repo rule, when a step adds/changes a test, **watch it fail against the pre-step code first**.

### Step 0 — Baseline
- `npm test` → confirm 441 green (120 DXTable-family). Record the number.
- Confirm `tests/components/scoped-deep-styles.test.ts` passes (it reads scope-ids from `dist/`, so `npm run build` first).

### Step 1 — Collapse the three `<DTable>` blocks into one (#123, part A)
The three blocks are **identical** except for a handful of bound props. Introduce:

```ts
// Per-mode props for the single inner <DTable>. Reproduces each original
// block's bindings EXACTLY — this is a faithful collapse, not a behaviour fix.
const tableModeBindings = computed(() => {
  if (isProviderMode.value) {
    return { provider: effectiveProvider.value, currentPage: apiCurrentPage.value, busy: props.busy };
  }
  if (isClientSideMode.value) {
    return { items: clientSidePaginatedItems.value, noLocalSorting: true };
  }
  // inertia
  return { items: props.items, noLocalSorting: true, busy: effectiveBusy.value };
});
```

Template becomes (preserving the busy-spinner-replaces-table behaviour for non-provider modes):

```html
<div v-if="effectiveBusy && !isProviderMode" class="text-center py-5"> …spinner… </div>
<DTable
  v-else-if="isProviderMode || isClientSideMode || isInertiaMode"
  ref="tableRef"
  :key="tableSlotSignature($slots)"
  :fields="fields"
  :sort-by="effectiveSortBy"
  :multisort="false"
  :no-sortable-icon="true"
  :striped="striped" :hover="hover" :responsive="responsive"
  :tbody-tr-class="composeRowClass"
  v-bind="{ ...tableModeBindings, ...tablePassthroughProps }"
  @update:sort-by="handleSortChange"
  @update:expanded-items="emit('update:expandedItems', $event)"
  @update:current-page="apiCurrentPage = $event"
  @update:busy="handleBusyChange"
  @row-clicked="handleRowClick"
>
  …filter row, headers, dotted-cell, slot forwarding (ONCE)…
</DTable>
```

Notes that make this safe (from reading `DTable.vue` → everything but `fields` flows through `$attrs` to `BTable`):
- `provider: undefined` in non-provider modes → BTable falls back to `items` (undefined is falsy). `currentPage`/`busy` undefined → BTable defaults. `noLocalSorting` undefined → `false`, matching the provider block which never set it.
- `@update:current-page` / `@update:busy` bound unconditionally is harmless — BTable only emits them in provider mode.
- `ref="tableRef"` unconditional is fine — only read in provider mode.
- The `v-else-if="isProviderMode || …"` guard preserves "render nothing when no data source" (today none of the three `v-else-if`s match).
- ~250 template lines removed. **Zero** script changes beyond adding `tableModeBindings`.

**Verify:** full suite green; docs live-check provider (apiUrl example), client-side, and inertia examples all render, filter, sort, paginate. Add a mode-parametrised smoke test if a gap is found (the failure class #123 warns about).

### Step 2 — Collapse the three pagination footers into `DXTablePagination.vue` (#123, part B)
The three footers differ only in the source `PaginationData` and the page-change handler. Extract a presentational component:

```
Props:  pagination: PaginationData | null, perPage, perPageOptions,
        showPagination, showPerPageSelector, singularItemName, pluralItemName,
        hasActiveFilters
Emits:  page-change[page], per-page-change[value]
Styles: owns the :deep(.pagination …) rules, on a plain-element root
        (.dx-table-pagination :deep(.pagination)) so the scope-id has a
        deterministic host — the documented safe pattern.
```

In `DXTable`, one instance driven by mode-derived state:

```ts
const activePagination = computed<PaginationData | null>(() =>
  isClientSideMode.value ? clientSidePagination.value
  : isInertiaMode.value ? (props.pagination ?? null)
  : providerPagination.value);

const handleActivePageChange = (page: number) => {
  if (isClientSideMode.value) return handleClientSidePageChange(page);
  if (isProviderMode.value) return handleApiPageChange(page);
  return handlePageChange(page); // inertia
};
```

**Scoped-styles caveat (CLAUDE.md):** moving `:deep(.pagination)` into a child component means DXTable's scope-id no longer reaches it. Own the rules **inside** `DXTablePagination.vue` on a plain-element host. Update `tests/components/scoped-deep-styles.test.ts`: remove the three `.pagination*` entries from `DXTable.vue`'s `KNOWN_DEEP_TARGETS` (leaving `tbody tr.dx-row-actionable`), add them under `DXTablePagination.vue` with a DOM-level assertion. Rebuild before running (the test reads `dist/`). The `tbody tr.dx-row-actionable` deep rule **stays in DXTable** (the rows live in the inner `<DTable>` which stays).

**Verify:** full suite; DOM-level check that the pager styling still lands (per the "presence ≠ reachability" rule — assert the scope-id reaches `.pagination`, don't just `querySelector` it). Live-check pager + per-page across all three modes; confirm the localStorage per-page key still works (`dxtable-perpage-<url>`).

### Step 3 — Extract `useResourceEditor.ts` composable (#129, part A)
Move the entire editor/CRUD concern (script §8: state, seeding/visibility helpers, slot-key computeds, and the `handleRowClick`-editor-branch + `fetchFullRecordForEdit` + `handleCreateNew` + `handleEditSave`/`performSave` + `handleEditCancel` + `handleDelete`) into `resources/js/composables/useResourceEditor.ts`, generic over `<T>`.

Parameterise it by the three seams + the things it reads today, passed as an options object of refs/getters:

```ts
useResourceEditor<T>({
  editFields, editTabs, editUrl, showUrl, deleteUrl, createUrl,   // getters (props)
  deleteGuard, singularItemName, pluralItemName,                   // getters
  refresh,                                                         // () => void  (seam 3)
  emit,                                                            // to re-emit rowCreated/updated/deleted/*Error
})
// returns: showEditModal, selectedItem, editForm, activeTabIndex, isCreateMode,
//   pendingAction, editLoading, editFormInstanceKey, computedModalTitle,
//   submittableEditFields, nonSubmittedFieldKeys, editValueSlotKeys, … ,
//   openEdit(item,index,event), openCreate(), save(), cancel(), remove()
```

- `DXTable` keeps `handleRowClick` (emits `rowClicked` — seam 2 — then calls `editor.openEdit`), keeps `rowsAreInteractive` (reads `editFields` — seam 1), and passes `refresh` in (seam 3). `defineExpose({ refresh, openCreate: editor.openCreate })` unchanged.
- The toast `try/catch` (BApp may be absent in tests) moves into the composable.
- `useSlots()` for the `edit-*`/`tab-*` slot-key computeds moves in (the composable runs in setup, so `useSlots()`/`getCurrentInstance()` still resolve the DXTable instance).
- This removes ~600 script lines from `DXTable`. The modal template stays inline for now, bound to `editor.*`.

**Verify:** full suite (esp. `DXTable-EditTabs`, `DXTable.dotted-keys`, and the edit/create/delete groups in `DXTable.test.ts`); live create/edit/delete + the password-leak `editFormInstanceKey` remount + the `showUrl` full-record fetch race.

### Step 4 — Extract `DXTableEditorModal.vue` component (#129, part B)
Move the modal template (lines 554–702: `<DModal>` + loading state + `<DXForm>` + footer, and all `edit-value`/`edit-span`/`tab-content`/`tab-before`/`tab-after` slot forwarding) into `DXTableEditorModal.vue`. Presentational — receives the editor state as props / v-model and emits `save`/`cancel`/`delete`:

```
v-model:show, v-model:active-tab, form, fields, tabs, selectedItem,
isCreateMode, editLoading, pendingAction, deleteUrl, modalTitle, editModalSize
→ emits save, cancel, delete
```

**Slot forwarding is the fiddly part:** the `edit-*`/`tab-*` slots now hop DXTable → DXTableEditorModal → DXForm (two hops). Use the documented dynamic slot-forwarding pattern (`#[name]="slotProps"` + `v-bind`), and **verify at the DOM level** that a custom `edit-value(x)` slot actually renders inside the modal's DXForm (presence ≠ reachability). If this hop proves too fragile, **stop after Step 3** — the composable alone already delivers most of #129's value; the modal component is the smaller win and can be a follow-up. Capture that decision in the issue.

**Verify:** full suite; live-check every forwarded edit slot renders; DOM-level assertion for at least one `edit-value`, one `edit-span`, one `tab-content`.

### Step 5 — Docs, ledger, changelog, final verification
- No public API change, so component MDX docs need no edits. Sanity-check `DXTable.mdx` live examples still build (`npm run docs:build`).
- `DIVERGENCES.md`: no new divergence (façade preserves the API) — confirm nothing needs recording.
- `CLAUDE.md`: add `DXTablePagination`, `useResourceEditor`, `DXTableEditorModal` to the component/structure notes; note DXTable is now a façade and where each concern lives.
- Component count in CLAUDE.md (currently "72 components / 15 extended") ticks up by the new components — update the count.
- **Full suite green + full manual pass** across all three modes and create/edit/delete/showUrl/deleteGuard before the version bump.
- Version: **MINOR** is not required (no consumer-visible change), but per the patch-bump-judgment note a large internal refactor with real risk is worth a MINOR so the changelog flags it for anyone bisecting. Decide at ship time; record "internal refactor, no API change" in the changelog either way.

---

## Risks & mitigations

- **Silent per-mode divergence (the #123 failure class itself):** collapsing to one render *removes* the class, but Step 1's collapse must be exact. Mitigate by reproducing each block's bindings verbatim in `tableModeBindings` (reproduce, don't "fix") and live-checking all three modes.
- **Scoped `:deep()` going inert across the new component boundaries (CLAUDE.md's repeated trap):** only pagination styles move; own them inside `DXTablePagination` on a plain-element host, and extend the `scoped-deep-styles` guard with a DOM-level assertion read from `dist/`.
- **Editor slot forwarding across two hops (Step 4):** verify DOM-level; fall back to stopping after Step 3 if fragile.
- **`getCurrentInstance()`/`useSlots()` moving into the composable:** both still resolve the DXTable instance because the composable is called from `setup()`. Only the *editor's* slot-keys use `useSlots()`; the vnode-prop probing (`isControlled`, `paginationWasProvided`) is table-side and **stays in DXTable**.
- **Test trust:** for any new/changed test, watch it go red against the pre-step code first (repo rule; two 0.24 tests passed for the wrong reason).

## Out of scope (candidate follow-ups)
- Extracting a `useDataTable` composable (sorting/filtering/per-page/client-side pipeline/provider). Not triplicated, so lower leverage; note as a possible future issue.
- Any behaviour change, new prop, or bvn-API convergence.
