# Documentation System - Claude Code Instructions

## Overview

This documentation site is built with Astro, Vue 3, and MDX. It provides live, interactive examples for all components in the `@omnitend/dashboard-for-laravel` package with automatic code extraction and syntax highlighting.

## Current State

### Coverage
- **46 Base Components** (D* prefix) - 100% documented
- **6 Extended Components** (DX* prefix) - 100% documented
- **Total: 52 components** with live examples and automatic code syncing

### Key Features
1. **Automatic Code Extraction** - Uses Vite's `?raw` import to extract source code from example files
2. **Vue Syntax Highlighting** - Highlight.js with Vue/JavaScript/TypeScript/CSS language support
3. **Live Interactive Examples** - All examples are fully functional Vue components
4. **Single Source of Truth** - Code examples are always in sync with actual implementation
5. **Collapsible Code Blocks** - Users can show/hide code with copy functionality
6. **Static Navigation** - Uses static config for better maintainability
7. **SSR Compatible** - Components use `client:load` with proper SSR guards for localStorage/document access

## Architecture

### File Structure

```
docs/
├── src/
│   ├── components/
│   │   ├── ComponentExample.vue          # Wrapper for examples (live preview + code)
│   │   ├── DashboardLayoutWrapper.vue    # Main layout with sidebar/navbar
│   │   ├── PropsTable.vue                # Props documentation table
│   │   ├── EventsTable.vue               # Events documentation table
│   │   └── SlotsTable.vue                # Slots documentation table
│   ├── examples/
│   │   ├── DButtonExample.vue            # Example for DButton
│   │   ├── DCardExample.vue              # Example for DCard
│   │   └── ... (46 base + 6 extended)
│   ├── layouts/
│   │   └── DashboardLayout.astro         # Base layout for all pages
│   └── pages/
│       └── components/
│           ├── base/
│           │   ├── DButton.mdx           # Documentation for DButton
│           │   ├── DCard.mdx             # Documentation for DCard
│           │   └── ... (46 components)
│           └── extended/
│               ├── DXBasicForm.mdx       # Documentation for DXBasicForm
│               └── ... (6 components)
├── public/
│   ├── logo.svg                          # Dashboard for Laravel logo
│   └── favicon.svg                       # Site favicon
└── CLAUDE.md                             # This file
```

## How It Works

### Automatic Code Extraction

The documentation uses Vite's `?raw` import feature to automatically extract source code from example Vue files:

**Example File** (`docs/src/examples/DButtonExample.vue`):
```vue
<template>
  <div class="button-examples">
    <DButton variant="primary">Primary</DButton>
    <DButton variant="secondary">Secondary</DButton>
  </div>
</template>

<script setup lang="ts">
import DButton from '../../../resources/js/components/base/DButton.vue';
</script>
```

**Documentation Page** (`docs/src/pages/components/base/DButton.mdx`):
```mdx
---
layout: ../../../layouts/DashboardLayout.astro
title: DButton
---

import ComponentExample from '../../../components/ComponentExample.vue';
import DButtonExample from '../../../examples/DButtonExample.vue';
import DButtonExampleRaw from '../../../examples/DButtonExample.vue?raw';

# DButton

DButton - A type-safe wrapper around Bootstrap Vue Next's BButton component

## Live Examples

<ComponentExample
  client:load
  code={DButtonExampleRaw}
>
  <DButtonExample client:load />
</ComponentExample>

## Slots

This component forwards all slots dynamically from the underlying Bootstrap Vue Next component.

## Bootstrap Vue Next Wrapper

This is a lightweight type-safe wrapper around the corresponding Bootstrap Vue Next component.
It provides API stability and forwards all props, events, and slots.

**For complete API documentation** (props, events, methods), refer to the [Bootstrap Vue Next documentation](https://bootstrap-vue-next.github.io/bootstrap-vue-next/).
```

