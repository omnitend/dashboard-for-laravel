# Laravel Dashboard - Claude Code Instructions

## Project Overview

This is **@omnitend/dashboard-for-laravel**, a reusable full-stack component library for building Laravel dashboards with Vue 3, Inertia.js, and Bootstrap Vue Next.

**Package Type**: Dual package (NPM + Composer)
**NPM Package**: `@omnitend/dashboard-for-laravel`
**Composer Package**: `omnitend/dashboard-for-laravel`

## Purpose

This library provides:
1. **Vue 3 Components** - Reusable dashboard UI components
2. **D* Wrapper Components** - Type-safe wrappers around Bootstrap Vue Next (57 base components)
3. **DX* Extended Components** - Complex dashboard layouts, forms, stat cards, and charts (15 components)
4. **Form System** - Type-safe form handling with validation
5. **Composables** - Reusable Vue composition functions
6. **Theme** - Bootstrap 5 custom SCSS theme
7. **PHP Utilities** - Laravel helpers for API responses and form requests

**Total: 72 components** (57 base + 15 extended)

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
form.recentlySuccessful;  // boolean - was last submit successful?

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

### Semantic colour system (soft-first, since v0.27.0)

The library uses a **soft-first** semantic colour system built on the Omni Tend
brand. Respect it when adding or styling components — don't reach for a loud
solid fill by reflex.

- **Emphasis comes from weight and place, not loudness.** Only two variants are
  bold SOLID buttons: `primary` (the brand navy `#151e2d` fill + light text) and
  `danger` (red). `secondary`/`success`/`warning`/`info` buttons are **soft**
  (light same-hue tint + dark same-hue label). Tertiary actions use a `link`
  variant restyled as a **ghost** (body colour, no underline).
- **Status colours are soft** — badges, alerts, toasts all use the soft tint.
- **`success`/green means a positive _outcome_, not "save".** The main action is
  `primary`; a save's green reward belongs in a "Saved" toast, not the button.
- **Outline buttons / coloured links / `.text-*`** use each variant's *emphasis*
  shade (readable on white), which is also the base `$theme-color`.
- Everything is driven by the **`$dx-variants` map in `resources/css/theme.scss`**
  (one source of truth per variant: solid / soft / emphasis + solid-vs-soft
  button). All pairs are WCAG AA. Full spec + rationale:
  `plans/2026-07-18-semantic-colour-system.md`. Guarded by
  `tests/components/soft-badges.test.ts`.
- Design/review tooling: the **Style guide** (`docs /showcase`) and **Colour
  playground** (`docs /playground`).

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

When releasing a new version:

1. Update version in `package.json`
2. Update version in `composer.json` (if applicable)
3. Run `npm run build`
4. Test in your consuming applications
5. Commit and tag: `git tag v0.1.1`
6. Push: `git push --tags`
7. Publish to NPM: `npm publish`
8. Publish to Packagist (automatic if GitHub repo is registered)

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