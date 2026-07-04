---
layout: ../../layouts/DashboardLayout.astro
title: Forms
---

# Form System

The library includes a type-safe form system with validation, auto-generated forms, and composables.

## useForm Composable

The `useForm` composable provides type-safe form state management and submission.

### Basic Usage

```vue
<script setup lang="ts">
import { useForm, DButton, DFormInput } from '@omnitend/dashboard-for-laravel'

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
      <DFormInput v-model="form.data.name" />
    </DFormGroup>

    <DFormGroup label="Email" :error="form.errors.email">
      <DFormInput v-model="form.data.email" type="email" />
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
  // Form data (reactive) - access via form.data.fieldName
  data: T

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
    <DFormInput v-model="form.data.email" />
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

### Tips

- Bind to `form.data.*` (or `form.field('name')`) so validation state stays in sync.
- Use `options.transform` to reshape payloads before sending.
- `reset()` restores the initial snapshot; pass a list of keys to reset specific fields only.

## DXForm Component

Generate a form from field definitions. Add a `tabs` prop for multi-tab
editors; everything else (field types, conditional fields, per-field slots,
async options, nested repeaters) works the same flat or tabbed. See the
[DXForm component reference](/components/extended/DXForm) for the full API.

```vue
<script setup lang="ts">
import { useForm, DXForm } from '@omnitend/dashboard-for-laravel'
import type { FieldDefinition } from '@omnitend/dashboard-for-laravel'

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
  <DXForm
    :fields="fields"
    :form="form"
    submit-text="Create Account"
    @submit="handleSubmit"
  />
</template>
```

### Field Types

Supported field types:

- `text`, `email`, `password`, `tel`, `number`, `url` - Text-based inputs
- `date`, `datetime-local`, `datetime`, `time` - Date/time pickers
- `textarea` - Multi-line text
- `select` - Dropdown select (sync `options` or async `optionsLoader`)
- `checkbox` - Checkbox
- `switch` - Toggle with contextual on/off text and an on-state style (`textWhenTrue` / `textWhenFalse`)
- `radio` - Radio button group (requires `options`)
- `currency`, `percentage` - Numeric input with a `£`/`%` affix
- `image`, `file` - File input (`image` previews the selection, or an existing
  URL-string value). When a form field holds a selected `File`, `useForm`
  submits the whole form as `multipart/form-data` automatically — a `put`/`patch`
  is sent as `POST` with a `_method` field (PHP only parses multipart bodies on
  POST, so Laravel reads `_method` to route it). No extra config needed.
- `component` - Renders your own `field.component` (escape hatch)
- `repeater` - Nested, repeatable sub-form (see [DXRepeater](/components/extended/DXRepeater))

### Field Definition

```typescript
interface FieldDefinition {
  key: string                       // Form data key (or a dot path for nested values)
  type: FieldType                   // Input type (see Field Types above)
  label?: string | ((model) => string)   // Static, or derived from the live model
  placeholder?: string
  required?: boolean
  help?: string                     // Always-visible help text below the field
  hint?: string | ((model) => string)    // Hint text (may be model-derived)
  info?: string | ((model) => string)    // Popover help from an info icon on the label
  class?: string                    // CSS class for the form group
  inputProps?: Record<string, any>  // Extra props forwarded to the input

  // Options (select / radio)
  options?: FieldOption[]                              // Static options
  optionsLoader?: (model) => Promise<FieldOption[]>    // Async options
  reloadOptionsOnChange?: boolean   // Re-run optionsLoader when the model changes

  // Visibility & state — a boolean, or a function of the live form model
  when?: boolean | ((model) => boolean)       // Show/hide (cross-field reactive)
  readonly?: boolean | ((model) => boolean)
  disabled?: boolean | ((model) => boolean)

  // Numeric (number / currency / percentage)
  step?: number | string
  min?: number | string
  max?: number | string
  currencySymbol?: string           // Default: "£"

  // File (image / file)
  accept?: string                   // e.g. "image/*"

  // Switch (toggle)
  textWhenTrue?: string | ((model) => string)    // Label shown when on (falls back to label)
  textWhenFalse?: string | ((model) => string)   // Label shown when off (falls back to label)

  // Custom control (component)
  component?: Component             // Rendered with v-model + { field, model } props

  // Repeater (nested sub-form)
  fields?: FieldDefinition[]        // Sub-field definitions for each row
  addLabel?: string                 // "Add row" button label (default: "Add")
  minItems?: number
  maxItems?: number

  default?: any                     // Initial value (used by defineForm and repeater rows)
  rows?: number                     // Textarea rows (default: 3)
  span?: boolean                    // Full-width; render via the #span(<key>) slot
}
```

The `model` passed to every predicate (`when`, `readonly`, `disabled`,
function-valued `label`/`hint`) is the **live form data**, so fields react to
each other as the user types.

### Conditional fields

Use `when` to show a field only when other fields have certain values:

```typescript
const fields: FieldDefinition[] = [
  { key: 'on_sale', type: 'checkbox', label: 'On sale' },
  {
    key: 'sale_price',
    type: 'currency',
    label: 'Sale price',
    // Re-evaluated reactively against the live form data.
    when: (model) => model.on_sale === true,
  },
]
```

When `tabs` are used, a tab whose fields are all hidden disappears
automatically (unless it has a custom `#tab-content` slot).

