---
layout: ../../layouts/DashboardLayout.astro
title: Theming
---

# Theming

The library includes a custom Bootstrap 5 theme that can be easily customised using CSS variables and SCSS.

## CSS Variables

Always use CSS variables from Bootstrap or the theme instead of hardcoding colour values for better maintainability and theme consistency.

### Good Practice

```vue
<style scoped>
.custom-component {
  background-color: var(--bs-primary);
  color: var(--bs-white);
  border-color: var(--bs-border-color);
}
</style>
```

### Bad Practice

```vue
<style scoped>
.custom-component {
  background-color: #4f46e5;  /* Never do this! */
  color: #ffffff;
}
</style>
```

## Common CSS Variables

### Colours

From Bootstrap 5:

```css
--bs-primary
--bs-secondary
--bs-success
--bs-danger
--bs-warning
--bs-info
--bs-light
--bs-dark
--bs-white
```

### Navigation

```css
--bs-nav-link-color
--bs-nav-link-hover-color
--bs-nav-link-active-color
```

### Borders

```css
--bs-border-color
--bs-border-radius
```

### Spacing

```css
--bs-gutter-x
--bs-gutter-y
```

## Customising the Theme

To customise the theme, create your own SCSS file that overrides Bootstrap variables:

```scss
// custom-theme.scss

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

## Theme Structure

The library's theme is located in `resources/css/theme.scss`:

```scss
// Override Bootstrap variables
$primary: #4f46e5;
$secondary: #64748b;

// Import Bootstrap
@import 'bootstrap/scss/bootstrap';

// Custom component styles
.custom-class {
  colour: var(--bs-primary);
}
```

## Dark Mode Support

Bootstrap 5.3 includes built-in dark mode support. The library components automatically support dark mode:

```html
<!-- Enable dark mode -->
<html data-bs-theme="dark">
  <!-- Your app -->
</html>
```

You can toggle dark mode dynamically:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const darkMode = ref(false)

const toggleDarkMode = () => {
  darkMode.value = !darkMode.value
  document.documentElement.setAttribute(
    'data-bs-theme',
    darkMode.value ? 'dark' : 'light'
  )
}
</script>

<template>
  <OButton @click="toggleDarkMode">
    Toggle Dark Mode
  </OButton>
</template>
```

## Component-Specific Styling

### DashboardSidebar

The sidebar uses CSS variables for colours:

```css
.sidebar {
  background-color: var(--bs-dark);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-link {
  color: var(--bs-nav-link-color);
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
```

### DashboardNavbar

The user avatar styling:

```css
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bs-dark);
  color: var(--bs-white);
}
```

## Responsive Design

Use Bootstrap's responsive utilities:

```vue
<template>
  <!-- Hidden on mobile, visible on desktop -->
  <div class="d-none d-md-block">
    Desktop content
  </div>

  <!-- Visible on mobile, hidden on desktop -->
  <div class="d-md-none">
    Mobile content
  </div>
</template>
```

## Best Practices

1. **Always use CSS variables** - Never hardcode colour values
2. **Follow Bootstrap conventions** - Use Bootstrap classes when possible
3. **Scope your styles** - Use `scoped` in Vue components
4. **Test dark mode** - Ensure components work in both light and dark modes
5. **Use British spelling** - `colour` not `color` in comments and documentation

## Troubleshooting

### Styles not applying

Make sure you've imported the theme CSS:

```typescript
import '@omni-tend/laravel-dashboard/theme.css'
```

### Component styles missing

You must import `theme.css` (built CSS), not `theme.scss` (source). See the [Installation guide](/guide/installation#import-styles) for details.

### Dark mode not working

Ensure you're setting the `data-bs-theme` attribute on the `<html>` element:

```html
<html data-bs-theme="dark">
```

## Next Steps

- [Component Reference](/components/) - Browse styled components
- [Examples](/examples/common-patterns) - See theming in action
