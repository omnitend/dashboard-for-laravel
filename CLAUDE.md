# Laravel Dashboard - Claude Code Instructions

## Project Overview

This is **@omnitend/dashboard-for-laravel**, a reusable full-stack component library for building Laravel dashboards with Vue 3, Inertia.js, and Bootstrap Vue Next.

**Package Type**: Dual package (NPM + Composer)
**NPM Package**: `@omnitend/dashboard-for-laravel`
**Composer Package**: `omnitend/dashboard-for-laravel`

## Purpose

This library provides:
1. **Vue 3 Components** - Reusable dashboard UI components
2. **D* Wrapper Components** - Type-safe wrappers around Bootstrap Vue Next (58 base components)
3. **DX* Extended Components** - Complex dashboard layouts, forms, stat cards, and charts (16 components)
4. **Form System** - Type-safe form handling with validation
5. **Composables** - Reusable Vue composition functions
6. **Theme** - Bootstrap 5 custom SCSS theme
7. **PHP Utilities** - Laravel helpers for API responses and form requests

**Total: 74 components** (58 base + 16 extended)

> **Chart components ship from a separate entry** (`#142`): `DXBarChart`,
> `DXLineChart`, `DXDoughnutChart` are exported from
> `@omnitend/dashboard-for-laravel/charts` (built by `vite.config.charts.ts` into
> `dist/charts.*`), NOT the main entry — so `chart.js`/`vue-chartjs` stay
> genuinely optional peers (the main bundle has zero references to them, guarded
> by `tests/bundle/chart-optional-peer.test.ts`). Their `.dx-chart` container
> style is global in `theme.scss`, so the charts entry ships no CSS.

## Project Structure

```
dashboard-for-laravel/
├── src/                                    # PHP source code (Composer)
│   ├── Http/
│   │   ├── Requests/BaseFormRequest.php
│   │   └── Resources/PaginatedResource.php
│   ├── Traits/HasApiResponses.php
│   └── LaravelDashboardServiceProvider.php
├── resources/
│   ├── js/
│   │   ├── components/
│   │   │   ├── base/                      # D* wrapper components
│   │   │       ├── DButton.vue
│   │   │       ├── DCard.vue
│   │   │       ├── DTable.vue
│   │   │       ├── DDropdown.vue
│   │   │       ├── DAlert.vue
│   │   │       ├── DContainer.vue
│   │   │       ├── DRow.vue
│   │   │       ├── DCol.vue
│   │   │       ├── DFormGroup.vue
│   │   │       ├── DFormInput.vue
│   │   │       ├── DFormSelect.vue
│   │   │       ├── DFormTextarea.vue
│   │   │       ├── DFormCheckbox.vue
│   │   │       ├── DPagination.vue
│   │   │       ├── DBadge.vue
│   │   │       ├── DSpinner.vue
│   │   │       └── DNavItem.vue
│   │   ├── composables/
│   │   │   └── useForm.ts                 # Form handling composable
│   │   └── types/                         # TypeScript type definitions
│   └── css/
│       └── theme.scss                     # Bootstrap 5 custom theme
├── dist/                                   # Built package (generated)
│   ├── dashboard-for-laravel.js           # ES module
│   ├── dashboard-for-laravel.umd.cjs      # UMD module
│   ├── style.css                          # Compiled CSS
│   └── index.d.ts                         # TypeScript declarations
├── package.json                            # NPM package definition
├── composer.json                           # Composer package definition
├── vite.config.ts                         # Vite build configuration
├── tsconfig.json                          # TypeScript configuration
└── README.md                              # Package documentation
```

## Development

### Building the Package

```bash
# Build once (creates dist/ folder)
npm run build

# Watch mode (rebuilds on file changes)
npm run dev

# Type checking only
npm run typecheck
```

### Testing

The project uses **Vitest Browser Mode** for component testing with visual output.

**Running Tests:**
```bash
# Run tests in browser (visual mode, window opens)
npm test

# Run tests with Vitest UI (web-based test runner)
npm run test:ui

# Run tests headless (for CI)
npm run test:headless
```

**Test Structure:**
```
tests/
├── components/           # Component tests
│   └── DXTable.test.ts  # Example: DXTable tests
├── fixtures/            # Test data
│   └── tableData.ts     # Table test fixtures
└── setup.ts             # Test environment setup
```

**Writing Tests:**

Tests use `vitest-browser-vue` for rendering components in a real browser:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

describe('DXTable', () => {
  it('renders table with data', async () => {
    const { container } = render(DXTable, {
      props: {
        title: 'Customers',
        items: customerData,
        fields: customerFields,
        pagination: paginationData,
      },
    });

    // Visual: Component renders in browser window
    // Programmatic: Assert data is correct
    const title = await screen.getByText('Customers');
    expect(title).toBeInTheDocument();

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
  });

  it('handles pagination clicks', async () => {
    const { emitted } = render(DXTable, {
      props: {
        items: data,
        fields: fields,
        pagination: { currentPage: 1, perPage: 10, total: 25 },
      },
    });

    // Visual: See pagination in browser
    // Programmatic: Test interaction
    const page2 = await screen.getByRole('button', { name: '2' });
    await userEvent.click(page2);

    expect(emitted()['page-change'][0]).toEqual([2]);
  });
});
```

**Benefits of Browser Mode:**
- **Visual feedback:** See components rendered in real browser
- **Programmatic assertions:** Full testing-library API
- **Real browser environment:** No JSDOM limitations
- **Interactive debugging:** Can interact with components during test runs
- **Fast HMR:** Changes to tests reload instantly

**Test Fixtures:**

Create reusable test data in `tests/fixtures/`:

```typescript
export const customerData = [
  { id: 1, name: 'John Smith', email: 'john@example.com' },
  // ... more test data
];

export const customerFields = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
];
```

### Using in Local Projects

When developing this library alongside consuming apps:

**Option 1: npm link**
```bash
# In dashboard-for-laravel/
npm run build  # or npm run dev for watch mode
npm link

# In your consuming app
npm link @omnitend/dashboard-for-laravel
```

**Option 2: File reference**
In the consuming app's package.json:
```json
{
  "dependencies": {
    "@omnitend/dashboard-for-laravel": "file:../dashboard-for-laravel"
  }
}
```

### Documentation Development

The documentation site imports from the **built package** using `npm link`:

**Setup:**
```bash
# In root directory
npm run build  # Build the package
npm link       # Create global symlink

# In docs directory (already configured)
cd docs
npm link @omnitend/dashboard-for-laravel
```

**How it works:**
- Docs import from `@omnitend/dashboard-for-laravel` (the package)
- `npm link` creates a symlink: `docs/node_modules/@omnitend/dashboard-for-laravel` → root
- Changes require rebuilding: `npm run build` (or `npm run dev` for watch mode)
- This ensures docs consume the library exactly like end users would

**Important:**
- Docs should NEVER import from `../../../resources/js` directly
- All imports must be from `@omnitend/dashboard-for-laravel`
- This prevents module resolution issues and matches real-world usage
- Components in the package must include SSR guards for browser-only APIs (localStorage, document)

## Component Guidelines

### D* Wrapper Components

All Bootstrap Vue Next components should be wrapped in D* components, including child components (DAccordionItem, DCarouselSlide, DListGroupItem, DTab, etc.):

**Purpose:**
- Provide consistent API across projects
- Add type safety
- Allow customisation without modifying Bootstrap Vue Next
- Enable proper slot forwarding

**Exceptions & API divergences:** A few components can't be wrapped — e.g.
`DCarousel`/`DCarouselSlide` are raw re-exports of the bvn components because
`BCarousel` registers slides by scanning slot vnodes for the slide component
type, which a wrapper in between breaks. Where a wrapper *intentionally
diverges* from the underlying bvn API (e.g. shielding a changed signature so
consumers don't have to migrate on a bvn bump), record it in
[`DIVERGENCES.md`](./DIVERGENCES.md) and keep that ledger up to date whenever
you add or remove a shield. The plan is to converge on bvn's API in a future
major with a codemod-based migration path.

**Example - DDropdown.vue:**
```vue
<template>
  <BDropdown v-bind="$attrs">
    <!-- Dynamically pass through all named slots -->
    <template v-for="(_, name) in $slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BDropdown>
