---
layout: ../../layouts/DashboardLayout.astro
title: Forms
---

# Form System

The library includes a powerful type-safe form system with validation, auto-generated forms, and composables.

## useForm Composable

The `useForm` composable provides type-safe form state management and submission.

### Basic Usage

```vue
<script setup lang="ts">
import { useForm, DButton, DFormInput } from '@omni-tend/dashboard-for-laravel'

const form = useForm({
  name: '',
  email: '',
  password: ''
})

const handleSubmit = async () => {
  await form.post('/api/users', {
    onSuccess: (data) => {
      console.log('User created:', data)
    },
    onError: (errors) => {
      console.log('Validation failed:', errors)
    }
  })
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <DFormGroup label="Name" :error="form.errors.name">
      <DFormInput v-model="form.name" />
    </DFormGroup>

    <DFormGroup label="Email" :error="form.errors.email">
      <DFormInput v-model="form.email" type="email" />
    </DFormGroup>

    <DButton type="submit" :disabled="form.processing">
      {{ form.processing ? 'Submitting...' : 'Submit' }}
    </DButton>
  </form>
</template>
```

### Form State

The `useForm` composable returns a form object with the following properties:

```typescript
interface UseFormReturn<T> {
  // Form data (reactive)
  [key: string]: any

  // State
  processing: boolean                // Is form submitting?
  errors: ValidationErrors           // Validation errors
  hasErrors: ComputedRef<boolean>    // Are there any errors?
  recentlySuccessful: boolean        // Was last submit successful?

  // Methods
  post(url: string, options?: FormSubmitOptions): Promise<any>
  put(url: string, options?: FormSubmitOptions): Promise<any>
  patch(url: string, options?: FormSubmitOptions): Promise<any>
  delete(url: string, options?: FormSubmitOptions): Promise<any>
  reset(): void                      // Reset to initial values
  clearErrors(): void                // Clear all errors
  clearError(field: string): void    // Clear specific field error
}
```

### HTTP Methods

```typescript
// POST request
await form.post('/api/users')

// PUT request
await form.put('/api/users/1')

// PATCH request
await form.patch('/api/users/1')

// DELETE request
await form.delete('/api/users/1')
```

### Callbacks

```typescript
await form.post('/api/users', {
  onSuccess: (data) => {
    console.log('Success:', data)
    // Navigate away, show toast, etc.
  },
  onError: (errors) => {
    console.log('Validation failed:', errors)
  }
})
```

### Error Handling

```vue
<script setup lang="ts">
const form = useForm({
  email: ''
})
</script>

<template>
  <!-- Show error for specific field -->
  <DFormGroup label="Email" :error="form.errors.email">
    <DFormInput v-model="form.email" />
  </DFormGroup>

  <!-- Clear specific error -->
  <DButton @click="form.clearError('email')">
    Clear Email Error
  </DButton>

  <!-- Clear all errors -->
  <DButton @click="form.clearErrors()">
    Clear All Errors
  </DButton>
</template>
```

## DXBasicForm Component

Auto-generate forms from field definitions:

```vue
<script setup lang="ts">
import { useForm, DXBasicForm } from '@omni-tend/dashboard-for-laravel'
import type { FieldDefinition } from '@omni-tend/dashboard-for-laravel'

const form = useForm({
  name: '',
  email: '',
  country: 'UK',
  accept_terms: false
})

const fields: FieldDefinition[] = [
  {
    key: 'name',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'Enter your name'
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    required: true
  },
  {
    key: 'country',
    label: 'Country',
    type: 'select',
    required: true,
    options: [
      { value: 'UK', text: 'United Kingdom' },
      { value: 'US', text: 'United States' },
      { value: 'CA', text: 'Canada' }
    ]
  },
  {
    key: 'accept_terms',
    label: 'I accept the terms and conditions',
    type: 'checkbox',
    required: true
  }
]

const handleSubmit = async () => {
  await form.post('/api/users')
}
</script>

<template>
  <DXBasicForm
    :fields="fields"
    :form="form"
    submit-text="Create Account"
    @submit="handleSubmit"
  />
</template>
```

### Field Types

Supported field types:

- `text` - Text input
- `email` - Email input
- `password` - Password input
- `tel` - Telephone input
- `number` - Number input
- `date` - Date input
- `textarea` - Multi-line text
- `select` - Dropdown select
- `checkbox` - Checkbox

### Field Definition

```typescript
interface FieldDefinition {
  key: string                                          // Form field key
  label?: string                                       // Field label
  type: FieldType                                      // Input type
  placeholder?: string                                 // Placeholder text
  required?: boolean                                   // Is field required?
  options?: Array<{ value: string; text: string }>     // For select fields
}
```

## DXForm Component

Advanced form component with more control:

```vue
<script setup lang="ts">
import { useForm, DXForm, DFormInput, DButton } from '@omni-tend/dashboard-for-laravel'

const form = useForm({
  name: '',
  email: ''
})

const handleSubmit = async () => {
  await form.post('/api/users')
}
</script>

<template>
  <DXForm :form="form" @submit="handleSubmit">
    <DFormGroup label="Name">
      <DFormInput v-model="form.name" />
    </DFormGroup>

    <DFormGroup label="Email">
      <DFormInput v-model="form.email" type="email" />
    </DFormGroup>

    <DButton type="submit">
      Submit
    </DButton>
  </DXForm>
</template>
```

## Laravel Integration

### Form Requests

On the Laravel side, use `BaseFormRequest` for validation:

```php
use OmniTend\LaravelDashboard\Http\Requests\BaseFormRequest;

class CreateUserRequest extends BaseFormRequest
{
    public function rules()
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
        ];
    }
}
```

### API Responses

Use the `HasApiResponses` trait for consistent responses:

```php
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

The form composable will automatically:
- Parse validation errors
- Update `form.errors`
- Call the appropriate callback

## Best Practices

1. **Type your form data** - Use TypeScript interfaces for form structure
2. **Handle errors gracefully** - Always provide error feedback to users
3. **Disable during submission** - Use `form.processing` to disable submit button
4. **Reset after success** - Call `form.reset()` after successful submission
5. **Use callbacks** - Separate success and error logic

## Example: Complete Form

```vue
<script setup lang="ts">
import { useForm, DCard, DXBasicForm } from '@omni-tend/dashboard-for-laravel'
import { useRouter } from 'vue-router'
import { useToast } from '@omni-tend/dashboard-for-laravel'

const router = useRouter()
const toast = useToast()

const form = useForm({
  name: '',
  email: '',
  password: ''
})

const fields = [
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    required: true
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    required: true
  }
]

const handleSubmit = async () => {
  await form.post('/api/users', {
    onSuccess: (data) => {
      toast.success('User created successfully')
      router.push('/users')
    },
    onError: () => {
      toast.error('Please fix the validation errors')
    }
  })
}
</script>

<template>
  <DCard>
    <template #header>
      <h3>Create User</h3>
    </template>

    <DXBasicForm
      :fields="fields"
      :form="form"
      submit-text="Create User"
      @submit="handleSubmit"
    />
  </DCard>
</template>
```

## Next Steps

- [Component Reference](/components/DXForm) - DXForm component API
- [Component Reference](/components/DXBasicForm) - DXBasicForm component API
- [Examples](/examples/common-patterns) - More form examples