**Key Points:**
1. Import the example component normally: `import DButtonExample from '...'`
2. Import the raw source code: `import DButtonExampleRaw from '...?raw'`
3. Pass raw source to `ComponentExample`: `code={DButtonExampleRaw}`
4. Render the live example: `<DButtonExample client:load />`

### ComponentExample Component

The `ComponentExample.vue` component provides the live preview and code display functionality.

**Features:**
- Live preview area showing the rendered component
- Collapsible code block with syntax highlighting
- Copy-to-clipboard functionality
- Prism.js syntax highlighting for Vue/JavaScript/Markup

**Usage:**
```vue
<ComponentExample
  client:load
  code={rawSourceCode}
  language="vue"
>
  <YourExampleComponent client:load />
</ComponentExample>
```

**Props:**
- `code: string` - The raw source code (from `?raw` import)
- `language?: string` - Language for syntax highlighting (default: 'vue')

### Syntax Highlighting

**Library:** Highlight.js (replaced Prism.js for better Vue SFC support)

Configured languages:
- `xml` - HTML/XML syntax (registered as 'vue' for template highlighting)
- `javascript` - JavaScript syntax
- `typescript` - TypeScript syntax
- `css` - CSS/SCSS syntax

**Theme:** `atom-one-dark.css` (dark theme with excellent contrast)

**Why Highlight.js over Prism.js?**
- Better Vue Single File Component (SFC) support
- Highlights template, script, and style sections correctly
- Active maintenance and better ecosystem

## Adding New Component Documentation

### 1. Create Example File

Create `docs/src/examples/D{ComponentName}Example.vue`:

```vue
<template>
  <div class="{component-name}-examples">
    <div class="example-section">
      <h5>Basic Usage</h5>
      <D{ComponentName} variant="primary">Example</D{ComponentName}>
    </div>

    <div class="example-section">
      <h5>Variants</h5>
      <D{ComponentName} variant="success">Success</D{ComponentName}>
      <D{ComponentName} variant="danger">Danger</D{ComponentName}>
    </div>
  </div>
</template>

<script setup lang="ts">
import D{ComponentName} from '../../../resources/js/components/base/D{ComponentName}.vue';
</script>

<style scoped>
.{component-name}-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
```

**Guidelines for Examples:**
- Use meaningful demo data (no placeholders like "Content goes here")
- Demonstrate multiple variants and use cases
- Use Vue 3 Composition API with `<script setup>`
- Use CSS variables for styling (never hardcoded colours)
- Keep examples focused and clear

### 2. Create Documentation Page

Create `docs/src/pages/components/base/D{ComponentName}.mdx`:

```mdx
---
layout: ../../../layouts/DashboardLayout.astro
title: D{ComponentName}
---

import ComponentExample from '../../../components/ComponentExample.vue';
import D{ComponentName}Example from '../../../examples/D{ComponentName}Example.vue';
import D{ComponentName}ExampleRaw from '../../../examples/D{ComponentName}Example.vue?raw';

# D{ComponentName}

D{ComponentName} - A type-safe wrapper around Bootstrap Vue Next's B{ComponentName} component. {Brief description of what it does}

## Live Examples

<ComponentExample
  client:load
  code={D{ComponentName}ExampleRaw}
>
  <D{ComponentName}Example client:load />
</ComponentExample>

## Slots

This component forwards all slots dynamically from the underlying Bootstrap Vue Next component.

## Bootstrap Vue Next Wrapper

This is a lightweight type-safe wrapper around the corresponding Bootstrap Vue Next component.
It provides API stability and forwards all props, events, and slots.

**For complete API documentation** (props, events, methods), refer to the [Bootstrap Vue Next documentation](https://bootstrap-vue-next.github.io/bootstrap-vue-next/).
```

### 3. Verify

1. Start the dev server: `npm run docs:dev`
2. Navigate to `http://localhost:4321/components/base/d{componentname}`
3. Verify:
   - Live example renders correctly
   - Code block shows the actual source code
   - Syntax highlighting works
   - Copy button functions

