# Laravel Dashboard - Claude Code Instructions

## Project Overview

This is **@omni-tend/dashboard-for-laravel**, a reusable full-stack component library for building Laravel dashboards with Vue 3, Inertia.js, and Bootstrap Vue Next.

**Package Type**: Dual package (NPM + Composer)
**NPM Package**: `@omni-tend/dashboard-for-laravel`
**Composer Package**: `omni-tend/dashboard-for-laravel`

## Purpose

This library provides:
1. **Vue 3 Components** - Reusable dashboard UI components
2. **D* Wrapper Components** - Type-safe wrappers around Bootstrap Vue Next (53 base components)
3. **DX* Extended Components** - Complex dashboard layouts and forms (6 components)
4. **Form System** - Type-safe form handling with validation
5. **Composables** - Reusable Vue composition functions
6. **Theme** - Bootstrap 5 custom SCSS theme
7. **PHP Utilities** - Laravel helpers for API responses and form requests

**Total: 59 components** (53 base + 6 extended)

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

### Using in Local Projects

When developing this library alongside consuming apps:

**Option 1: npm link**
```bash
# In dashboard-for-laravel/
npm run build  # or npm run dev for watch mode
npm link

# In your consuming app
npm link @omni-tend/dashboard-for-laravel
```

**Option 2: File reference**
In the consuming app's package.json:
```json
{
  "dependencies": {
    "@omni-tend/dashboard-for-laravel": "file:../dashboard-for-laravel"
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
npm link @omni-tend/dashboard-for-laravel
```

**How it works:**
- Docs import from `@omni-tend/dashboard-for-laravel` (the package)
- `npm link` creates a symlink: `docs/node_modules/@omni-tend/dashboard-for-laravel` → root
- Changes require rebuilding: `npm run build` (or `npm run dev` for watch mode)
- This ensures docs consume the library exactly like end users would

**Important:**
- Docs should NEVER import from `../../../resources/js` directly
- All imports must be from `@omni-tend/dashboard-for-laravel`
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
  logoutUrl?: string;         // Default: '/logout'
}
```

**Slots:**
- `#user-icon="{ initial }"` - Custom user icon/avatar

**Avatar Styling:**
```vue
<style scoped>
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bs-dark);
  color: var(--bs-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}
</style>
```

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
import { useForm, DXBasicForm } from '@omni-tend/dashboard-for-laravel';

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
  logoutUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  logoutUrl: '/logout',
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
import { DButton, DCard, useForm } from '@omni-tend/dashboard-for-laravel';
import '@omni-tend/dashboard-for-laravel/theme.css';
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
6. Use in consuming apps: `import { ONewComponent } from '@omni-tend/dashboard-for-laravel'`

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

### Tree-Shaking Icons

**Issue**: Dynamic icon imports get tree-shaken by Vite
**Solution**: In consuming apps, create an icon registry with explicit imports to prevent tree-shaking

### Slot Forwarding Not Working

**Issue**: Wrapper component doesn't forward slots from parent
**Solution**: Use dynamic slot forwarding pattern: `<template v-for="(_, name) in $slots">`

### CSS Variables Not Working

**Issue**: Hardcoded colours in components
**Solution**: Always use `var(--bs-*)` CSS variables, never hardcoded hex values

## Resources

- [Bootstrap Vue Next Documentation](https://bootstrap-vue-next.github.io/bootstrap-vue-next/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vite.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
