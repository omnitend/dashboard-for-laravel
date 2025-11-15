# Laravel Dashboard

A full-stack package for building Laravel dashboards with Vue 3, Inertia.js, and Bootstrap Vue Next.

## Documentation

📚 **[Full Documentation](docs/src/pages/)** | 📦 **[NPM Package](https://www.npmjs.com/package/@omnitend/dashboard-for-laravel)**

- [Getting Started Guide](docs/src/pages/guide/getting-started.md)
- [Installation Guide](docs/src/pages/guide/installation.md)
- [Component API Reference](docs/src/pages/components/)
- [Form System Guide](docs/src/pages/guide/forms.md)
- [Theming Guide](docs/src/pages/guide/theming.md)
- [TypeScript Guide](docs/src/pages/guide/typescript.md)
- [Examples & Patterns](docs/src/pages/examples/common-patterns.md)

## Features

- **Form System**: Type-safe form handling with validation
- **Data Tables**: Paginated data tables with customizable columns
- **Navigation**: Responsive sidebar navigation
- **API Client**: Type-safe HTTP client with Laravel integration
- **Laravel Helpers**: Backend utilities for consistent API responses
- **MCP Server**: Query documentation via AI agents ([setup guide](MCP_SERVER.md))

## Installation

### NPM Package

```bash
npm install @omnitend/dashboard-for-laravel
```

### Composer Package

```bash
composer require omnitend/dashboard-for-laravel
```

## Frontend Usage

### Forms

#### Using `defineForm` (Recommended)

The `defineForm` helper provides type-safe form definitions with minimal boilerplate:

```vue
<template>
  <DXForm
    :form="loginForm"
    submit-text="Login"
    submit-loading-text="Logging in..."
    @submit="handleLogin"
  />
</template>

<script setup lang="ts">
import { defineForm, DXForm } from "@omnitend/dashboard-for-laravel";

const loginForm = defineForm([
  {
    key: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
    default: "",
  },
  {
    key: "password",
    type: "password",
    label: "Password",
    required: true,
    default: "",
  },
  {
    key: "remember",
    type: "checkbox",
    label: "Remember me",
    default: false,
  },
] as const);

const handleLogin = async () => {
  await loginForm.form.post<{ redirect?: string }>("/login", {
    onSuccess: (data) => {
      window.location.href = data.redirect || "/dashboard";
    },
  });
};
</script>
```

#### Using `useForm` Directly

For more control, use `useForm` and `DXBasicForm`:

```vue
<template>
  <DXBasicForm
    :form="form"
    :fields="fields"
    @submit="handleSubmit"
  />
</template>

<script setup lang="ts">
import { useForm, DXBasicForm, type FieldDefinition } from "@omnitend/dashboard-for-laravel";

const form = useForm({
  name: "",
  email: "",
});

const fields: FieldDefinition[] = [
  { key: "name", type: "text", label: "Name", required: true },
  { key: "email", type: "email", label: "Email", required: true },
];

const handleSubmit = async () => {
  await form.post("/api/users");
};
</script>
```

#### Supported Field Types

- Text inputs: `text`, `email`, `password`, `number`, `url`, `tel`, `date`, `datetime-local`, `time`
- `textarea`
- `select` (requires `options` prop)
- `checkbox`
- `radio` (requires `options` prop)

#### Form Methods

```typescript
// Submit methods
await form.post("/api/users", options);
await form.put("/api/users/1", options);
await form.patch("/api/users/1", options);
await form.delete("/api/users/1", options);

// Form state
form.processing; // boolean
form.errors; // ValidationErrors
form.hasErrors; // computed boolean
form.recentlySuccessful; // boolean

// Form methods
form.reset(); // Reset to initial values
form.clearErrors(); // Clear all errors
form.clearError("email"); // Clear specific field error
```

### Data Tables

```vue
<template>
  <DXTable
    title="Users"
    :items="users"
    :fields="fields"
    :pagination="pagination"
    @page-change="fetchUsers"
  >
    <!-- Custom cell rendering -->
    <template #cell(created_at)="{ item }">
      {{ formatDate(item.created_at) }}
    </template>
  </DXTable>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { DXTable, type PaginationData, type TableField } from "@omnitend/dashboard-for-laravel";

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

const users = ref<User[]>([]);
const pagination = ref<PaginationData>({
  currentPage: 1,
  perPage: 15,
  total: 0,
});

const fields: TableField[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email" },
  { key: "created_at", label: "Created" },
];

const fetchUsers = async (page: number = 1) => {
  // Fetch logic here
};
</script>
```

### Dashboard Layout

```vue
<template>
  <DXDashboard
    :navigation="navigation"
    :current-url="currentUrl"
    title="My App"
    page-title="Dashboard"
    :user="user"
  >
    <!-- Page content goes here -->
    <DCard>
      <h1>Welcome to the Dashboard</h1>
    </DCard>
  </DXDashboard>
</template>

<script setup lang="ts">
import { DXDashboard, DCard, type Navigation } from "@omnitend/dashboard-for-laravel";

const navigation: Navigation = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", url: "/dashboard" },
      { label: "Users", url: "/users" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Profile", url: "/profile" },
      { label: "Logout", url: "/logout" },
    ],
  },
];

const currentUrl = "/dashboard";
const user = { name: "John Doe", email: "john@example.com" };
</script>
```

## Backend Usage

### Form Request

```php
<?php

namespace App\Http\Requests;

use OmniTend\LaravelDashboard\Http\Requests\BaseFormRequest;

class StoreUserRequest extends BaseFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users'],
            'password' => ['required', 'min:8'],
        ];
    }

    protected function getValidationMessage($validator): string
    {
        return 'Please check your input and try again.';
    }
}
```

### API Responses

```php
<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use OmniTend\LaravelDashboard\Traits\HasApiResponses;

class UserController extends Controller
{
    use HasApiResponses;

    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());

        return $this->success($user, 'User created successfully', 201);
    }

    public function destroy(User $user)
    {
        $user->delete();

        return $this->success(null, 'User deleted successfully');
    }
}
```

### Paginated Resources

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use OmniTend\LaravelDashboard\Http\Resources\PaginatedResource;

class UserController extends Controller
{
    public function index()
    {
        $users = User::paginate(15);

        return new PaginatedResource($users);
    }
}
```

## Development

### Building the Package

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Watching for Changes

```bash
npm run dev
```

### Documentation

The documentation site is built with **Astro** + Vue 3 + vue-docgen-cli.

#### Run Documentation Site Locally

```bash
# Start Astro dev server
npm run docs:dev

# Build documentation site
npm run docs:build

# Preview built documentation
npm run docs:preview
```

#### Generate Component API Documentation

```bash
# Generate markdown docs from component source
npm run docs:generate

# Generate and build all documentation
npm run docs:all
```

#### Documentation Features

- **Astro** - Fast, modern static site generator with Vue 3 support
- **vue-docgen-cli** - Auto-generates API docs from component source
- **Markdown-based** - Easy to edit and maintain
- **Live Vue components** - Can embed interactive examples
- **Works with Vite 6** - No version conflicts

## Requirements

- PHP ^8.2
- Laravel ^11.0|^12.0
- Vue ^3.4.0
- Bootstrap Vue Next ^0.28.0

## License

MIT