## Extended Components Documentation

For extended components (DX* prefix), the pattern is the same but with additional tables for props, events, and slots:

```mdx
---
layout: ../../../layouts/DashboardLayout.astro
title: DX{ComponentName}
---

import ComponentExample from '../../../components/ComponentExample.vue';
import PropsTable from '../../../components/PropsTable.vue';
import EventsTable from '../../../components/EventsTable.vue';
import SlotsTable from '../../../components/SlotsTable.vue';
import DX{ComponentName}Example from '../../../examples/DX{ComponentName}Example.vue';
import DX{ComponentName}ExampleRaw from '../../../examples/DX{ComponentName}Example.vue?raw';

# DX{ComponentName}

{Description of the component}

## Live Examples

<ComponentExample
  client:load
  code={DX{ComponentName}ExampleRaw}
>
  <DX{ComponentName}Example client:load />
</ComponentExample>

## Props

<PropsTable client:load :props={[
  { name: 'propName', type: 'string', default: '\'default\'', description: 'Description of the prop' },
  // ... more props
]} />

## Events

<EventsTable client:load :events={[
  { name: 'eventName', parameters: 'param: Type', description: 'Description of the event' },
  // ... more events
]} />

## Slots

<SlotsTable client:load :slots={[
  { name: 'slotName', props: 'slotProp: Type', description: 'Description of the slot' },
  // ... more slots
]} />
```

## Styling Guidelines

### CSS Variables Only

**NEVER hardcode colour values**. Always use CSS variables from Bootstrap or custom theme.

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

- **Colours**: `--bs-primary`, `--bs-secondary`, `--bs-success`, `--bs-danger`, `--bs-warning`, `--bs-info`, `--bs-light`, `--bs-dark`, `--bs-white`
- **Navigation**: `--bs-nav-link-color`, `--bs-nav-link-hover-color`
- **Borders**: `--bs-border-color`, `--bs-border-radius`
- **Spacing**: `--bs-gutter-x`, `--bs-gutter-y`

## Vue Component Hydration

The docs site uses `client:load` for the DashboardLayoutWrapper component:

**Implementation:**
```astro
<DashboardLayoutWrapper
  client:load
  navigation={navigation}
  currentUrl={currentPath}
>
  <slot />
</DashboardLayoutWrapper>
```

**Why `client:load`?**
- Enables SSR for better initial page load performance
- Component renders on server, then hydrates on client
- Works reliably with traditional page navigation
- Requires SSR guards for localStorage/document access

**SSR Guards:**
DXDashboard component includes guards for browser-only APIs:
```javascript
if (typeof window === 'undefined') {
  // Skip during SSR
  return defaultValue;
}
```

### Static Navigation Configuration

Navigation is defined statically in `docs/src/config/navigation.ts` instead of using deprecated `Astro.glob`:

**File:** `docs/src/config/navigation.ts`
```typescript
export const navigationConfig: Navigation = [
  {
    label: 'Base Components',
    items: [
      { label: 'DButton', url: '/components/base/dbutton' },
      { label: 'DCard', url: '/components/base/dcard' },
      // ... all components
    ],
  },
  // ... more groups
];

export function getNavigationWithActive(currentPath: string): Navigation {
  // Normalizes URLs (lowercase, removes trailing slashes)
  // Marks active page
}
```

**Benefits:**
- ✅ No Astro.glob deprecation warnings
- ✅ Full control over navigation order
- ✅ Easier to maintain
- ✅ Better for documentation sites

### Sidebar State Management

**Sidebar visibility persists across page loads using localStorage:**

1. **Inline Script** (runs before first paint to prevent flicker):
```javascript
// Sets HTML class from localStorage before page renders
if (localStorage.getItem('dashboard-sidebar-hidden') === 'false') {
  document.documentElement.classList.add('sidebar-visible');
}
```