</template>

<script setup lang="ts">
import { BDropdown } from 'bootstrap-vue-next';

defineOptions({
  inheritAttrs: false,
});
</script>
```

**Key Patterns:**
1. **Dynamic slot forwarding**: Use `v-for="(_, name) in $slots"` to forward all slots
2. **Attribute inheritance**: Use `v-bind="$attrs"` to pass through all props
3. **inheritAttrs: false**: Prevent automatic attribute inheritance for better control

### DXDashboardSidebar

**Purpose**: Responsive collapsible sidebar with navigation

**Features:**
- Collapsible (hamburger icon toggle)
- Configurable collapsed/expanded widths
- Backend-driven navigation (array of nav items)
- Brand/logo slot
- Custom link rendering via slots
- Active state management

**Props:**
```typescript
interface Props {
  navigation?: NavigationItem[];
  user?: { name: string; email: string } | null;
  collapsedWidth?: string;    // Default: '70px'
  expandedWidth?: string;     // Default: '240px'
}

interface NavigationItem {
  label: string;
  href: string;
  icon?: string;              // Icon identifier (e.g., 'bi:house-door')
  divider?: boolean;
}
```

**Slots:**
- `#brand="{ collapsed }"` - Custom brand/logo content
- `#link="{ item, isActive, collapsed }"` - Custom link rendering

**Variants (`variant` / DXDashboard `sidebarVariant`):** `light` (default,
legacy Omni Tend look, Poppins) and `dark` (the old navy rail). ALL colours,
the typeface and weights are `--dx-sidebar-*` tokens in theme.scss: light on
`:root`, dark on `.dashboard-sidebar--dark`, where the typeface and link
size/weight are `initial` so those declarations fall back to inheriting, as
before the tokens. Keep colours out of the scoped block (it lands AFTER the
theme in dist/style.css, so a scoped colour beats the token rule); light
geometry uses `aside.dashboard-sidebar--light ...` to outrank scoped padding.
Group headers carry no `px-2`/`mb-2`/`fw-semibold` utilities on purpose (their
`!important` would block the light pills). The dark variant is checked
byte-identical against the pre-variant build; pinned by
`tests/components/DXDashboardSidebar.variant.test.ts` (rendered styles, token
rebrand, WCAG contrast of the light defaults).

