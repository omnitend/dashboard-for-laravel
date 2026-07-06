# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Audited the `:deep()` scoped-style trap (#53) across every current
  usage** (#58). Confirmed at the DOM level, against the built `dist`
  bundle — not a docs dev-build screenshot, which previously gave a false
  positive — that DAutocomplete, DXField's switch, DXTable's
  `tbody tr`/`.pagination`, DXStatCard, and DXDashboardSidebar's `.nav-link`
  all forward their scope-id correctly today; no other live bugs found.
  Added `tests/components/scoped-deep-styles.test.ts` as a permanent guard:
  it fails if a new scoped `:deep()` rule appears anywhere without a
  corresponding DOM-level assertion, and the DOM-level checks themselves read
  the scope-id straight out of `dist/style.css` so they don't need updating
  when unrelated style edits change the hash.

## [0.16.3] - 2026-07-06

### Fixed
- **`switch` field: compact box (matches sibling input width/height), single
  click target** (#64). The filled box always stretched to the full form
  width — unlike the plain `checkbox` type — visually dominating a form next
  to content-sized siblings, and its `justify-content: space-between` layout
  left a wide unclickable gap between the label and the toggle so only the
  small toggle itself reliably registered a click. It's also fixed a height
  mismatch: the box's `min-height` was hardcoded to Bootstrap's *default*
  input padding formula rather than this theme's actual `$input-padding-y`,
  so it rendered shorter than a real `.form-control`/`.form-select`. The box
  now sizes to its content (like `checkbox`), matches standard input height
  exactly via a new `--dx-input-height` theme variable (computed once from
  the real theme values, so it can't drift), and the dead click-zone is gone
  now that the box no longer force-stretches.
- **`currency` field now displays minor-unit precision** (#69). A value of
  `3.8` displayed as `3.8` rather than `3.80`. The input now formats its
  *displayed* text to the currency's decimal places (default 2; a new
  `field.decimals` option overrides it, e.g. `0` for a currency with no minor
  unit) on blur and on initial seed — the model stays a plain number
  throughout, and typing is never reformatted mid-edit.

## [0.16.2] - 2026-07-06

### Fixed
- **`form.touched` is now set for fields driven through `DXField`/`DXForm`**
  (#61). `useForm`'s `touched` map was only ever populated by the `field()`
  computed's setter, but `DXField` writes to `form.data` directly (including
  the nested/`keyPath` branch used by repeaters), so `form.touched` stayed
  `{}` forever for any form built from field definitions. Consumers building
  dirty-aware payloads (e.g. omitting untouched fields on a partial update)
  got a guard that never fired. `DXField` now marks the field's key (or full
  `keyPath` for nested/repeater fields) touched on every write.
- **`DXRepeater` supports upsert-children (`to_delete`-style) APIs** (#62).
  Removing a row always spliced it out of the array, so a backend that only
  deletes a persisted child row when it's submitted flagged (e.g. Laravel's
  `{ id, to_delete: true }` upsert pattern) never learned the row was
  removed — the row silently survived. A new `field.softDeleteKey` option
  flags a row with an `id` instead of splicing it; the row stays in
  `form.data` (so it's submitted) but is hidden from the UI and excluded
  from `minItems`/`maxItems` counts. Rows without an `id` (never persisted)
  are still spliced as before.

## [0.16.1] - 2026-07-05

### Fixed
- **`DAutocomplete` dropdown no longer clips long options** (#59). The popup
  (`.b-autocomplete-content`) only set a `max-height`, so it inherited the
  (often narrow) input width and cut off long option labels — e.g. a `DXTable`
  `select` filter in a narrow column. It now grows to `max-content` (at least
  the trigger width, capped at `min(90vw, 32rem)`). Shipped as a global theme
  rule rather than a scoped style because the popup can teleport out of the
  component, which would escape `:deep()`.

## [0.16.0] - 2026-07-05

### Added
- **`autocomplete` field type** for `DXField` / `DXForm` (#2). A free-text input
  with a `<datalist>` of suggestions rendered internally — takes `options` (same
  shape as `select`) or an async `optionsLoader`, and unlike `select` still
  accepts a value not present in the list (the consumer validates). For
  type-to-filter pickers over a fetched list (e.g. a git branch) without a
  hand-rolled datalist in the consuming page.

### Fixed
- **`DAutocomplete` chevron styling now actually applies in consumer builds**
  (#53). The 0.15.0 fix (#54) shipped its rules but they were inert: they were
  written as `scoped` `:deep()` styles on a component whose only template root
  was the `<BAutocomplete>` component, so the scope-id never landed on a real
  host element and `[data-v-x] .input-group` matched nothing once bundled by a
  consumer. `DAutocomplete` now wraps `BAutocomplete` in a real
  `.d-autocomplete` element, giving the scope-id a deterministic host — so the
  chevron sits inline (not wrapped below the input) and is softened via
  Bootstrap's `--bs-btn-*` variables. Every `DXTable` `select` filter is fixed.

## [0.15.0] - 2026-07-05

### Changed
- **`switch` fields now render as a full-width, colour-coded "filled box"**
  (#52) — the same height as a select/text input, with the label on the left and
  the toggle on the right. The box is neutral when off and a filled success green
  when on, so a boolean's state reads at a glance and switches line up with
  sibling fields in a form. Replaces the previous inline toggle styling; no API
  change (`type: 'switch'`, `textWhenTrue`/`textWhenFalse` unchanged).

### Fixed
- **`DAutocomplete` closed-state rendering** (#53, regression from #49). The
  trigger chevron wrapped onto its own line below the input (Bootstrap
  `.input-group` defaults to `flex-wrap: wrap` and the input wrapper takes full
  width) and rendered as a heavy dark `btn-secondary`. It now sits inline as a
  subtle, theme-coloured append. Fixes every `DXTable` `select` filter (and any
  other `DAutocomplete` usage) showing a detached dark chevron below the input.

## [0.14.0] - 2026-07-05

### Changed
- **`DXTable` `select` column filters now render as a `DAutocomplete`
  typeahead** (#49) instead of a native `<select>`. Click to browse the whole
  list (with a check on the current selection), or type to narrow — a strict
  superset of the old select. A clear (✕) button resets to "no filter" (the
  synthetic "All" option is gone; the placeholder reads `All {label}`). The
  public field API is unchanged (`filter: 'select'`, `filterOptions`), so this
  is non-breaking. Multi-value filtering is a planned follow-up.

### Added
- **`DXTable` `card` prop** (#47). Defaults to `true` (unchanged). Set
  `:card="false"` for a plain, borderless variant — the same header, filter row,
  table and pagination rendered directly on the page background (no card
  border/shadow), with a subtle rule under the header. For data-heavy admin
  index pages that read as busy inside a card. Everything else (data modes,
  filters, sorting, pagination, edit/create/delete) is unchanged.

### Fixed
- **`DXTable` no longer breaks a page that also statically imports `useForm`**
  (#42). `DXTable` used to lazy-load `useForm` via a dynamic `import()` to dodge
  a circular dependency that no longer exists (`useForm` → `api`, a leaf). That
  dynamic import made Rollup place `useForm` behind a dynamic-import chunk, so a
  consumer page doing `import { useForm } from '@omnitend/dashboard-for-laravel'`
  alongside a `DXTable` got a dangling, undefined `useForm` at runtime. `DXTable`
  now imports `useForm` statically; the edit/create modal seeds its form
  synchronously (also removing the interim modal-open token workaround). The
  previously-skipped `DXTable` edit-tabs tests are re-enabled.

## [0.13.1] - 2026-07-04

### Changed
- **`DXTable` no longer stripes rows by default.** Banded rows add little on
  short tables and can read as noise; `striped` now defaults to `false`. Opt
  back in with `:striped="true"` for dense tables.

## [0.13.0] - 2026-07-04

### Added
- **Chart components: `DXBarChart`, `DXLineChart`, `DXDoughnutChart`.** Thin,
  themed wrappers around Chart.js via `vue-chartjs` (both **optional** peer deps,
  externalized from the build). Pass `labels` + `datasets`; the Bootstrap palette
  is read from the live theme and dashboard defaults applied (no x gridlines,
  formatted value ticks/tooltips, legend auto-shown for multi-series). `options`
  deep-merges over the defaults.

### Fixed
- **`DXTable` `showUrl` edit flow** — Save/Delete are disabled (and the delete
  guard bails) while the full-record fetch is in flight, so the guard never runs
  against the thin list row; and the modal-open async `useForm` import is guarded
  so a slow first-open can't seed the form after a different row/create is opened.
- **`useForm` multipart** — also spoofs `_method` when a `transform` returns a
  `FormData` directly (a raw multipart PUT/PATCH isn't parsed by PHP).

## [0.12.0] - 2026-07-04

### Added
- **`DXStatCard`** — a KPI / stat tile: a big formatted value (`number` /
  `currency` / `percent`), title + subtitle, an auto-coloured up/down delta badge
  versus a comparison (`invertDelta` for down-is-good metrics), and `value` /
  `icon` / `trend` slots. Themed with Bootstrap variables.
- **`DXTable` `showUrl`** — opt-in fetch of the full record for the edit modal.
  When set, opening a row seeds the form from a `/…/:id` fetch (with a loading
  state) instead of the thin list row — for lists whose payload is slimmer than
  the edit form (notes, nested relations, repeater rows).
- **Automatic multipart file upload.** `useForm` now submits
  `multipart/form-data` when any field holds a `File`/`Blob` (nested
  objects/arrays flattened Laravel-style; booleans as `"1"`/`"0"`), spoofing
  `put`/`patch` as `POST` + `_method`. So `image`/`file` fields round-trip
  through `DXTable` create/edit with no extra config.

## [0.11.1] - 2026-07-04

### Fixed
- **`useForm` crashed on object/array field defaults from a reactive source.**
  Seeding data was deep-cloned with `structuredClone`, which throws
  `DataCloneError` on a Vue reactive Proxy — so a `repeater` (or any) field with
  `default: []` / `default: {}` inside a reactive `editFields` ref blanked the
  create/edit modal. The clone now runs `toRaw` first and falls back to a JSON
  clone, so object/array defaults work without the `Object.freeze` workaround.
- **`DXTable` per-page selector ignored `showPerPageSelector` in client-side
  mode.** A fixed top-N table (`clientSide` + pagination off) still rendered the
  "Per page" control. The client-side gate now honours the prop like the other
  modes.

## [0.11.0] - 2026-07-04

### Added
- **`DXDashboard` `fluid` / `contentClass` props.** `fluid` renders page content
  full-width and left-aligned instead of the default centred reading-width
  (`col-xl-10`) column — for data-heavy admin pages with wide tables.
  `contentClass` adds class(es) to the content container.
- **`DXTable` `openCreate()` method** (via `defineExpose`, alongside `refresh()`)
  so the create action can live outside the table card — a page header, the
  dashboard navbar actions slot, etc. — while still using the built-in create
  modal. No-op unless `editFields` are set.
- **`DXTable` `deleteGuard` prop.** A predicate run when Delete is clicked,
  before the confirm and request. Return a message for a non-deletable item to
  show it immediately (toast) and skip both the confirm and the doomed request;
  return `null`/`undefined` to proceed normally. The button stays visible
  (show-and-explain) rather than being hidden/disabled.

## [0.10.0] - 2026-07-04

### Added
- **Sidebar `footer` slot** on `DXDashboardSidebar` (forwarded from `DXDashboard`
  as `sidebar-footer`) for utility links pinned to the bottom of the rail, below
  the nav groups. The rail is now a flex column — fixed header, scrolling nav,
  pinned footer — and the slot receives the `collapsed` state. Adds an optional
  `key` to `NavigationGroup` for stable group open-state identity.

### Changed
- **Responsive navbar.** The centred `search` slot now drops to its own
  full-width row below the `md` breakpoint (the toggle / title / user-menu
  cluster stays on the first row), so the shell is usable on mobile out of the
  box. Public slots/props are unchanged.
- **Collapsible sidebar groups** now key their open/closed state by a stable id
  (`key`/`label`, not array index), so reordering the nav can't leak open-state
  to the wrong group; static group labels match the toggle header height when
  collapsible groups are on; closed group items stay out of the tab order even
  without `inert` support; and scroll re-centres after a group's expand settles.

### Fixed
- Sidebar nav could overflow the rail (flexbox `min-height: auto` trap); the
  scroll region now sets `min-height: 0`.

### Changed
- **Rich component API metadata for the docs MCP.** The auto-generated API
  manifest (consumed by the docs MCP server) previously carried only prop / slot
  / event *names* with blank descriptions. The extended (DX*) components are now
  annotated with `@slot` / `@binding` / `@component` docs and event JSDoc, so
  every extended component ships a description and fully documented slots and
  events. A generator fallback also surfaces each base `D*` wrapper's existing
  `@component` description. No runtime/API behaviour changes.

### Added
- **`actions` slot on `DXDashboardNavbar`** (forwarded from `DXDashboard` as
  `navbar-actions`) for page-level primary actions — e.g. a Create / New … button
  — rendered right-aligned next to the user menu, keeping them in the shell chrome
  rather than the page body. The slot receives `pageTitle` for context and only
  renders its wrapper when provided.

## [0.9.1] - 2026-07-04

### Added
- **Function-valued tab labels.** `FormTab.label` (used by `DXForm` tabs and
  `DXTable`'s `editTabs`) may now be a function of the model — the live form data
  merged with any `context` (e.g. the row `DXTable` is editing) — so a tab title
  can reflect the record, such as a related-records count
  `label: (model) => \`Products (${model.products_count ?? 0})\``. Static string
  labels are unchanged; the label resolves reactively.

## [0.9.0] - 2026-07-04

### Added
- **`switch` field type.** A labelled toggle with contextual on/off text
  (`textWhenTrue` / `textWhenFalse`) and an on-state (filled green) style,
  rendering Bootstrap Vue Next's switch. The bound value is normalised to a
  boolean, so the toggle position, the on-state style, and the contextual text
  always agree even when the model arrives as a non-boolean — a boolean column
  serialised as `1`, or a `"0"` / `"false"` string, all read correctly. Seeded
  as boolean `false` by `defineForm` and repeater rows.
- **Declarative `info` popover on field labels.** A `MaybeFn<string>` `info` on a
  field renders a small info affordance on the label that reveals help text in a
  popover on hover/focus, complementing `hint` (always-visible muted text below
  the field). Backed by the new `DXFieldLabel` component; the `#info` slot
  remains the escape hatch for rich content.
- **`asFraction` option for `percentage` fields.** When set, the field treats the
  underlying model value as a 0–1 fraction while showing/editing it as a 0–100
  percentage: the model keeps the fraction (e.g. `0.2`), the input shows `20`.
  Scaling rounds away binary-float artefacts (`0.2 * 100 = 20.000000000000004`).
  Off by default (the value is taken as a whole percentage). Use for values stored
  as ratios — VAT rates, discounts, etc.

### Fixed
- **DXTable delete button stuck "Deleting…" after Save.** The Save and Delete
  buttons in the edit modal both keyed off the shared `editForm.processing`
  flag, so saving drove the Delete button's loading label. Each button's label
  is now scoped to the action actually in flight.
- **`#hint` slot ignored on switch/checkbox/repeater fields** when no `hint`
  value was set. These now render a `#hint` slot like the standard field.

## [0.8.0] - 2026-07-04

### Added
- **Collapsible sidebar menu groups** on `DXDashboardSidebar` (and forwarded
  through `DXDashboard`). New props `collapsibleGroups` (default `false`) and
  `autoCollapseInactiveGroups` (default `true`) turn group headers into a
  single-open accordion — built for menus with many sections.
  - The active-route group opens on load and follows client-side navigation.
    Active matching is now ancestor-aware (longest path prefix) and ignores
    query string / hash, so a detail route like `/orders/123` still highlights
    and opens its `/orders` group. Root `/` matches only exactly.
  - Per-group `collapsible: false` keeps a group permanently expanded.
  - Collapse uses a CSS grid height transition with an opacity fade; the active
    group paints open on first render (no load flicker). Honours
    `prefers-reduced-motion`.
  - Collapsed groups are `inert`, removing their links (including custom `#link`
    slot content) from focus order and the accessibility tree. The `#link` slot
    gains an `isExpanded` prop.

### Changed
- **Quieter toast notifications.** Replaced Bootstrap Vue Next's saturated
  colour-block toasts with a calm, subtly-tinted surface (dark title, muted
  body), spacing between stacked toasts, and no auto-dismiss countdown bar.
  Theme-only (`theme.scss`); `useToast().create({ title, body, variant })` is
  unchanged.

## [0.7.1] - 2026-06-30

### Security
- **`@modelcontextprotocol/sdk`** bumped `^1.22.0` → `^1.29.0` (ships via the
  docs MCP server bin) — patches a ReDoS advisory.
- **`axios`** optional-peer floor raised `^1.6.0` → `^1.15.3` so consumers
  pull a range with the `mergeConfig` prototype-pollution / proxy fixes.
- Dev toolchain: `vitest` / `@vitest/browser` / `@vitest/browser-playwright`
  bumped `^4.0.3` → `^4.1.8` (clears 3 critical advisories) and `npm audit fix`
  applied for remaining in-range transitive patches.
- Remaining audit entries are the `astro` 5→7 major chain (astro + bundled
  esbuild + `@astrojs/mdx` / `@astrojs/vue`). These are dev-server-only
  advisories; the docs publish as a static GitHub Pages build with no SSR, so
  they don't reach a deployed surface. The two-major astro migration is left
  for separate, deliberate work.

### Fixed
- `package.json` `repository.url` normalised to `git+https://…` so `npm
  publish` no longer auto-corrects it on every release.
- Test suite imports `userEvent` from `vitest/browser` instead of the
  deprecated `@vitest/browser/context` (removed in the next vitest major).
  Test-only change; no runtime impact.

## [0.7.0] - 2026-06-30

### Added
- **`DFormOtp`** — wrapper around bvn's `BFormOtp`. A one-time-code / PIN
  input rendered as a row of single-character boxes (`v-model` is a
  `string[]`, one entry per box).
- **`DAutocomplete`** — wrapper around bvn's `BAutocomplete`. A text input
  with a filtered dropdown of suggestions (typeahead / combobox); supports
  `multiple` and a custom `filterFunction`.
- **`DAspect`** — wrapper around bvn's `BAspect`. Keeps its default-slot
  content at a fixed aspect ratio (e.g. `aspect="16:9"`).

  All three surface components that became available in the bootstrap-vue-next
  0.45 upgrade. Each ships with a docs page, live example, and render test.

## [0.6.0] - 2026-06-30

### Changed
- **Upgraded bootstrap-vue-next from 0.40.8 to 0.45.6** (still bundled).
  This crosses several pre-1.0 breaking releases; the affected wrappers
  were updated so this library's own API is unchanged:
  - Field `formatter` functions keep the historic `(value, key, item)`
    signature — `DTable` shields the single-object signature bvn 0.43
    introduced.
  - `DTable`'s `row-clicked` still emits `(item, index, event)`.
  - `DToaster` now renders bvn's unified `BOrchestrator` (bvn 0.44
    removed `BToastOrchestrator`).
  - `DButton` no longer defaults `size` to the removed `'md'` value.
- **Minimum Vue peer dependency raised to `^3.5.13`** (required by bvn 0.45).
- **Dropped Laravel 11 support** — `composer.json` now requires
  `laravel/framework ^12.0|^13.0` (dev: `orchestra/testbench ^10|^11`). The
  only resolvable Laravel 11 releases are blocked by Composer's
  security-advisory policy, so it can no longer be installed/tested.

### Fixed
- `DCarousel` / `DCarouselSlide` are now thin re-exports of the underlying
  bootstrap-vue-next components. bvn 0.45 collects carousel slides by
  scanning slot vnodes for the slide component type, which a wrapper
  component in between broke.

### Notes
- `DTable`'s `sort-by` is an array (`BTableSortBy[]`); the bare string form
  is no longer accepted by bvn. (`DXTable` already used the array form.)
- Standalone radios must live inside a `DFormRadioGroup` — radios bind to a
  group context in bvn 0.45.

## [0.5.0] - 2026-06-22

### Added
- `DXForm` is now the canonical form renderer. Drive it with field
  definitions and add an optional `tabs` prop for multi-tab editors;
  flat and tabbed forms share one engine. Supports conditional fields
  and tabs (`when(model)`), per-field slot overrides
  (`#value(<key>)` / `#span(<key>)` / `#info(<key>)` / `#hint(<key>)`),
  async select options (`optionsLoader`), nested repeaters, and
  automatic switching to the first tab containing a validation error.
  Accepts either a `useForm` or a `defineForm` instance.
- `DXField` — single-field renderer for every field type, with dot-path
  binding so it also drives nested repeater values.
- `DXRepeater` — repeatable nested sub-form (field array) primitive.
- `DFormRadioGroup` — base wrapper for Bootstrap Vue Next's
  `BFormRadioGroup`.
- New `FieldDefinition` field types: `datetime`, `currency`,
  `percentage`, `image`, `file`, `component`, and `repeater`. New
  options: `when`, `readonly`, function-valued `label`/`hint`, `span`,
  `optionsLoader` / `reloadOptionsOnChange`, and repeater sub-fields.
  Adds the `FormTab` type.

### Changed
- `DXTable`'s edit/create modal now renders `DXForm` internally (single
  source of truth). Its public props, slots, and events are unchanged.
- Fixed a latent `DXTable` bug: tab switching now binds the active tab
  index correctly (`v-model:index`), so the edit modal reliably switches
  to the tab containing a validation error.

### Deprecated
- `DXBasicForm` is deprecated in favour of `DXForm`. It is now a thin
  alias (a flat form is `DXForm` without a `tabs` prop) and remains a
  drop-in for existing usage. It will be removed in a future major.

### Fixed
- `DXForm`/`DXField` bind top-level field values by literal key, so a
  field key containing a dot (e.g. `user.email`) is not mistaken for a
  nested path.
- `setByPath` blocks prototype-polluting path segments (`__proto__`,
  `prototype`, `constructor`).

### Breaking (low-impact)
- The per-field custom-rendering slot changed from `#field(<key>)` to
  `#value(<key>)` (replaces the input control). `#span(<key>)`,
  `#info(<key>)`, and `#hint(<key>)` are also available. Forms that only
  pass `fields`/`form` (no per-field slots) are unaffected.

## [0.4.14] - 2026-04-29

### Added
- `DXBasicForm` now honours an optional `show?: () => boolean` predicate
  on each `FieldDefinition`. Fields whose predicate returns `false` are
  hidden from the rendered form. Useful for conditional fields that
  depend on other form values (e.g. a "Custom Domain" input only
  visible when the install type is Web Shop).
- `DXTable` gains a "create" mode. Pass a `createUrl` prop to render a
  "New {itemName}" button in the card header that opens the existing
  edit modal pre-filled from each field's `default`, then POSTs to
  `createUrl` on save. Emits new `rowCreated` and `createError` events;
  the delete button is hidden while creating.

## [0.4.7] - 2025-11-21

### Documentation
- Complete DXTable props table (31 props documented)
- All 13 events documented with parameters
- TableField interface documentation with hint property
- Field hints feature fully documented with examples
- Edit modals documentation with usage examples
- Delete functionality documentation with backend validation examples
- Complete API reference coverage

## [0.4.6] - 2025-11-21

### Added
- Improved pagination layout: pagination left, per-page selector right, info text below
- Smaller, more compact pagination buttons (size=sm)
- Filtered count display with total_unfiltered support
- Smart per-page selector (hides when not needed)
- Backend support for unfiltered totals in HasTableFilters trait

### Changed
- Better button sizing that matches select boxes
- Subtle disabled button styling (transparent with 0.3 opacity)
- Concise wording: "10 products" instead of "Showing all 10 products"
- Format: "X to Y out of Z products" instead of "Showing X to Y of Z"
- Per-page selector width increased to 85px (prevents text cropping)

### Fixed
- API mode per-page flickering bug
- Per-page selector shows actual server value (not localStorage)
- Proper singular/plural grammar (1 product vs 2 products)
- Filtered text on separate line for better readability

## [0.4.5] - 2025-11-20

### Added
- Server error messages now displayed in delete error toasts
- Extract and display error messages from 422 validation responses

### Changed
- Better user feedback with specific, actionable error messages
- Generic error message now shown only as fallback

### Playground
- Add validation to prevent deleting categories with products
- Example error: "Cannot delete X. This category has N associated products..."

## [0.4.4] - 2025-11-20

### Added
- Delete functionality for DXTable modals
- Delete button in modal footer (danger variant)
- Confirmation dialog before deletion
- Success/error toast notifications
- Auto-refresh table after deletion
- New deleteUrl prop (e.g., "/api/products/:id")
- New events: rowDeleted, deleteError

### Changed
- Remove duplicate Save Changes button from modal
- Add gap-2 spacing between Cancel and Save Changes buttons
- Better modal footer layout with flexbox (left/right alignment)

### Playground
- Add delete endpoints and controllers for Products and Categories
- Demonstrate delete functionality in both tables

## [0.4.3] - 2025-11-20

### Added
- Global mode toggle with localStorage persistence
- Toggle switch in navbar (API | Inertia)
- Icons in navigation demonstrating icon support
- Simple dashboard grid favicon

### Changed
- Simplified table implementations using conditional props
- Cleaner titles without instructional text

### Fixed
- Fix Vue template v-else error
- Categories page now supports both API and Inertia modes
- Mode persists across all pages and browser sessions

### Documentation
- Add icon usage examples to DXDashboard docs
- Show unplugin-icons setup instructions

## [0.4.2] - 2025-11-20

### Added
- Field hints: Add optional hint text below column headers
- Stacked triangle sort indicators for cleaner appearance
- Custom header rendering prevents text wrapping
- Formatter support demonstrated in playground

### Changed
- Sort indicators positioned to right, never wrap
- Subtle opacity changes for active/inactive sort directions
- Headers use flexbox layout for proper alignment

### Fixed
- Fix Inertia navigation when sort reset to unsorted state
- Third click on sorted column now properly refreshes data
- Triangle sort indicators have proper spacing
- Headers render consistently across all field types

### Playground
- Products page: Field hints and formatter demonstration
- Categories page: Field hints with edit-tabs

## [0.4.1] - 2025-11-20

### Fixed
- Fix tab index not resetting when reopening edit modal
- First tab now always selected when clicking a new row
- Prevents showing wrong tab (e.g., Products) by default

## [0.4.0] - 2025-11-15

### Added
- Initial stable release
- Complete component library with 55 base + 6 extended components
- Form system with useForm composable
- Data table with pagination and sorting
- Dashboard layout components
- Full TypeScript support

## [0.3.x] - Earlier Versions

Beta releases during initial development.

---

For the complete list of changes, see the [GitHub Releases](https://github.com/omnitend/dashboard-for-laravel/releases) page.