2. **Vue Component** (manages state after hydration):
```typescript
// Reads localStorage and syncs HTML class
// Includes SSR guard for server-side rendering
const getInitialHiddenState = (): boolean => {
  if (typeof window === 'undefined') {
    return !props.dashboardId; // SSR default
  }

  const isHidden = JSON.parse(localStorage.getItem('dashboard-sidebar-hidden'));

  // Sync HTML class with localStorage
  if (isHidden) {
    document.documentElement.classList.remove('sidebar-visible');
  } else {
    document.documentElement.classList.add('sidebar-visible');
  }

  return isHidden;
};
```

**CSS Control:**
```css
.dashboard-sidebar {
  display: none !important;
}

html.sidebar-visible .dashboard-sidebar {
  display: block !important;
}
```

### Sidebar Navigation Features

- **Hidden state** - Completely hide the sidebar (not just collapse)
- **LocalStorage persistence** - Sidebar state persists across sessions and page loads
- **Scroll-to-active** - Automatically scrolls to the active page
  - Initial load: Instant scroll (no animation)
  - Navigation: Smooth scroll for better UX
- **URL normalization** - Handles trailing slashes and case differences
- **Exact matching** - Uses exact URL matching for active state

### Search Functionality

**Important:** Search only works after a production build. The search index is generated by Pagefind during the build process.

**Development mode:**
- Search input is visible but shows "Search available after build" placeholder
- 404 error for `/pagefind/pagefind.js` is expected and harmless
- The Search component gracefully handles the missing pagefind library

**Production mode:**
1. Run `npm run docs:build`
2. Pagefind integration indexes all content
3. Generates `/pagefind/` directory in `docs/dist/`
4. Search becomes fully functional

Search results container is wider than the input for better readability:

```css
.search-results {
  width: 600px;
  max-width: 90vw;  /* Responsive on mobile */
}
```

### Logo and Branding