**On phones (below `sm`, 576px):** inside DXDashboard the open sidebar is a
full-screen menu (theme.scss, `aside.dashboard-sidebar:not(.sidebar-hidden)`),
not a rail. DXDashboard matches `(max-width: 575.98px)` in JS and there: always
starts closed, never reads or writes `storageKey` (that is the DESKTOP
preference: consumer apps navigate with full page loads, and restoring it on a
phone reopened the menu over every page), closes on a followed nav link (the
sidebar's `navigate` event, delegated so `link`-slot anchors count, cancelled
clicks too because Inertia's `<Link>` cancels), on Escape and from the header's
`d-sm-none` close button (`close` event), and puts `dx-dashboard-menu-open` on
`<html>` to stop the page scrolling. The vitest window defaults to 414px, i.e.
a phone: a test of the rail's own defaults must set a desktop
`page.viewport`. Pinned by `tests/components/DXDashboard.phone.test.ts`.

DModal is likewise full screen below `sm` by default (`fullscreen="sm"`),
except `size="sm"`; an explicit `fullscreen` wins because `$attrs` fall
through onto the root BModal after its own bindings.

**Styling Notes:**
- Uses CSS variables for colours (`var(--bs-dark)`, `var(--bs-nav-link-color)`)
- Separator line: `rgba(255, 255, 255, 0.1)` for subtlety
- Smooth transitions on collapse/expand

### DXDashboardNavbar

**Purpose**: Top navigation bar with user dropdown

**Features:**
- User avatar with initial (circular)
- Dropdown menu (Settings, Log out)
- Customisable via slots

**Props:**
```typescript
interface Props {
  user?: { name: string; email: string } | null;
  pageTitle?: string;                       // Default: ''
  searchAlign?: 'start' | 'center';         // Default: 'start'
  actionsOnMobile?: 'wrap' | 'hide';        // Default: 'wrap' — what the actions slot does below `md`
}
```

**Slots:**
- `#user-icon="{ initial, user }"` - Custom user icon/avatar; defaults to `DXUserAvatar`
- `#user-menu-items="{ user }"` - Dropdown items (consumers pass DDropdownItem, incl. their own log-out link)

### DXUserAvatar

**Purpose**: The circular avatar (initial on a disc) in the navbar's user menu,
with an optional notification dot. Props: `user`, `initial`, `badge`,
`badgeVariant`, `badgeLabel`.

It is a *separate component* rather than markup inside `DXDashboardNavbar`
because the `user-icon` slot is one consumers **decorate** (add an unread dot,
wrap it in a link) rather than replace — and the navbar's styles are scoped, so
slot content compiled in the consumer's scope can never reuse them. Without the
component, every override starts by re-implementing the avatar's CSS, which then
drifts from the theme (#98).

**Generalise from this**: any slot whose default content consumers are expected
to decorate should have that default available as an exported component. A
scoped style block plus a slot is a trap — the slot content can't see the styles.

Its disc keeps the class **`.user-avatar`** (not a `dx-`-prefixed name) because
that is the documented theming hook in `docs/src/pages/guide/theming.md` —
renaming it would silently break consumer overrides.

### DXBasicForm

**Purpose**: Render forms from field definitions with validation

**Props:**
```typescript
interface FieldDefinition {
  key: string;
  label?: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'date' | 'tel' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; text: string }>;  // For select fields
}

interface Props {
  fields: FieldDefinition[];
  form: ReturnType<typeof useForm>;
  submitText?: string;
}
```

**Usage Example:**
```vue
<template>
  <DXBasicForm
    :fields="fields"
    :form="form"
    submit-text="Create Customer"
    @submit="handleSubmit"
  />
</template>

<script setup lang="ts">
import { useForm, DXBasicForm } from '@omnitend/dashboard-for-laravel';

const form = useForm({
  name: '',
  email: '',
  country: 'UK',
});

const fields = [
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    required: true,
    placeholder: 'Enter name',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
  },
  {
    key: 'country',
    label: 'Country',
    type: 'select',
    required: true,
    options: [
      { value: 'UK', text: 'United Kingdom' },
      { value: 'US', text: 'United States' },
    ],
  },
];

const handleSubmit = async () => {
  await form.post('/api/customers');
};
</script>
```

### DTable

**Purpose**: Wrapper around Bootstrap Vue Next table with type safety

**Features:**
- Custom cell rendering via slots
- Row click events
- Responsive
- Hover effects

**Usage Example:**
```vue
<template>
  <DTable
    :items="customers"
    :fields="fields"
    hover
    responsive
    class="clickable-rows"
    @row-clicked="handleRowClick"
  >
    <template #cell(business_name)="{ item }">
      <div class="fw-semibold">{{ item.business_name }}</div>
      <small class="text-muted">{{ item.contact_name }}</small>
    </template>
  </DTable>
</template>
```

### DXTable internal structure (façade)

`DXTable.vue` was a ~2600-line god-component (table + CRUD + modal + request
client). It is now a **thin façade** (~1740 lines: props/emits, mode detection,
the single table render, and wiring) composing four internal pieces — none of
which are exported; they exist only to keep `DXTable` factored (#123, #129):

- **`DXTableShell.vue`** — the card/plain chrome wrapper.
- **one `<DTable>` render** driven by a `tableModeBindings` computed — the
  filter row, headers, dotted-cell rendering and slot forwarding live **once**
  for all three data modes (provider / client-side / inertia), not copied per
  mode. `activePagination` + `handleActivePageChange` likewise drive one footer.
- **`DXTablePagination.vue`** — the pager + per-page selector + info line (one
  footer for all modes). Since v0.32.0 the pager is a **custom windowed pager**
  (#155, custard-style: «Previous / 1 2 … window … 44 45 / Next», client-computed
  from current/last page), NOT bvn `BPagination` — it renders `DButton`s and owns
  its `.dx-pager :deep(.btn)` styles (a `:deep()` in DXTable would not cross the
  boundary — see the BVN-styling note above). `DPagination`/`BPagination` stays
  exported but is no longer used by the table.
- **`useResourceEditor.ts`** (composable) — the create/edit/delete concern:
  modal state, form seeding + visibility rules, the `showUrl` fetch, submission,
  toasts. Pure logic; it never touches the table's data/sort/filter/page state.
- **`DXTableEditorModal.vue`** — the edit modal: `DModal` + `DXForm` + the
  `edit-value`/`edit-span`/`tab-*` slot mapping. DXTable forwards the consumer's
  edit slots to it generically; **these reach `DXForm` across two component
  hops**, so any change there must be DOM-verified (the bindings must survive
  both hops — guarded in `tests/components/DXTable-EditTabs.test.ts`, which
  goes red when the forward is neutered).

The three seams between the editor and the table: `editFields` presence →
`rowsAreInteractive`; `handleRowClick` → `editor.openEdit` (the row→modal
bridge, still emits `rowClicked` regardless); a `refresh()` callback the editor
calls after a successful op. Plan: `plans/2026-07-18-dxtable-decomposition.md`.

**Backend-convention adaptation goes through the `api-adapter` prop** (0.33.1)
— `request(params)` returns the wire params, `response(body, { params })`
returns the dfl `{data, pagination?, filterValues?}` shape. This is the
sanctioned seam for consumers whose backend speaks a different convention
(spatie params, foreign envelopes). It exists because #132's axios→fetch swap
silently bypassed consumer **axios-interceptor bridges** even though the
provider params never changed — a transport swap is a breaking change for
interceptor-dependent consumers. When changing how DXTable *sends* requests,
check that the adapter seam still covers what interceptors used to. A
bare-array response renders rows with no pager (never a silently empty table);
plan: `plans/2026-07-20-dxtable-033-provider-contract-regression.md`.

## Composables

### useForm

**Purpose**: Type-safe form handling with validation and submission

**Features:**
- Form state management (data, errors, processing)
- HTTP methods (post, put, patch, delete)
- Validation error handling
- Success/error callbacks
- Reset and clear errors methods

**API:**
```typescript
const form = useForm({
  name: '',
  email: '',
});

// Submit methods
await form.post('/api/users', options);
await form.put('/api/users/1', options);
await form.patch('/api/users/1', options);
await form.delete('/api/users/1', options);

// Form state
form.processing;          // boolean - is form submitting?
form.errors;              // ValidationErrors object
form.hasErrors;           // computed boolean
form.recentlySuccessful;  // boolean - was last submit successful? (clears after 1.5s)
form.wasSuccessful;       // boolean - latest submit succeeded (until the next submit; DXForm's saved state)

// Form methods
form.reset();             // Reset to initial values
form.clearErrors();       // Clear all errors
form.clearError('email'); // Clear specific field error

// Options for submit methods
interface FormSubmitOptions {
  onSuccess?: (data: any) => void;
  onError?: (errors: ValidationErrors) => void;
}
```

## Styling Guidelines

### Type scale (base 16px, three-tier, since v0.39.0)

`$font-size-base` is **`1rem` (16px)** — the default tier for body text, table
cells, form controls and buttons. Two smaller tiers fall out of Bootstrap
defaults: **14px small** (`.small` / `<small>`, Bootstrap's `.875em`) for
sub-lines, hints and muted meta; **12px extra-small** (`.75em`) for badges and
fine print. Badges self-land at 12px. It was 14px until 0.39.0, which read
miniaturised against rem-fixed chrome; 16px matches legacy omnitend. `--dx-input-height`
is ~38px at this base. When judging an optical spacing tweak (a check-box margin,
a caret offset), prefer an **em** value (scales with the tier) and judge it
against a rendered screenshot at 16px, not the maths — glyphs seat
differently in the line box per typeface. The dense **sidebar** metrics (#95, `0.875rem` headers) are
rem-pinned and intentionally stay 14px regardless of the base.

**Headings are small and weight 500** (legacy omnitend's weight): h1 1.25rem,
h2 1.15rem, h3/h4 1.05rem, h5/h6 1rem (so neither outranks h4). h1 sits at
Bootstrap's RFS threshold, so nothing rescales on narrow screens. Explicit
weight utilities still win: DXDashboardNavbar's page title is an `h4
fw-semibold` (Poppins 600, which is why that face is bundled). **Table text**:
body cells `$table-color: var(--bs-body-color)` (#212529, not Bootstrap's
pure-black emphasis colour), headers `$table-th-font-weight: 500` (was the
browser's bold) in `--dx-table-header-color`. Pinned by
`tests/components/typography.test.ts`.

### Typefaces (bundled, since the fruity-palette pass)

- **Body: Maven Pro** (`$font-family-sans-serif`). **Display: Poppins**, a
  theme token `$dx-font-family-display` → `--dx-font-family-display`, applied
  by the theme to **h1–h4 / `.h1`–`.h4` only** (via `$headings-font-family`;
  h5/h6 are reset to the body face). Consumers use the token for product names;
  dfl applies it to nothing else. Never call it "display name": that phrase is
  a product field downstream.
- **Both are bundled** as woff2 with `@font-face` + `font-display: swap`
  (`$dx-bundled-fonts` in theme.scss): Maven Pro 400/500/600/700, Poppins
  500/600. Sources and their SIL OFL 1.1 licences live in
  `resources/fonts/<family>/` (`OFL.txt` beside the files; the package ships
  `resources`). A weight that is not in the list gets synthesised, so add a
  face rather than relying on it.
- **Extraction**: Vite inlines every CSS-referenced woff2 in lib mode, so
  `scripts/extract-icon-font.mjs` writes EVERY inlined woff2 out to
  `dist/assets/<source-name>-<hash>.woff2`, naming each by matching its bytes to
  `resources/fonts/**` or the bootstrap-icons font. Same reason and mechanism
  as the icon font (#77).
- **Poppins is subset to Latin** (about 12 KB a face, from 50 KB with
  Devanagari) by `scripts/subset-poppins.py build <Poppins-Medium.ttf>
  <Poppins-SemiBold.ttf>`, from the upstream TTFs. The kept ranges are literals
  in the script: Basic Latin, Latin-1, Latin Extended-A and Additional, General
  Punctuation, currency, letterlike and maths symbols. Poppins has no arrows or
  check marks, so a UI arrow in a heading falls back to the next font. All
  layout features and every name record (the OFL licence, IDs 0/13/14) are
  kept. Poppins has no kerning to keep: its GPOS only positions Devanagari
  marks. Subsetting is allowed because Poppins' OFL has no Reserved Font Name.
  `scripts/subset-poppins.py check <files>` asserts the glyphs English/UK
  headings and product names need (A–Z, a–z, 0–9, £ € & quotes, dashes,
  ellipsis, bullets, é è à ç ñ ö ü ä), that Devanagari is gone and that the
  licence records survive; `build` runs it on its output. woff2 output needs
  the Python `brotli` module.
- **Never subset or modify the Maven Pro files.** They are the upstream woff2s,
  byte-identical, because Maven Pro's OFL has a Reserved Font Name: a modified
  copy could not keep the name.
- **Test the faces LOAD, not the names**: `tests/bundle/theme-fonts.test.ts`
  renders text in each face and asserts the `document.fonts` entry reached
  `status === "loaded"`. A `font-family` check passes with the font missing
  (it did for Poppins, which the theme named but never shipped), and a face that no rendered text uses
  stays `unloaded`, which the test also catches.

### Layout tokens: dashboard gutter and form label column

- **One dashboard gutter, 20px; 16px below `sm`** (`$dashboard-gutter-x` /
  `$dashboard-gutter-x-phone` → `--dx-dashboard-gutter-x` on `:root`, the
  phone value matching the full-screen modal's 1rem padding).
  theme.scss applies it as the horizontal padding of the `.container-fluid` directly inside
  `.dashboard-navbar` AND inside `.dashboard-main` (which keeps only `py-4`), so
  the navbar's first item starts exactly where page content starts. In
  DXDashboard's centred branch the `DRow`'s negative margins and the `DCol`'s
  padding cancel, so the content edge is the gutter there too. Don't put
  horizontal padding back on `<main>` or the navbar's container; pinned by
  `tests/components/DXDashboard.gutter.test.ts` (rendered rects, both sidebar
  states, both content branches, the wrapped navbar below `md`).
- **One top band**: `--dx-dashboard-header-bg` paints the navbar AND the
  light sidebar's brand row (the latter reads it at the element, via
  `var(--dx-sidebar-header-bg, var(--dx-dashboard-header-bg))`, so an override
  anywhere above reaches both); `--dx-dashboard-header-border-width` is the
  line under it, `0px` by default (a unit, because it is subtracted in the
  content-budget calc) and 1px under `.dashboard-layout--sidebar-dark`, where
  the brand row stays navy (`--dx-sidebar-header-bg: transparent`). The
  navbar has no `border-bottom` utility class any more.
- **One header height** (`--dx-dashboard-header-height`, 64px): the sidebar
  header's `height`, the navbar's `min-height` and its bar's floor, and the
  navbar content budget all derive from it, so the two bottom edges meet. Never
  size either element on its own (greendragon's stepped corner came from
  exactly that). Pinned by `tests/components/DXDashboard.header.test.ts`,
  which also pins the one-row phone navbar (search `flex: 1 1 0`, 9rem floor,
  `kbd` hidden by the `dx-navbar-search` container query below 16rem).
- **Default horizontal label column is 45%** (`$dx-form-label-width` →
  `--dx-form-label-width`). With no `labelCols` from the form or field,
  DXField passes BFormGroup `labelColsSm: true` (a `col-sm`, so it stacks below
  `sm`) plus the class `dx-field-label-col--default-width`, which theme.scss
  sizes from `sm` up; the input is a plain `.col`. Any explicit `labelCols`
  skips the modifier and uses the 12-column grid as before. Because the default
  stacks below the `sm` VIEWPORT, a layout test of horizontal rows must set a
  wide `page.viewport` (the runner's default window is 414px). Pinned by
  `tests/components/DXForm-LabelWidth.test.ts`.
- **Horizontal label centring**: the label column carries a top padding equal
  to a text input's, so its first line centres on a 1-line input; checkboxes,
  radios and switches get the same top margin (`.dx-form--horizontal
  .form-check`). Switch-list rows instead centre the whole `.row`
  (`.dx-switch-list-row .row` in theme.scss) so a trailing notes input lines
  up too. A utility class on a `DFormGroup` lands on bvn's WRAPPER div, not
  the inner `.row`, so it cannot change the row's alignment. Consumer markup
  in a `value(key)` slot must follow the same rule (a bare native checkbox
  sits 11px high; a `mt-2` wrapper pushes a control 8px low). **Display-only
  content needs nothing (0.42.1)**: a row whose content column holds no form
  control (`$dx-display-only-row` in theme.scss: no `input` other than
  hidden, `select`, `textarea`, `button`, `.btn`, `.form-control`,
  `.form-select`, `.form-check`, `.input-group`, `[contenteditable]`) is
  `align-items: baseline`, so the value's FIRST line of text, whatever its
  shape (text, link, flex row, stack), sits on the label's. Two helpers make
  shapes offer that text as their baseline: a table's first-row cells are
  `vertical-align: baseline` (with every cell `middle`, CSS takes the row's
  baseline from the cell's bottom edge, ~6px low), and a `.badge` is
  `vertical-align: top` plus half the spare line height (its own baseline is
  its smaller text's, ~2px off). Limits: a control anywhere in the column
  keeps the whole row top-aligned (display text above a button sits high,
  as it always did); content with no text (an image, an icon) puts its
  bottom edge on the label baseline; it needs `:has()` (no fallback beyond
  the old top alignment). Rows holding controls were left on the top
  alignment on purpose: checkboxes, switches and file inputs expose
  synthesized or box-edge baselines. `.dx-form-plaintext` (which carries
  `.col-form-label`'s padding and line-height, and centres a badge the same
  way) still works and is now redundant inside a horizontal form; DXField
  still wraps a `plaintext` field's `value` slot in it. The name reuses
  `plaintext` in its existing meaning (the field option, Bootstrap's
  `.form-control-plaintext`): a value shown without an input box. Pinned by
  `tests/components/DXForm-LabelCentring.test.ts`.

### Semantic colour system (soft-first, since v0.27.0)

The library uses a **soft-first** semantic colour system built on the Omni Tend
brand. Respect it when adding or styling components — don't reach for a loud
solid fill by reflex.

- **Emphasis comes from weight and place, not loudness.** Only **`primary`** is a
  bold SOLID button (the brand navy `#151e2d` fill + light text) — one loud action
  per screen. Every other variant, **including `danger`**, is **soft** (light
  same-hue tint + dark same-hue label); a soft `.btn-danger`/"Delete" is a light
  magenta (`#f9dff2`/`#61124c`). Tertiary actions use a `link` variant restyled
  as a **ghost** (body colour, no underline).
- **The status hues are the "fruity" palette** (2026-10): solids lime `#7bf25a`,
  magenta `#e46ab9`, butter `#efd574`, sky `#7fd7fd`; emphasis (= the base
  `$success/$danger/$warning/$info`) `#236b12`, `#a3247f`, `#8a6d00`,
  `#31586d`. Every label is a dark same-hue ink, never white.
- **`pending` is a seventh variant** (waiting; the next move is not yours):
  solid `#b9a3f0`/`#2a1260` (7.06:1), soft `#e3d3fb`/`#3b1a80` (9.10:1),
  emphasis `#6a43c4` (6.54:1 on white), a violet from chart slot 5 kept clear
  of info's slate blue. It is in `$dx-variants` AND in a pre-import
  `$theme-colors`, so Bootstrap generates `.btn-pending`, `.text-bg-pending`,
  `.alert-pending`, `.list-group-item-pending`, `.link-pending` etc. The subtle
  maps (`$theme-colors-text/-bg-subtle/-border-subtle`, their `-dark` forms,
  and `$utilities-text-emphasis-colors`/`-bg-subtle`/`-border-subtle`) list
  the stock colours BY NAME and only exist after Bootstrap's variables load,
  so theme.scss imports `functions`/`variables`/`variables-dark`/`maps`
  first, merges `pending` in, then imports the whole of Bootstrap (all
  `!default`, so the second read keeps the merged maps and emits nothing
  twice). A new variant needs the same three places. TS: `types/index.ts`
  augments bvn's `BaseColorVariant`, which flows to `ColorVariant`,
  `ButtonVariant` (incl. `outline-pending`) and the subtle/emphasis unions.
  `useToast`'s themed set includes it. Pinned by `pending-variant.test.ts`.
- **Links are the brand navy `#151e2d` and stay underlined** (Bootstrap's
  default `$link-decoration`; only the ghost `.btn-link` drops it). The
  underline is what marks a navy link, so don't remove it.
- **Form errors are crimson `#c8102e`** (`$dx-form-error`, wired into
  `$form-invalid-*` / `$form-feedback-*-invalid-*` before the import), NOT the
  danger magenta, which stays on badges and buttons.
- **Bootstrap's subtle family is derived from the soft tints** (set before the
  import): `$X-bg-subtle` and the `$table-variants` rows = soft-bg mixed with
  white to **70% white** (`dx-subtle-bg()`; legacy omnitend's rows measure
  about that, danger `#fdf6fb`, warning `#fbf3d8`; 50% read too strong),
  `$X-border-subtle` = soft-bg 10% darker, `$X-text-emphasis` = soft-text.
  Sass emits the mix with fractional channels (`rgb(237, 253.5, 229.5)`), so
  tests compare parsed channels, not strings. The `*-dark` subtle variables are
  still Bootstrap's own derivation.
- **Alerts take the SUBTLE tint, not the soft one**: `.alert-*` = the 70% mix
  background, the `border-subtle` shade as a visible border, soft-text. A soft
  warning alert was the full butter-yellow solid. Badges, soft buttons and
  toasts (their own 50% mix via `--bs-toast-bg`) keep their tints; pinned by
  `soft-badges.test.ts`.
- **Switches** default to the filled-box style (`DXSwitch` / `DXField
  type:'switch'`): the whole box is green when on (the success soft green) / light
  magenta when off (a tint of the danger solid; the bare `.form-switch` thumb is
  the danger emphasis `#a3247f`, `$dx-switch-thumb-off`), with a neutral grey
  pill; `on-variant="neutral"` for mixed cases (#158, v0.31.0).
- **Status colours are soft** — badges and toasts use the soft tint; alerts
  the paler subtle step of it.
- **Large FILLS use the vivid `solid-bg`, not the emphasis shade** (#154):
  `.progress-bar.bg-success` is the switch-ON lime `#7bf25a`, not the deep
  green emphasis. Emphasis shades stay for outlines/links/text.
- **DXTable header titles are muted grey** by default (#157), token
  `--dx-table-header-color`. Sidebar nav has natural-case group headers since
  #95 (0.875rem headers, 0.3rem link padding), with a **1rem** gap between
  groups (#176) — #95's 0.25rem left a group label closer to the previous
  group's last item than to its own, so the eye attached it to the wrong group.
  Pinned by `tests/components/DXDashboardSidebar.spacing.test.ts`, which
  measures rendered rects rather than class names.
- **Disabled buttons are neutral grey, whatever the variant** (Bootstrap's is
  opacity only, so a disabled warning/success still looked live): fill
  `#e9ecef`, label `#6c757d` (3.95:1; disabled controls are WCAG-exempt),
  opacity 1; outline = no fill + `#ced4da` border; link = grey text. Tokens
  `--dx-btn-disabled-bg/-color/-outline-border`, applied through Bootstrap's
  `--bs-btn-disabled-*` in a `.btn:is(:disabled, .disabled), fieldset:disabled
  .btn` rule that outranks the per-variant classes. No `cursor`: Bootstrap's
  `pointer-events: none` on disabled buttons means it would never show.
  Form-control disabled styling is Bootstrap's (already neutral). **Two
  exceptions keep their OWN variant's colours** (navy primary
  `#151e2d`/`#e9f0f8` by default) at opacity 1, through one rule after the
  neutral one: a **busy** button (DButton `loading`, `aria-busy="true"`),
  disabled only against a double press, and **DXSaveButton's saved state**
  (`.dx-save-button--saved`), a confirmation. Neither is an unavailable
  action, so the colour never changes through a save, only the label and the
  disabled state (product decision 2026-10-04; #182 first shipped saved as
  the success soft green, and 0.42.0 still greyed busy buttons, which made
  every save blink navy → grey → navy). Pinned by `disabled-buttons.test.ts`.
- **`success`/green means a positive _outcome_, not "save".** The main action is
  `primary`. A button never turns green after saving: `DXSaveButton`'s saved
  state ("✓ Saved", disabled until the form changes, what `DXForm`'s submit
  button does after a successful save) stays in its own variant.
- **Outline buttons / coloured links / `.text-*`** use each variant's *emphasis*
  shade (readable on white), which is also the base `$theme-color`.
- Everything is driven by the **`$dx-variants` map in `resources/css/theme.scss`**
  (one source of truth per variant: solid / soft / emphasis + solid-vs-soft
  button). All pairs are WCAG AA. Full spec + rationale:
  `plans/2026-07-18-semantic-colour-system.md`. Guarded by
  `tests/components/soft-badges.test.ts`.
- Design/review tooling: the **Style guide** (`docs /showcase`) and **Colour
  playground** (`docs /playground`).
- **Charts do NOT read the semantic variables.** Data-viz has its own lists in
  theme.scss, read at runtime by `chartTheme.ts` (#141): `$dx-chart-palette`
  (light FILLS, `--dx-chart-1..8`), `$dx-chart-line-palette` (LINE shades,
  `--dx-chart-line-1..8`, each fill darkened to 3.5:1 on white) and
  `$dx-chart-edge` (`#121419`, `--dx-chart-edge`). The fills share the fruity
  status hues but are only 1.35–2.97:1 on white, so WCAG 1.4.11 non-text
  contrast is carried by the 1px edge on bars/doughnut segments and by the
  line shades on line charts. `applyPalette` sets bar/doughnut
  `borderColor`=edge + `borderWidth`=1, and line `borderColor`=line shade,
  `pointBackgroundColor`=fill, `pointBorderColor`=line shade, area
  `backgroundColor`=fill at 35% — each only when the caller left it unset.
  The **slot order is load-bearing** — slot 1 pinned, slots 2..8 the best
  permutation for adjacent-pair CVD separation (OKLab ΔE ×100, Viénot
  protan/deutan): fills min adjacent 19.56, lines 13.73. Don't reorder, swap a
  hue or hand-edit a line shade without re-running
  `node scripts/validate-chart-palette.mjs` (reads the lists from theme.scss,
  prints the scores and the best order, and fails if a line shade isn't its
  fill darkened to 3.5:1). Sync between the Sass lists, the TS fallbacks
  (`PALETTE_VARS`, `LINE_PALETTE_VARS`, `EDGE_VAR`) and the test expectations
  is enforced by `tests/components/charts.test.ts` (it parses the Sass
  source). The palette cycles after 8 series. Under `data-bs-theme="dark"`
  the fills remap to `$dx-chart-palette-dark` (#145, unchanged: min adjacent
  CVD ΔE 15.09, all ≥5.67:1 on `#212529`), the line shades ARE those dark
  fills, and the edge is `$body-bg-dark` (`#212529`), so dark charts look as
  they did before the edge existed. The `[data-bs-theme="light"]` re-declaration
  shares a mixin with `:root`. Swapping a dark step needs the validation re-run,
  same as the light set. Related: `release.sh` regenerates the AI docs
  (`docs:generate:ai`) before publish because `api-reference.json`/`llms.txt`
  are **gitignored but listed in package.json `files`** — without the regen,
  publish ships whatever stale copy sits on disk.

### CSS Variables Only

**NEVER hardcode colour values**. Always use CSS variables from Bootstrap or theme.scss.

**Good:**
```vue
<style scoped>
.custom-component {
  background-color: var(--bs-primary);
  color: var(--bs-white);
  border-color: var(--bs-border-color);
}
</style>
```

**Bad:**
```vue
<style scoped>
.custom-component {
  background-color: #4f46e5;  /* Never do this! */
  color: #ffffff;
}
</style>
```

### Common CSS Variables

From Bootstrap 5:
- **Colours**: `--bs-primary`, `--bs-secondary`, `--bs-success`, `--bs-danger`, `--bs-warning`, `--bs-info`, `--bs-light`, `--bs-dark`, `--bs-white`
- **Navigation**: `--bs-nav-link-color`, `--bs-nav-link-hover-color`, `--bs-nav-link-active-color`
- **Borders**: `--bs-border-color`, `--bs-border-radius`
- **Spacing**: `--bs-gutter-x`, `--bs-gutter-y`

From theme.scss (custom):
- Any custom variables defined in `resources/css/theme.scss`

### Theme Customisation

All theme customisation goes in `resources/css/theme.scss`:

```scss
// Override Bootstrap variables
$primary: #your-colour;
$secondary: #your-colour;

// Import Bootstrap
@import 'bootstrap/scss/bootstrap';

// Custom styles
.custom-class {
  colour: var(--bs-primary);
}
```

## TypeScript Guidelines

### Type Definitions

Create type definitions in `resources/js/types/`:

```typescript
// resources/js/types/forms.ts
export interface FieldDefinition {
  key: string;
  label?: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; text: string }>;
}

export interface ValidationErrors {
  [key: string]: string[];
}
```

### Component Props

Always define prop types:

```vue
<script setup lang="ts">
interface Props {
  user?: { name: string; email: string } | null;
  pageTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pageTitle: '',
});
</script>
```

## Build Output

When you run `npm run build`, the package creates:

```
dist/
├── dashboard-for-laravel.js       # ES module (for modern bundlers)
├── dashboard-for-laravel.umd.cjs  # UMD module (for older systems)
├── style.css                      # Compiled CSS with theme
└── index.d.ts                     # TypeScript declarations
```

Consuming apps import from the package:
```typescript
import { DButton, DCard, useForm } from '@omnitend/dashboard-for-laravel';
import '@omnitend/dashboard-for-laravel/theme.css';
```

### CSS Build Details

**IMPORTANT**: Always import `theme.css` (the built CSS), not `theme.scss` (the source).

**Why?**
- `dist/style.css` contains **both** Bootstrap theme styles **and** Vue component scoped styles
- Component scoped styles (e.g., `.user-avatar[data-v-xxx]`) are extracted during the Vite build
- Importing `theme.scss` directly gives you only Bootstrap, missing all component styles

**Build Process:**
1. `resources/js/index.ts` imports `../css/theme.scss` at the top
2. Vite builds the JS bundle and extracts all CSS (theme + component styles) into `dist/style.css`
3. Vue's scoped styles from `<style scoped>` blocks are automatically included
4. Final output: Single CSS file with everything needed

**Sourcemap Trade-offs:**
- **Built CSS** (`theme.css`): ✅ Component styles included, ⚠️ Sourcemaps point to built CSS
- **Source SCSS** (`theme.scss`): ✅ Deep Bootstrap sourcemaps, ❌ Missing component styles (breaks UI)

**For debugging Bootstrap variables**, view source files directly in `node_modules/bootstrap/scss/` rather than switching to source SCSS import.

**Package Exports:**
```json
{
  "./style.css": "./dist/style.css",      // Recommended
  "./theme.css": "./dist/style.css",      // Alias (same as above)
  "./theme.scss": "./resources/css/theme.scss"  // Source (for advanced use only)
}
```

## Testing in Consuming Apps

After making changes:

1. **Build the package**: `npm run build` (or use `npm run dev` for watch mode)
2. **In the consuming app**: The changes should be automatically available
3. **If using npm link**: May need to restart the consuming app's dev server
4. **Verify**: Check that components render correctly and types are working

## Important Patterns

### Dynamic Slot Forwarding with Slot Props

**CRITICAL**: When creating wrapper components, you must forward both slot content AND slot props.

**Incorrect** (only forwards content, not props):
```vue
<template>
  <BComponent v-bind="$attrs">
    <template v-for="(_, name) in $slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BComponent>
</template>
```

**Correct** (forwards both content and props):
```vue
<script setup lang="ts">
import { BComponent } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BComponent v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BComponent>
</template>
```

**Key Points:**
1. Use `#[name]="slotProps"` to capture slot props from the underlying component
2. Use `v-bind="slotProps"` to forward those props to the parent slot
3. Add `inheritAttrs: false` to prevent double attribute binding
4. This pattern is essential for components like dropdowns where the parent passes data via slot props

**Example**: DDropdown must forward the `button-content` slot with its props so that DXDashboardNavbar can pass user data to render the avatar.

### Advanced: Slot Name Prefix Stripping

When forwarding slots with prefixes (e.g., `sidebar-brand` → `brand`), use computed properties for dynamic mapping:

```vue
<script setup lang="ts">
import { computed, useSlots } from 'vue';
import ChildComponent from './ChildComponent.vue';

const slots = useSlots();

// Strip 'sidebar-' prefix from slot names
const sidebarSlots = computed(() => {
  const result: Record<string, string> = {};
  Object.keys(slots).forEach(name => {
    if (name.startsWith('sidebar-')) {
      const strippedName = name.substring(8); // Remove 'sidebar-'
      result[strippedName] = name;
    }
  });
  return result;
});
</script>

<template>
  <ChildComponent>
    <!-- Dynamically forward sidebar-* slots with stripped names -->
    <template
      v-for="(originalName, strippedName) in sidebarSlots"
      :key="strippedName"
      #[strippedName]="slotProps"
    >
      <slot :name="originalName" v-bind="slotProps" />
    </template>
  </ChildComponent>
</template>
```

**Benefits:**
- Fully dynamic - no hardcoded slot names
- Scales automatically as new slots are added
- Type-safe with proper slot prop forwarding

**Example**: DXDashboard uses this pattern to forward `sidebar-brand` → `brand` and `navbar-menu-icon` → `menu-icon`.

### Icon Handling

Icons from unplugin-icons work differently in the library vs consuming apps:

**In consuming apps**, icons may need to be registered to avoid tree-shaking if using dynamic icon imports.

**In the library**, icons can be used directly:
```vue
<template>
  <i-bi-x-circle />
</template>
```

## Code Standards

- Use descriptive variable names
- Always use TypeScript for new components
- Use Composition API with `<script setup>` syntax
- Follow Vue 3 best practices
- Document complex components with JSDoc comments
- Keep components focused and single-purpose

### Documentation Examples

**CRITICAL**: All documentation examples MUST use only D* and DX* components.

- ✅ **Correct**: Import from `resources/js/components/base/DButton.vue`
- ❌ **Wrong**: Import from `bootstrap-vue-next`

**Why?**
- Examples demonstrate how consumers use the library
- `docs:dev` loads raw source files - if examples import from `bootstrap-vue-next`, they'll fail (404)
- Examples should only use the public API (D*/DX* components)

**If a child component isn't wrapped:**
1. Create the D* wrapper (e.g., `DCarouselSlide.vue` for `BCarouselSlide`)
2. Export from main index
3. Use the wrapper in examples

**The only place `bootstrap-vue-next` should appear:**
- Inside `resources/js/components/base/D*.vue` wrapper implementations

## Version Management

Releases go through **`npm run release <version>`** (`scripts/release.sh`), not
by hand. It builds, runs the headless suite and `vue-tsc`, bumps `package.json`
+ `package-lock.json`, commits, tags, pushes, creates the GitHub release and
publishes to npm — then *verifies all four artifacts exist* rather than trusting
exit codes. Packagist picks up the tag on its own.

Two things to do first, both enforced by its preflight:

1. **Cut the CHANGELOG.** Retitle `## [Unreleased]` to `## [<version>] - <date>`
   and add a fresh empty `## [Unreleased]` above it. The script reads that
   section as the release notes (tag annotation *and* GitHub release, so they
   can't disagree) and refuses to release without it — 0.39.1 shipped with no
   entry at all, back when nothing checked. Automating the cut is #178.
2. **Be logged in to npm as the package owner.** The designated publishing account is the sole
   owner of `@omnitend/dashboard-for-laravel`; other accounts fail with a
   confusing `E404 Not Found` on PUT rather than a permission error, because npm
   returns 404 for scopes you can't write to. `npm whoami` tells you who is
   logged in *now*, which is not evidence about who published previously — use
   `npm owner ls` for that.

**It is resumable: if it stops half-way, run the exact same command again.**
Every step checks whether it has already happened and skips if so, and the
confirmation prompt shows real state (`[done]`/`[todo]` per step) rather than a
fixed list. This matters because the irreversible steps come last, so a denied
SSH prompt or a dropped OTP used to leave the version bumped, committed, tagged
and pushed with nothing published — and re-running died at `npm version`. Both
0.39.1 and 0.40.0 wedged that way before #173.

The script is interactive (a confirm and npm's OTP), so an **agent cannot run
it** — prepare the release and hand the command to James.

Checking whether a publish landed: hit the registry directly
(`curl -s https://registry.npmjs.org/@omnitend%2Fdashboard-for-laravel`), not
`npm view` — the CLI caches, and a stale cache after a successful publish is
indistinguishable from a failed one.

## Common Tasks

### Adding a New D* Wrapper Component

1. Create file in `resources/js/components/base/DNewComponent.vue`
2. Import Bootstrap component and wrap it
3. Add dynamic slot forwarding and attribute inheritance
4. Export from main index file
5. Build: `npm run build`
6. Use in consuming apps: `import { DNewComponent } from '@omnitend/dashboard-for-laravel'`

### Adding a New Composable

1. Create file in `resources/js/composables/useNewFeature.ts`
2. Define TypeScript interfaces
3. Implement composable function
4. Export from main index file
5. Build: `npm run build`

### Modifying Theme

1. Edit `resources/css/theme.scss`
2. Build: `npm run build`
3. Changes will be in `dist/style.css`
4. Consuming apps will get updated styles on next build

## Known Issues and Solutions

### Testing gotchas (vitest browser mode)

Three things that cost real time and aren't derivable from the code:

- **Tests run in a real browser, so `node:fs` doesn't exist.** A test that reads
  a build artefact must import it through Vite — `import css from '../../dist/style.css?raw'`
  (see `scoped-deep-styles.test.ts`, `bundle/icon-font.test.ts`). Using `node:fs`
  doesn't error usefully; vitest just reports **"no tests"**, which reads like a
  glob problem and isn't.
- **bvn's option list only mounts once the user *types*.** Querying
  `[role="option"]` after `.focus()` or a click on the chevron returns `[]` even
  though `aria-expanded="true"` and the menu is visibly open in a screenshot.
  Drive it with `userEvent.click(input)` + `userEvent.fill(input, '…')`.
- **A localStorage per-page preference makes DXTable tests order-dependent.**
  `getInitialPerPage` prefers a stored value over the `perPage` prop, so a test
  that changes per-page silently breaks a *later* test's `:per-page="20"`. Clear
  `dxtable-perpage-<url>` (default key: `dxtable-perpage-table`) in a
  `beforeEach`. This is a real product wart too — see #124.

And the rule that matters most: **watch a new test fail against the unfixed code
before trusting it.** Two tests in the 0.24 run passed for the wrong reason and
certified live bugs as fixed — one swapped the form object where DXTable actually
mutates one in place, the other gave fixture rows both keys where real rows carry
one. Revert the fix, confirm red, then restore.

### `npm test` does NOT type-check — run `npm run typecheck` after any TS change

The `pretest*` hooks run **`build:lib`** (`vite build` = esbuild, which strips
types without checking them), so a green `npm test` / `npm run test:headless`
says **nothing** about TypeScript correctness. A `vue-tsc` error (e.g. spreading
a generic type param) sails straight through the suite and only fails the CI
**typecheck** step. Always run `npm run typecheck` yourself after touching `.ts`
/ `<script setup>` — the test suite won't catch it (bit us bumping `useForm` in
#150, 2026-07-19).

Related, from the same chronically-red-CI fix: **the `pretest*` hooks must run
the font-extract step, not a bare `vite build`.** Vite always inlines the icon
woff2 in lib mode; the `build:lib` script (`vite build` + `extract-icon-font.mjs`
+ the charts build) is the one true "build the shipped artifact" step, shared by
`build` and all `pretest*` so tests exercise the *extracted* stylesheet the #77
guard expects — never re-inlined by a stray `vite build`.

**LOCAL trap: the `pretest*` hooks do NOT run on this machine.** `~/.npmrc`
sets `ignore-scripts=true` (supply-chain hardening), and that also skips
`pre`/`post` hooks on explicit `npm run` — so a local `npm run test:headless`
tests **whatever stale `dist/` is on disk** (the bundle guards go vacuous or
fail against the previous build; caught 2026-07-20 when the #132 axios guard
"failed" against a pre-fix dist). Locally, always `npm run build:lib` before
the test run (release.sh now does this explicitly). CI is unaffected (hooks
run there). Explicitly-named scripts themselves still run — only their
`pre`/`post` companions are dropped.

**A test that reads a GENERATED, gitignored artifact must regenerate it in a
vitest `globalSetup`, not assume it's on disk.** `tests/docs/llms-txt.test.ts`
(#136) reads `docs/public/llms.txt` via Vite `?raw`, but that file is generated
by `docs:generate:ai` and gitignored (shipped only via the `files` list). The CI
test job builds `dist` (so `dist`-reading guards like the icon-font test work)
but does NOT generate the docs, and local `ignore-scripts` skips the pretest
hook — so the file was stale/absent and the guard went **red on CI while green
locally** (where `docs:build` had run). Fixed with `tests/global-setup.ts`
(wired via `test.globalSetup` in `vitest.config.ts`), which regenerates it (~0.6s)
before the browser suite. Cost a CI-red at the v0.34.0 merge, 2026-07-21. Any
future test reading a generated artifact should do the same — don't rely on
`dist`-style pretest builds to cover docs-derived files.

### The icon webfont must never be inlined again (#77)

`dist/style.css` used to be ~191 KB gzip, and **137 KB of that was one base64
font** — 72% of the stylesheet, carried by every consumer whether or not they
ever rendered a glyph.

The trap: **Vite ALWAYS inlines CSS-referenced assets as data URIs in library
mode.** `build.assetsInlineLimit` is documented as *ignored* when `build.lib` is
set, so setting it to `0` does nothing (this was tried). And base64-inlining a
woff2 is pathological — the format is already Brotli-compressed, base64 inflates
it by a third, and gzip recovers none of it.

`scripts/extract-icon-font.mjs` runs after `vite build`, writes the font out to
`dist/assets/bootstrap-icons-<hash>.woff2`, and rewrites the `url()`. Stylesheet
drops to **~53 KB gzip**, and the browser fetches the font **only when a `.bi-*`
glyph actually renders** — verified against the built docs: a page with icons
fetches it, pages without icons don't.

Nothing changes for consumers: a bundler resolves the relative `url()` out of
`node_modules`, a plain `<link>` resolves it next to the stylesheet.

The theme's bundled text fonts (Maven Pro, Poppins) go through the same
script; see "Typefaces" under Styling Guidelines.

Guarded by `tests/bundle/icon-font.test.ts`, because the failure mode is
**silent** — re-inlining still works, it just quietly triples the CSS again.
Don't "simplify" the build script away.

### Tree-Shaking Icons

**Issue**: Dynamic icon imports get tree-shaken by Vite
**Solution**: In consuming apps, create an icon registry with explicit imports to prevent tree-shaking

### Slot Forwarding Not Working

**Issue**: Wrapper component doesn't forward slots from parent
**Solution**: Use dynamic slot forwarding pattern: `<template v-for="(_, name) in $slots">`

### CSS Variables Not Working

**Issue**: Hardcoded colours in components
**Solution**: Always use `var(--bs-*)` CSS variables, never hardcoded hex values

### Overriding Bootstrap Vue Next component styling (theme.scss)

Two non-obvious gotchas when restyling BVN components in `theme.scss` (proven
during the v0.8.0 toast restyle and sidebar accordion):

- **Toast variants use Bootstrap's `.text-bg-*` helper, which is `!important`.**
  BVN maps `useToast().create({ variant })` to `.text-bg-{variant}`, and
  Bootstrap's `.text-bg-*` helpers set `background-color`/`color` with
  `!important` by design. So overriding a toast's variant background REQUIRES
  `!important` (a more-specific selector alone loses). This is the standard way
  to override a Bootstrap utility/helper, not a hack. The clean long-term route
  (no `!important`) is to wrap `useToast().create()` so `variant` becomes a
  custom class + theme via `--bs-toast-*` vars — tracked as an issue.
- **BVN wraps each toast in a `<span>`, defeating Bootstrap's toast spacing.**
  Bootstrap's built-in `.toast:not(:last-child)` gap doesn't apply because the
  toasts are no longer direct children of `.toast-container`. Put the gap on the
  `.toast` itself (`margin-bottom`), not on the fragile span wrapper.
- **CSS grid `0fr→1fr` collapse + Bootstrap `.nav` reflow.** `.nav` is
  `flex-wrap: wrap`; while a grid row collapses toward height 0, a wrapping
  flex-column can't stack its items in the tiny height and wraps them into
  side-by-side columns — a visible reflow flash. Add `flex-wrap: nowrap` to the
  collapsing list. (See `DXDashboardSidebar.vue`.)
- **A `<style scoped>` `:deep()` block on a `D*` wrapper whose ONLY root is the
  BVN component is INERT in consumer builds.** The scope-id (`data-v-x`) isn't
  reliably forwarded onto BVN's rendered root across the wrapper→BVN boundary,
  so `[data-v-x] .bvn-internal` matches no host once bundled — the CSS ships in
  `dist/style.css` but does nothing (bit us on #53/#54; the fix "worked" in the
  docs build yet was inert for a consumer). **Fix:** wrap the BVN component in a
  real element the wrapper owns and anchor the rules on it —
  `<div class="d-autocomplete"><BAutocomplete/></div>` +
  `.d-autocomplete :deep(…)`. A plain-element root always carries the scope-id.
  For popup/menu content BVN can **teleport** out of the component (e.g.
  `teleportTo`), even a real host won't help — put those rules in the **global**
  theme.scss (`.b-autocomplete-content { … }`), which applies regardless of
  teleport (#59). **Verify BVN-styling fixes at the DOM level** (dump the
  rendered DOM, confirm the scope-id lands on a host containing the target) or
  in a real consumer bundle — the docs Astro/Vite dev build can forward the
  scope-id and give a false-positive screenshot that a consumer's production
  Rollup build won't reproduce. Prefer driving `--bs-*` component variables
  (e.g. `--bs-btn-*`) over raw properties when restyling a BVN control.
  **Guard**: `tests/components/scoped-deep-styles.test.ts` renders every known
  `:deep()` site from the **built `dist/` bundle** and asserts the scope-id
  actually reaches the targeted element, plus a coverage check that fails if a
  new scoped `:deep()` shows up in any component that isn't in its
  `KNOWN_DEEP_TARGETS` list. A #58 audit against `dist/` found the current
  sites (DAutocomplete, DXField's switch, DXTable's `tbody tr`/`.pagination`,
  DXStatCard, DXDashboardSidebar's `.nav-link`) all forward correctly — even
  ones whose own template root is a `<B*>`/`D*` **component**, not a plain
  element (DXTable's root is `<DContainer>`, DXStatCard's is `<DCard>`) — so a
  component-only root is not an automatic failure; only DOM-level testing
  against the real build tells you either way. When adding a new `:deep()`
  rule, add it to `KNOWN_DEEP_TARGETS` and a DOM-level assertion in that file
  (rebuild first — the test reads the scope-id straight out of `dist/style.css`
  so it self-updates across unrelated style edits, no hardcoded hash).

### Bumping the vitest browser-mode family (vitest / @vitest/browser / @vitest/browser-playwright)

**Issue**: These three share a *tight, exact-version* peer cycle
(`@vitest/browser-playwright` peer-requires `@vitest/browser` **and** `vitest`
at the same exact version, and vice-versa). `npm install vitest@<new>` alone —
even listing all three with a caret — fails with `ERESOLVE` because npm clings
to the already-installed older version of one family member. Compounded by the
global `~/.npmrc` `min-release-age` (`before=<date>`), which can *hide the
newest patch of just one* of the three from the resolver, so npm can't assemble
a consistent set and the conflict looks inexplicable.

**Solution**:
1. Pick a patched version whose release of **all three** predates the
   `min-release-age` cutoff (check `npm config get before`; a version published
   after it is invisible to the resolver). Newer ≠ installable.
2. `npm uninstall vitest @vitest/browser @vitest/browser-playwright` first, then
   `npm install -D vitest@<v> @vitest/browser@<v> @vitest/browser-playwright@<v>`
   at the **same** version. The uninstall breaks the cyclic pin; the fresh
   install resolves cleanly. (`vitest-browser-vue` has a loose `^4.0.0-0` peer
   and rides along.)

### Bumping a dev dep that raises the Node floor (learned on Astro 5→7, #7)

A major dev-tooling bump can break CI in two non-obvious ways at once — the
Astro 5→7 bump did both, going red on `npm ci` before any test ran:

1. **Node floor.** Astro 7 requires **Node ≥ 22.12**, but the workflows ran Node
   18/20 → `npm ci` fails to even install. Bump every workflow's Node:
   `.github/workflows/test.yml` matrix to `[22.x, 24.x]`, `docs.yml` to `24`.
   (`docs.yml` runs `astro build`, so it *must* satisfy the floor or the Pages
   deploy fails after merge.)
2. **npm-version lockfile mismatch.** This Mac's `~/.npmrc` has a
   `min-release-age` cutoff, and the local **npm 11** (Node 24) writes a
   `lockfileVersion 3` lock that CI's **npm 10** (Node ≤22 default) rejects as
   out of sync (`npm error Missing: esbuild@… from lock file`) even though the
   entries are present — npm 10 and 11 disagree on how optional platform deps
   are recorded. Fixes: (a) add `- run: npm install -g npm@11` before `npm ci`
   in CI so every leg reads the lock the same way (no-op on Node 24), and
   (b) **regenerate the lock without the cutoff** — `npm install --userconfig
   <~/.npmrc minus the min-release-age line>` — so the full optional-deps tree
   is recorded. To keep the cooldown while regenerating, **pin the dep exact**
   (e.g. `"astro": "7.0.5"`, not `^`) so the clean install doesn't drift to a
   too-fresh version.

Verify with a real `npm ci` (not just `npm install`) using a clean, cutoff-free
config before pushing — `npm install` reports "in sync" locally while CI's
`npm ci` still fails.

## MCP Server - AI-Agent-Friendly Documentation

This project includes an MCP (Model Context Protocol) server that provides AI agents with structured access to documentation.

**Setup:** See [MCP_SERVER.md](MCP_SERVER.md) for complete setup instructions.

**Available Tools:**
- `list_components` - List/filter components by category or tag
- `get_component` - Get detailed API for a specific component
- `search_components` - Search components by keyword
- `get_guide` - Retrieve installation, forms, theming, typescript guides
- `get_overview` - Get complete llms.txt overview
- `get_docs_map` - Get hierarchical documentation structure

**Usage:**
```bash
npm run mcp  # Start MCP server
```

**Auto-Generated Files:**
All documentation files are auto-generated and kept in sync:
- `/llms.txt` - AI discovery standard (llmstxt.org)
- `/api-reference.json` - Machine-readable component API
- `/docs-map.md` - Hierarchical documentation overview

Run `npm run docs:generate:ai` to regenerate these files.

## Resources

- [Bootstrap Vue Next Documentation](https://bootstrap-vue-next.github.io/bootstrap-vue-next/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vite.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- Do not add "Generated with Claude Code" to commit messages (too noisy)