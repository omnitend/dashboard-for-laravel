---
layout: ../../layouts/DashboardLayout.astro
title: TypeScript
---

# TypeScript

The library is written in TypeScript and includes full type definitions for all components, composables, and utilities.

## Type Definitions

All types are automatically available when you import from the library:

```typescript
import {
  useForm,
  DButton,
  type FieldDefinition,
  type UseFormReturn,
  type ValidationErrors
} from '@omnitend/dashboard-for-laravel'
```

## Component Props

All components have full TypeScript prop definitions:

```vue
<script setup lang="ts">
import { DButton } from '@omnitend/dashboard-for-laravel'
import type { ButtonVariant, Size } from 'bootstrap-vue-next'

// TypeScript knows about all valid props
const variant: ButtonVariant = 'primary'
const size: Size = 'lg'
</script>

<template>
  <DButton :variant="variant" :size="size">
    Click Me
  </DButton>
</template>
```

## Form Types

### UseFormReturn

```typescript
import type { UseFormReturn } from '@omnitend/dashboard-for-laravel'

interface UserForm {
  name: string
  email: string
  password: string
}

const form: UseFormReturn<UserForm> = useForm({
  name: '',
  email: '',
  password: ''
})

// TypeScript knows about form fields
form.name // ✓ OK
form.email // ✓ OK
form.invalid // ✗ Error
```

### FieldDefinition

```typescript
import type { FieldDefinition } from '@omnitend/dashboard-for-laravel'

const fields: FieldDefinition[] = [
  {
    key: 'name',
    label: 'Name',
    type: 'text', // Type-checked
    required: true
  },
  {
    key: 'country',
    label: 'Country',
    type: 'select',
    options: [
      { value: 'UK', text: 'United Kingdom' }
    ]
  }
]
```

### ValidationErrors

```typescript
import type { ValidationErrors } from '@omnitend/dashboard-for-laravel'

const errors: ValidationErrors = {
  email: ['The email field is required.'],
  password: ['The password must be at least 8 characters.']
}

// Access errors
const emailError = errors.email?.[0] // string | undefined
```

## Available Types

### Form Types

```typescript
import type {
  FieldType,
  FieldOption,
  FieldDefinition,
  ValidationErrors,
  FormError,
  FormSubmitOptions,
  FormState,
  UseFormReturn
} from '@omnitend/dashboard-for-laravel'
```

### Component Types

```typescript
import type {
  TableField,
  PaginationData,
  NavigationItem,
  NavigationGroup,
  Navigation
} from '@omnitend/dashboard-for-laravel'
```

### API Types

```typescript
import type {
  ApiError,
  ApiResponse
} from '@omnitend/dashboard-for-laravel'
```

## Type Inference

The library uses TypeScript's type inference extensively:

```typescript
// Form data types are inferred
const form = useForm({
  name: '',          // inferred as string
  age: 0,           // inferred as number
  active: false      // inferred as boolean
})

// TypeScript knows the types
form.name = 'John'    // ✓ OK
form.name = 123       // ✗ Error: Type 'number' is not assignable to type 'string'
```

## Generic Types

Some utilities use generics for maximum type safety:

```typescript
interface User {
  id: number
  name: string
  email: string
}

const form = useForm<User>({
  id: 0,
  name: '',
  email: ''
})

// TypeScript enforces the User interface
form.name = 'John'   // ✓ OK
form.invalid = true  // ✗ Error: Property 'invalid' does not exist
```

## Component Slot Types

Slots are typed with their bindings:

```vue
<script setup lang="ts">
import { DDropdown } from '@omnitend/dashboard-for-laravel'

interface User {
  name: string
  email: string
}

const user: User = {
  name: 'John Doe',
  email: 'john@example.com'
}
</script>

<template>
  <DDropdown>
    <!-- Slot props are typed -->
    <template #button-content>
      {{ user.name }}
    </template>
  </DDropdown>
</template>
```

## Best Practices

### 1. Define Interfaces

Create interfaces for your data structures:

```typescript
interface Customer {
  id: number
  business_name: string
  contact_name: string
  email: string
  phone: string
}

const form = useForm<Customer>({
  id: 0,
  business_name: '',
  contact_name: '',
  email: '',
  phone: ''
})
```

### 2. Type Field Definitions

Always type your field definitions:

```typescript
import type { FieldDefinition } from '@omnitend/dashboard-for-laravel'

const fields: FieldDefinition[] = [
  // Fields here are type-checked
]
```

### 3. Use Type Imports

Import types separately for clarity:

```typescript
import { useForm } from '@omnitend/dashboard-for-laravel'
import type { ValidationErrors } from '@omnitend/dashboard-for-laravel'
```

### 4. Enable Strict Mode

In your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## IDE Support

The library works great with:

- **VS Code** - Full IntelliSense and autocomplete
- **WebStorm** - Type checking and refactoring
- **Volar** - Vue 3 + TypeScript support

### Recommended VS Code Extensions

- **Vue - Official** (Volar) - Vue 3 language support
- **TypeScript Vue Plugin** - TypeScript support in `.vue` files
- **ESLint** - Linting

## Troubleshooting

### Types not available

Make sure the package is installed:

```bash
npm install @omnitend/dashboard-for-laravel
```

### Circular dependency errors

This usually means types aren't properly imported. Use `import type`:

```typescript
// Good
import type { UseFormReturn } from '@omnitend/dashboard-for-laravel'

// Avoid
import { UseFormReturn } from '@omnitend/dashboard-for-laravel'
```

### Volar not working

Restart the Vue Language Server in VS Code:

1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Restart Vue Server"
3. Select "Vue: Restart Vue Server"

## Next Steps

- [Form System](/guide/forms) - Type-safe form handling
- [Component Reference](/components/) - Typed component APIs
- [Examples](/examples/common-patterns) - TypeScript examples
