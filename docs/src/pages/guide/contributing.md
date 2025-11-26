---
layout: ../../layouts/DashboardLayout.astro
title: Contributing
---

# Contributing

This library is open source and welcomes contributions. Start here for setup, testing, and how to submit changes.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- PHP 8.2+ and Composer (for PHP utilities)

### Clone and Install

```bash
git clone https://github.com/omnitend/dashboard-for-laravel.git
cd dashboard-for-laravel
npm install
```

### Build the Package

```bash
# Build once
npm run build

# Watch mode (rebuilds on changes)
npm run dev
```

### Using with a Local Project

If you're developing this library alongside a consuming app, link them so you test the built package:

```bash
# In dashboard-for-laravel/
npm run build  # or npm run dev for watch mode
npm link

# In docs/ or your consuming app
npm link @omnitend/dashboard-for-laravel
```

## Running Tests

The project uses Vitest with browser mode for component testing. The test suite includes 110+ tests covering components and composables.

```bash
# Run tests in browser (visual mode)
npm test

# Run tests with Vitest UI
npm run test:ui

# Run tests headless (for CI)
npm run test:headless
```

## Type Checking

```bash
npm run typecheck
```

## Building Documentation

The documentation site uses Astro with Vue integration.

```bash
# Development server with hot reload
npm run docs:dev

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```

The docs site imports from the built package, so run `npm run build` first if you've made component changes.

## Project Structure

```
dashboard-for-laravel/
├── src/                    # PHP source (Laravel utilities)
├── resources/
│   ├── js/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Vue composables
│   │   └── types/          # TypeScript types
│   └── css/
│       └── theme.scss      # Bootstrap theme
├── dist/                   # Built package (generated)
├── docs/                   # Documentation site
└── tests/                  # Component tests
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm run test:headless`
5. Run type checking: `npm run typecheck`
6. Commit with a descriptive message
7. Push to your fork
8. Open a pull request

## Code Style

- Use TypeScript for new code
- Use Vue 3 Composition API with `<script setup>`
- Use CSS variables for colours (never hardcode hex values)
- Follow existing patterns in the codebase

## Adding Components

### D* Wrapper Components

Create wrapper components for Bootstrap Vue Next components in `resources/js/components/base/`:

```vue
<script setup lang="ts">
import { BComponent } from 'bootstrap-vue-next';

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BComponent v-bind="$attrs">
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BComponent>
</template>
```

### DX* Extended Components

Extended components go in `resources/js/components/extended/` and have their own logic beyond simple wrappers.

## Links

- [GitHub Repository](https://github.com/omnitend/dashboard-for-laravel)
- [Issue Tracker](https://github.com/omnitend/dashboard-for-laravel/issues)
- [Bootstrap Vue Next Docs](https://bootstrap-vue-next.github.io/bootstrap-vue-next/)
