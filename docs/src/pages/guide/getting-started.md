---
layout: ../../layouts/DashboardLayout.astro
title: Getting Started
---

# Getting Started

@omni-tend/laravel-dashboard is a reusable full-stack component library for building Laravel dashboards with Vue 3, Inertia.js, and Bootstrap Vue Next.

## What's Included

This library provides:

1. **Vue 3 Components** - Reusable dashboard UI components
2. **O* Wrapper Components** - Type-safe wrappers around Bootstrap Vue Next
3. **Form System** - Type-safe form handling with validation
4. **Composables** - Reusable Vue composition functions
5. **Theme** - Bootstrap 5 custom SCSS theme
6. **PHP Utilities** - Laravel helpers for API responses and form requests

## Quick Example

Here's a simple example using the library:

```vue
<script setup lang="ts">
import { OCard, OButton, OBasicForm, useForm } from '@omni-tend/laravel-dashboard'
import '@omni-tend/laravel-dashboard/theme.css'

const form = useForm({
  name: '',
  email: '',
})

const fields = [
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    required: true,
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
  },
]

const handleSubmit = async () => {
  await form.post('/api/users')
}
</script>

<template>
  <OCard>
    <template #header>
      <h3>Create User</h3>
    </template>

    <OBasicForm
      :fields="fields"
      :form="form"
      @submit="handleSubmit"
    />
  </OCard>
</template>
```

## Core Concepts

### O* Wrapper Components

All Bootstrap Vue Next components are wrapped in O* components to provide:

- **Consistent API** across projects
- **Type safety** with TypeScript
- **Customisation** without modifying Bootstrap Vue Next
- **Proper slot forwarding** with slot props

Learn more in the [Components section](/components/).

### Form System

The library includes a powerful form system with:

- Type-safe form state management
- Validation error handling
- Success/error callbacks
- Auto-generated forms from field definitions

Learn more in the [Forms guide](/guide/forms).

### British English

This library uses British English spelling and UK-specific terminology throughout:

- "colour" not "color"
- "organise" not "organize"
- "postal code" not "zip code"

## Next Steps

- [Installation Guide](/guide/installation) - Install and set up the library
- [Component Reference](/components/) - Browse available components
- [Examples](/examples/common-patterns) - See real-world usage examples
