# Contributing to Dashboard for Laravel

Thank you for considering contributing to Dashboard for Laravel! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:
- A clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Laravel version, Vue version, browser, etc.)

### Suggesting Features

Feature requests are welcome! Please create an issue describing:
- The feature you'd like to see
- Why it would be useful
- Examples of how it would be used

### Pull Requests

1. **Fork the repository** and create a branch from `main`
2. **Make your changes** following our code standards
3. **Add tests** for new functionality
4. **Run the test suite** to ensure everything passes
5. **Update documentation** if needed
6. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 18+
- PHP 8.2+
- Composer

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/dashboard-for-laravel.git
cd dashboard-for-laravel

# Install dependencies
npm install
composer install

# Install playground dependencies (optional)
cd playground
composer install
npm install
cd ..
```

### Running Tests

```bash
# Run tests in headless mode
npm run test:headless

# Run tests with UI (browser opens)
npm test

# Run TypeScript checks
npm run typecheck
```

### Building the Package

```bash
# Build once
npm run build

# Watch mode (rebuilds on changes)
npm run dev
```

### Documentation Development

```bash
# Start documentation site
npm run docs:dev

# Build documentation
npm run docs:build
```

## Code Standards

### TypeScript

- Use TypeScript for all new components
- Use Composition API with `<script setup>` syntax
- Define proper interfaces for props and emits

### Vue Components

- Always use descriptive variable names
- Use CSS variables (never hardcoded colors)
- Follow Vue 3 best practices
- Document complex components with JSDoc comments

### Testing

- Write tests for new features using Vitest Browser Mode
- Ensure all tests pass before submitting PR
- Aim for meaningful test coverage

### Styling

**Always use CSS variables from Bootstrap:**

```vue
<!-- Good -->
<style scoped>
.custom-class {
  color: var(--bs-primary);
  background: var(--bs-white);
}
</style>

<!-- Bad -->
<style scoped>
.custom-class {
  color: #4f46e5;  /* Never hardcode colors! */
}
</style>
```

### Git Commits

- Use clear, descriptive commit messages
- Format commit messages to 72 characters wide
- Reference issue numbers when applicable

**Good commit messages:**
```
Add delete functionality to DXTable modals

Features:
- Delete button in modal footer
- Confirmation dialog before deletion
- Success/error toast notifications

Fixes #123
```

## Component Guidelines

### Creating Wrapper Components (D*)

All Bootstrap Vue Next components should be wrapped:

```vue
<script setup lang="ts">
import { BComponent } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BComponent v-bind="$attrs">
    <!-- Dynamically forward all slots -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BComponent>
</template>
```

### Creating Extended Components (DX*)

Extended components should:
- Provide specific dashboard functionality
- Include comprehensive documentation
- Have full TypeScript support
- Include usage examples

## Questions?

Feel free to open an issue for discussion or ask questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
