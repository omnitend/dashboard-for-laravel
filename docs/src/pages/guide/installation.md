---
layout: ../../layouts/DashboardLayout.astro
title: Installation
---

# Installation

## NPM Package

```bash
npm install @omnitend/dashboard-for-laravel
```

## Composer Package

Install the PHP utilities via Composer:

```bash
composer require omnitend/dashboard-for-laravel
```

## Import Styles

The theme CSS is required for component styling. Import it in your main entry file:

```typescript
import '@omnitend/dashboard-for-laravel/theme.css'
```

This includes Bootstrap styles and all Vue component styles.

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
- [Contributing Guide](/guide/contributing) - Development setup and contributing
