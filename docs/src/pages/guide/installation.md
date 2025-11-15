---
layout: ../../layouts/DashboardLayout.astro
title: Installation
---

# Installation

## NPM Package

Install via npm:

```bash
npm install @omnitend/dashboard-for-laravel
```

Or with yarn:

```bash
yarn add @omnitend/dashboard-for-laravel
```

## Composer Package

Install the PHP utilities via Composer:

```bash
composer require omni-tend/dashboard-for-laravel
```

## Import Styles

Import the theme CSS in your main entry file:

```typescript
import '@omnitend/dashboard-for-laravel/theme.css'
```

::: warning Important: Use Built CSS, Not Source SCSS
Always import `theme.css` (the built CSS), not `theme.scss` (the source).

**Why?**
- `dist/style.css` contains **both** Bootstrap theme styles **and** Vue component scoped styles
- Component scoped styles (e.g., `.user-avatar[data-v-xxx]`) are extracted during the Vite build
- Importing `theme.scss` directly gives you only Bootstrap, missing all component styles
:::

## Import Components

Import components as needed:

```typescript
import { DButton, DCard, useForm } from '@omnitend/dashboard-for-laravel'
```

Or import everything:

```typescript
import * as Dashboard from '@omnitend/dashboard-for-laravel'
```

## TypeScript Support

The library includes full TypeScript declarations. Types are automatically available when you import components.

```typescript
import type { FieldDefinition, UseFormReturn } from '@omnitend/dashboard-for-laravel'
```

## Vite Configuration

If you're using this library in a consuming app with Vite, you may need to add it to `optimizeDeps`:

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['@omnitend/dashboard-for-laravel']
  }
})
```

## Laravel Integration

### Register Service Provider

The service provider is auto-discovered, but you can manually register it in `config/app.php`:

```php
'providers' => [
    // ...
    OmniTend\LaravelDashboard\LaravelDashboardServiceProvider::class,
],
```

### Use PHP Utilities

```php
use OmniTend\LaravelDashboard\Http\Requests\BaseFormRequest;
use OmniTend\LaravelDashboard\Traits\HasApiResponses;

class UserController extends Controller
{
    use HasApiResponses;

    public function store(CreateUserRequest $request)
    {
        $user = User::create($request->validated());

        return $this->successResponse($user, 'User created successfully');
    }
}
```

## Development Setup

If you're developing this library alongside consuming apps:

### Using npm link

```bash
# In dashboard-for-laravel/
npm run build  # or npm run dev for watch mode
npm link

# In your consuming app
npm link @omnitend/dashboard-for-laravel
```

### Using File Reference

In the consuming app's `package.json`:

```json
{
  "dependencies": {
    "@omnitend/dashboard-for-laravel": "file:../dashboard-for-laravel"
  }
}
```

Then run:

```bash
npm install
```

## Verifying Installation

Create a test component to verify everything works:

```vue
<script setup lang="ts">
import { DButton } from '@omnitend/dashboard-for-laravel'
import '@omnitend/dashboard-for-laravel/theme.css'
</script>

<template>
  <DButton variant="primary">
    It works!
  </DButton>
</template>
```

If you see a styled button, you're all set!

## Next Steps

- [Getting Started Guide](/guide/getting-started) - Learn core concepts
- [Theming Guide](/guide/theming) - Customise the theme
- [Component Reference](/components/) - Browse available components
