# Laravel Dashboard

A full-stack package for building Laravel dashboards with Vue 3, Inertia.js, and Bootstrap Vue Next.

## Documentation

📚 **[Full Documentation](docs/src/pages/)** | 📦 **[NPM Package](https://www.npmjs.com/package/@omni-tend/dashboard-for-laravel)**

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

## Installation

### NPM Package

```bash
npm install @omni-tend/dashboard-for-laravel
```

### Composer Package

```bash
composer require omni-tend/dashboard-for-laravel
```

## Frontend Usage

### Forms

#### Using `defineForm` (Recommended)

The `defineForm` helper provides type-safe form definitions with minimal boilerplate:

```vue
<template>
  <OForm
    :form="loginForm"
    submit-text="Login"
    submit-loading-text="Logging in..."
    @submit="handleLogin"
  />
</template>

<script setup lang="ts">
import { defineForm, OForm } from "@omni-tend/dashboard-for-laravel";

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

For more control, use `useForm` and `OBasicForm`:

```vue
<template>
  <OBasicForm
    :form="form"
    :fields="fields"
    @submit="handleSubmit"
  />
</template>

<script setup lang="ts">
import { useForm, OBasicForm, type FieldDefinition } from "@omni-tend/dashboard-for-laravel";

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
  <DataTable
    title="Users"
    :items="users"
    :fields="fields"
    :loading="loading"
    :error="error"
    :pagination="pagination"
    @page-change="fetchUsers"
  >
    <!-- Custom cell rendering -->
    <template #cell(created_at)="{ item }">
      {{ formatDate(item.created_at) }}
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { api, DataTable, type PaginationData, type TableField } from "@omni-tend/dashboard-for-laravel";

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const pagination = ref<PaginationData>({
  currentPage: 1,
  perPage: 15,
  total: 0,
  from: 0,
  to: 0,
});

const fields: TableField[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email" },
  { key: "created_at", label: "Created" },
];

const fetchUsers = async (page: number = 1) => {
  loading.value = true;
  try {
    const { data } = await api.get<any>("/api/users", { page });
    users.value = data.data;
    pagination.value = {
      currentPage: data.current_page,
      perPage: data.per_page,
      total: data.total,
      from: data.from,
      to: data.to,
    };
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>
```

### Sidebar Navigation

```vue
<template>
  <Sidebar :title="Navigation" :items="navItems" />
</template>

<script setup lang="ts">
import { Sidebar, type NavigationItem } from "@omni-tend/dashboard-for-laravel";

const navItems: NavigationItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    key: "users",
    label: "Users",
    href: "/users",
  },
  { divider: true },
  {
    key: "logout",
    label: "Logout",
    href: "#",
    class: "text-danger",
    onClick: handleLogout,
  },
];

const handleLogout = () => {
  // Logout logic
};
</script>
```

### API Client

```typescript
import { api } from "@omni-tend/dashboard-for-laravel";

// GET request
const { data } = await api.get<User[]>("/api/users");

// POST request
const { data } = await api.post<User>("/api/users", {
  name: "John Doe",
  email: "john@example.com",
});

// With query parameters
const { data } = await api.get("/api/users", { page: 1, per_page: 15 });

// With FormData
const formData = new FormData();
formData.append("file", file);
await api.post("/api/upload", formData);
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