- **Logo**: `/docs/public/logo.svg` (Laravel-style dashboard icon in red #E15540)
- **Favicon**: `/docs/public/favicon.svg` (same as logo)
- **Title**: "Dashboard for Laravel"

Logo is displayed in the sidebar brand slot and is always visible (both collapsed and expanded states).

## Building for Production

```bash
# Build the documentation site
npm run docs:build

# Preview the built site
npm run docs:preview
```

The built site will be in `docs/dist/`.

**What happens during build:**
1. Astro builds all pages and static assets
2. Pagefind integration runs automatically (`astro:build:done` hook)
3. Pagefind indexes all content and creates search index in `docs/dist/pagefind/`
4. Search functionality becomes available in the built site

**Requirements:**
- `pagefind` must be installed as a dev dependency
- Pagefind integration is configured in `docs/pagefind.integration.mjs`
- Integration is imported in `astro.config.mjs`
- `data-pagefind-body` attribute must be in Astro layout (not Vue component)

**Critical:** The `data-pagefind-body` attribute must be in the **Astro layout** file where it's server-rendered into static HTML:

```astro
<!-- docs/src/layouts/DashboardLayout.astro -->
<DashboardLayoutWrapper client:only="vue">
  <div data-pagefind-body>
    <slot />
  </div>
</DashboardLayoutWrapper>
```

**Why not in the Vue component?**
- Vue component uses `client:load` which renders on server first
- Pagefind runs during build and needs the attribute in static HTML
- The attribute must be in the Astro layout for pagefind to find it

## Common Issues and Solutions

### Issue: Code not syncing with example

**Cause:** Manually typed code in MDX instead of using `?raw` import

**Solution:** Always use the `?raw` import pattern:
```mdx
import ExampleRaw from '../../../examples/Example.vue?raw';
<ComponentExample code={ExampleRaw}>
```

### Issue: Syntax highlighting not working

**Cause:** Missing Highlight.js language imports in `ComponentExample.vue`

**Solution:** Ensure these imports are present:
```typescript
import hljs from 'highlight.js/lib/core';
import vue from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import 'highlight.js/styles/atom-one-dark.css';

// Register languages
hljs.registerLanguage('vue', vue);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('css', css);
```

### Issue: useToast not found error

**Cause:** `useToast` is not exported from bootstrap-vue-next in the version we're using

**Solution:** For DToast/DToaster examples, demonstrate the components visually without the composable, or provide usage notes explaining how to use them with the composable in actual applications.

### Issue: 404 error for /pagefind/pagefind.js

**Cause 1:** Search functionality only works after production build. Pagefind generates the search index during the build process, not in dev mode.

**Solution:** This is expected and harmless in development. The Search component gracefully handles the missing library:
- In dev: Shows "Search available after build" placeholder
- After build: Full search functionality

**Cause 2:** Pagefind failed to build index because `data-pagefind-body` attribute is missing or in wrong location.

**Solution:** Ensure `data-pagefind-body` is in the Astro layout (server-rendered HTML), not inside Vue component:

```astro
<!-- CORRECT: In Astro layout -->
<DashboardLayoutWrapper client:only="vue">
  <div data-pagefind-body>
    <slot />
  </div>
</DashboardLayoutWrapper>

<!-- WRONG: Inside Vue component with client:only -->
<template>
  <div data-pagefind-body>  <!-- Won't work! Not in static HTML -->
    <slot />
  </div>
</template>
```

To test search:
```bash
npm run docs:build
npm run docs:preview
```

Verify pagefind ran successfully by checking build output for:
```
Found a data-pagefind-body element on the site.
Indexed X pages
```

## Development Workflow

1. **Start dev server**: `npm run docs:dev`
2. **Create example file**: `docs/src/examples/D{ComponentName}Example.vue`
3. **Create MDX page**: `docs/src/pages/components/base/D{ComponentName}.mdx`
4. **Use automatic code extraction**: Import with `?raw` suffix
5. **Verify in browser**: `http://localhost:4321/components/base/d{componentname}`
6. **Check for errors**: Look for build errors in terminal

## Maintenance

### Updating an Example

1. Edit the example file in `docs/src/examples/`
2. The code block in the documentation will automatically update (thanks to `?raw` import)
3. No need to manually update the MDX file

### Adding New Components

Follow the "Adding New Component Documentation" section above.

### Updating Layout

The main layout is in `docs/src/components/DashboardLayoutWrapper.vue` and uses:
- `DXDashboardSidebar` for the sidebar
- `DXDashboardNavbar` for the top navbar
- Custom logo in the sidebar brand slot
- Hamburger icon in navbar for toggling sidebar

## Key Technical Decisions

### Why `client:load` with SSR Guards?
- Enables server-side rendering for better initial page load
- Prevents blank screens on direct page loads
- Requires SSR guards (`typeof window === 'undefined'`) for browser APIs
- Works reliably without ClientRouter complexity

### Why No ClientRouter?
- Traditional page navigation is simpler and more reliable
- ClientRouter + nested Vue islands caused hydration issues in dev mode
- Page loads are fast enough with Astro's optimizations
- Sidebar state persists correctly with localStorage + inline script

### Why Static Navigation Config?
- `Astro.glob` is deprecated in favour of Content Collections
- Content Collections complex for simple docs site
- Static config is cleaner, more maintainable, no deprecation warnings
- Full control over order and organization

### Why Highlight.js over Prism.js?
- Better Vue SFC support (Prism.js issue open since 2018)
- Highlights template, script, and style sections correctly
- Simpler API, active maintenance

## Resources

- [Astro Documentation](https://docs.astro.build/)
- [MDX Documentation](https://mdxjs.com/)
- [Highlight.js Documentation](https://highlightjs.org/)
- [Bootstrap Vue Next Documentation](https://bootstrap-vue-next.github.io/bootstrap-vue-next/)
- [Vite `?raw` Import](https://vitejs.dev/guide/assets.html#importing-asset-as-string)
