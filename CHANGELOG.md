# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
