# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **`asFraction` option for `percentage` fields.** When set, the field treats the
  underlying model value as a 0–1 fraction while showing/editing it as a 0–100
  percentage: the model keeps the fraction (e.g. `0.2`), the input shows `20`.
  Scaling rounds away binary-float artefacts (`0.2 * 100 = 20.000000000000004`).
  Off by default (the value is taken as a whole percentage). Use for values stored
  as ratios — VAT rates, discounts, etc.

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