### Dynamic labels, hints, and state

`label`, `hint`, `readonly`, and `disabled` all accept a function of the model:

```typescript
{
  key: 'discount',
  type: 'percentage',
  label: (model) => (model.tier === 'vip' ? 'VIP discount' : 'Discount'),
  hint: (model) => `Applied to £${model.subtotal ?? 0}`,
  disabled: (model) => model.tier === 'free',
  readonly: (model) => model.locked === true,
}
```

### Async select options

Populate a select from the server with `optionsLoader`. It runs on mount, and
again on any model change when `reloadOptionsOnChange` is set (stale responses
are ignored; a loader error falls back to static `options`):

```typescript
{
  key: 'city',
  type: 'select',
  label: 'City',
  optionsLoader: async (model) => {
    const res = await fetch(`/api/cities?country=${model.country}`)
    return res.json() // [{ value, text }]
  },
  reloadOptionsOnChange: true, // refetch when `country` changes
}
```

### Per-field slots

Override a single field without giving up the rest of the form. Slots are keyed
by field key:

```vue
<template>
  <DXForm :form="form" :fields="fields">
    <!-- Replace the input control -->
    <template #value(rating)="{ value, update }">
      <StarRating :model-value="value" @update:model-value="update" />
    </template>

    <!-- Add or override the hint text below a field -->
    <template #hint(sku)>
      Format: <code>ABC-123</code>
    </template>

    <!-- Full-width custom block (for a field marked `span: true`) -->
    <template #span(gallery)="{ value, update }">
      <GalleryEditor :images="value" @change="update" />
    </template>
  </DXForm>
</template>
```

Slot props: `#value(<key>)` and `#span(<key>)` receive
`{ field, model, value, update }` (call `update(newValue)` to write back);
`#info(<key>)` and `#hint(<key>)` receive `{ field, model }`.

### Repeaters (nested sub-forms)

A `repeater` field renders a repeatable group of sub-fields backed by an array
on the form:

```vue
<script setup lang="ts">
const form = useForm({
  reference: 'ORD-1001',
  lines: [{ description: '', quantity: 1, unit_price: 0 }],
})

const fields: FieldDefinition[] = [
  { key: 'reference', type: 'text', label: 'Order reference' },
  {
    key: 'lines',
    type: 'repeater',
    label: 'Line items',
    addLabel: 'Add line',
    minItems: 1,
    maxItems: 20,
    fields: [
      { key: 'description', type: 'text', label: 'Description' },
      { key: 'quantity', type: 'number', label: 'Qty', default: 1 },
      { key: 'unit_price', type: 'currency', label: 'Unit price' },
    ],
  },
]
</script>

<template>
  <DXForm :form="form" :fields="fields" @submit="handleSubmit" />
</template>
```

Each row binds to `form.data.lines[i]`. Server validation errors keyed in
Laravel's dotted style (`lines.0.unit_price`) map straight to the right row.
For a custom row layout, use the `#repeater-row(<key>)` slot or render
[DXRepeater](/components/extended/DXRepeater) directly.

### Tabs

Pass a `tabs` array to group fields into a multi-tab editor. Tabs can be
conditional (`when`) and lazily mounted (`lazy`), and the form auto-switches to
the first tab containing a validation error after a failed submit:

```vue
<template>
  <DXForm
    :form="form"
    :fields="fields"
    :tabs="[
      { key: 'general', label: 'General', fieldKeys: ['name', 'email'] },
      { key: 'address', label: 'Address', fieldKeys: ['country'], lazy: true },
    ]"
    @submit="handleSubmit"
  />
</template>
```

Each tab is `{ key, label?, fieldKeys, when?, lazy? }`. Like field labels,
`label` may be a function of the model (the live form data merged with any
`context`), so a tab title can reflect the record — handy for a related-records
count:

```ts
{ key: 'products', label: (model) => `Products (${model.products_count ?? 0})`,
  fieldKeys: [] }
```

The full prop and slot reference lives on the
[DXForm component page](/components/extended/DXForm).

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

        return $this->success($user, 'User created successfully');
    }
}
```

The form composable will automatically:
- Parse validation errors
- Update `form.errors`
- Call the appropriate callback

## Example: Complete Form

```vue
<script setup lang="ts">
import { useForm, DCard, DXForm } from '@omnitend/dashboard-for-laravel'
import { useRouter } from 'vue-router'

const router = useRouter()

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
    onSuccess: () => {
      router.push('/users')
    },
    onError: (errors) => {
      console.log('Validation errors:', errors)
    }
  })
}
</script>

<template>
  <DCard>
    <template #header>
      <h3>Create User</h3>
    </template>

    <DXForm
      :fields="fields"
      :form="form"
      submit-text="Create User"
      @submit="handleSubmit"
    />
  </DCard>
</template>
```

## Next Steps

- [DXForm](/components/extended/DXForm) - Form component API (props, events, slots)
- [DXField](/components/extended/DXField) - Single-field renderer
- [DXRepeater](/components/extended/DXRepeater) - Repeatable nested sub-forms
- [Examples](/examples/common-patterns) - More form examples
