---
layout: ../../layouts/DashboardLayout.astro
title: Getting Started
---

# Getting Started

> **Alpha Notice:** This library is in active development (v0.x). APIs may change between minor versions.

Dashboard for Laravel is a Vue 3 component library for building admin dashboards with Laravel, Inertia.js, and Bootstrap.

Built and maintained by [Omni Tend](https://omnitend.com), used internally in production applications.

## What's Included

- **61 Vue 3 components** (55 base + 6 extended)
- **D* Wrapper Components** - Type-safe wrappers around [Bootstrap Vue Next](https://bootstrap-vue-next.github.io/bootstrap-vue-next/)
- **DX* Extended Components** - Dashboard layouts, forms, and tables
- **Form System** - Type-safe form handling with validation
- **Composables** - `useForm` and other utilities
- **Theme** - Bootstrap 5 SCSS theme
- **PHP Utilities** - Laravel helpers for API responses and form requests

## Quick Start

Install the package:

```bash
npm install @omnitend/dashboard-for-laravel
```

Import the CSS (required):

```typescript
import '@omnitend/dashboard-for-laravel/theme.css'
```

Use components:

```vue
<script setup lang="ts">
import { DCard, DButton, useForm } from '@omnitend/dashboard-for-laravel'

const form = useForm({
  name: '',
  email: '',
})

const handleSubmit = async () => {
  await form.post('/api/users')
}
</script>

<template>
  <DCard>
    <template #header>
      <h3>Create User</h3>
    </template>

    <form @submit.prevent="handleSubmit">
      <input v-model="form.data.name" placeholder="Name" />
      <input v-model="form.data.email" placeholder="Email" />
      <DButton type="submit" variant="primary">Save</DButton>
    </form>
  </DCard>
</template>
```

## D* Wrapper Components

All Bootstrap Vue Next components are wrapped in D* components. This provides:

- Type safety with TypeScript
- Consistent API
- Proper slot and prop forwarding

For example, `BButton` becomes `DButton`, `BCard` becomes `DCard`.

For complete prop documentation, refer to the [Bootstrap Vue Next docs](https://bootstrap-vue-next.github.io/bootstrap-vue-next/).

## DX* Extended Components

Extended components provide dashboard-specific functionality:

- **DXDashboard** - Complete dashboard layout with sidebar and navbar
- **DXTable** - Data table with pagination, sorting, and modals
- **DXForm** / **DXBasicForm** - Form builders from field definitions

## Form System

The `useForm` composable provides:

- Form state management
- HTTP methods (post, put, patch, delete)
- Validation error handling
- Processing state

```typescript
const form = useForm({ name: '', email: '' })

// Submit
await form.post('/api/users')

// State
form.processing   // boolean
form.errors       // validation errors
form.hasErrors    // computed boolean
```

See the [Forms guide](/guide/forms) for more details.

## Next Steps

- [Installation](/guide/installation) - Full installation instructions
- [Forms](/guide/forms) - Form system details
- [Components](/components/) - Browse all components
- [Theming](/guide/theming) - Customise the theme
