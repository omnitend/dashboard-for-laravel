---
layout: ../../layouts/DashboardLayout.astro
title: Common Patterns
---

# Common Patterns

Real-world examples showing how to use the library components together.

## Dashboard Layout

A typical dashboard layout with sidebar and navbar:

```vue
<script setup lang="ts">
import {
  DXDashboardSidebar,
  DXDashboardNavbar,
  DContainer
} from '@omnitend/dashboard-for-laravel'
import type { NavigationItem } from '@omnitend/dashboard-for-laravel'

const user = {
  name: 'John Doe',
  email: 'john@example.com'
}

const navigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'bi:house-door'
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: 'bi:people'
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: 'bi:cart'
  },
  {
    divider: true
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'bi:gear'
  }
]
</script>

<template>
  <div class="d-flex">
    <DXDashboardSidebar :navigation="navigation" :user="user" />

    <div class="flex-grow-1">
      <DXDashboardNavbar :user="user" />

      <DContainer fluid class="p-4">
        <!-- Page content -->
        <slot />
      </DContainer>
    </div>
  </div>
</template>
```

## Data Table with Pagination

Display paginated data with a table:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DXTable, DCard, DButton } from '@omnitend/dashboard-for-laravel'
import { api } from '@omnitend/dashboard-for-laravel'

const customers = ref([])
const pagination = ref(null)
const loading = ref(false)

const fields = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'business_name', label: 'Business Name', sortable: true },
  { key: 'contact_name', label: 'Contact' },
  { key: 'email', label: 'Email' },
  { key: 'actions', label: 'Actions' }
]

const loadCustomers = async (page = 1) => {
  loading.value = true
  try {
    const response = await api.get(`/api/customers?page=${page}`)
    customers.value = response.data.data
    pagination.value = response.data.meta
  } finally {
    loading.value = false
  }
}

onMounted(() => loadCustomers())
</script>

<template>
  <DCard>
    <template #header>
      <div class="d-flex justify-content-between align-items-centre">
        <h3>Customers</h3>
        <DButton variant="primary" @click="$router.push('/customers/create')">
          Add Customer
        </DButton>
      </div>
    </template>

    <DXTable
      :items="customers"
      :fields="fields"
      :pagination="pagination"
      :loading="loading"
      @page-changed="loadCustomers"
    >
      <template #cell(actions)="{ item }">
        <DButton
          variant="link"
          size="sm"
          @click="$router.push(`/customers/${item.id}/edit`)"
        >
          Edit
        </DButton>
      </template>
    </DXTable>
  </DCard>
</template>
```

## Form with Validation

Create a form with validation and error handling:

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  useForm,
  useToast,
  DCard,
  DXBasicForm
} from '@omnitend/dashboard-for-laravel'
import type { FieldDefinition } from '@omnitend/dashboard-for-laravel'

const router = useRouter()
const toast = useToast()

const form = useForm({
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  postcode: '',
  country: 'UK'
})

const fields: FieldDefinition[] = [
  {
    key: 'business_name',
    label: 'Business Name',
    type: 'text',
    required: true,
    placeholder: 'Enter business name'
  },
  {
    key: 'contact_name',
    label: 'Contact Name',
    type: 'text',
    required: true,
    placeholder: 'Enter contact name'
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
    placeholder: 'contact@example.com'
  },
  {
    key: 'phone',
    label: 'Phone Number',
    type: 'tel',
    placeholder: '+44 20 1234 5678'
  },
  {
    key: 'address',
    label: 'Address',
    type: 'textarea',
    placeholder: 'Enter full address'
  },
  {
    key: 'postcode',
    label: 'Postcode',
    type: 'text',
    placeholder: 'SW1A 1AA'
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
  }
]

const handleSubmit = async () => {
  await form.post('/api/customers', {
    onSuccess: () => {
      toast.success('Customer created successfully')
      router.push('/customers')
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
      <h3>Create Customer</h3>
    </template>

    <DXBasicForm
      :fields="fields"
      :form="form"
      submit-text="Create Customer"
      @submit="handleSubmit"
    />
  </DCard>
</template>
```

## Collapsible Sections

Use collapse for expandable content:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DCard, DButton, DCollapse } from '@omnitend/dashboard-for-laravel'

const detailsVisible = ref(false)
const settingsVisible = ref(false)
</script>

<template>
  <DCard>
    <div class="d-flex justify-content-between align-items-centre mb-3">
      <h4>Customer Details</h4>
      <DButton
        variant="link"
        @click="detailsVisible = !detailsVisible"
      >
        {{ detailsVisible ? 'Hide' : 'Show' }} Details
      </DButton>
    </div>

    <DCollapse v-model="detailsVisible">
      <div class="card card-body">
        <p><strong>Business:</strong> Acme Ltd</p>
        <p><strong>Contact:</strong> John Smith</p>
        <p><strong>Email:</strong> john@acme.com</p>
      </div>
    </DCollapse>

    <div class="d-flex justify-content-between align-items-centre mb-3 mt-4">
      <h4>Settings</h4>
      <DButton
        variant="link"
        @click="settingsVisible = !settingsVisible"
      >
        {{ settingsVisible ? 'Hide' : 'Show' }} Settings
      </DButton>
    </div>

    <DCollapse v-model="settingsVisible">
      <div class="card card-body">
        <p>Settings content here...</p>
      </div>
    </DCollapse>
  </DCard>
</template>
```

## Modal Dialog

Show a modal for confirmations:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DButton, DModal } from '@omnitend/dashboard-for-laravel'

const showDeleteModal = ref(false)

const handleDelete = async () => {
  // Perform delete action
  console.log('Deleting...')
  showDeleteModal.value = false
}
</script>

<template>
  <div>
    <DButton variant="danger" @click="showDeleteModal = true">
      Delete Customer
    </DButton>

    <DModal v-model="showDeleteModal" title="Confirm Delete">
      <p>Are you sure you want to delete this customer?</p>
      <p class="text-muted">This action cannot be undone.</p>

      <template #footer>
        <DButton variant="secondary" @click="showDeleteModal = false">
          Cancel
        </DButton>
        <DButton variant="danger" @click="handleDelete">
          Delete
        </DButton>
      </template>
    </DModal>
  </div>
</template>
```

## Toast Notifications

Show feedback to users with toasts:

```vue
<script setup lang="ts">
import { useToast, DButton, DCard } from '@omnitend/dashboard-for-laravel'

const toast = useToast()

const showSuccess = () => {
  toast.success('Operation completed successfully!')
}

const showError = () => {
  toast.error('Something went wrong. Please try again.')
}

const showInfo = () => {
  toast.info('This is an informational message.')
}

const showWarning = () => {
  toast.warning('Please review this warning.')
}
</script>

<template>
  <DCard>
    <template #header>
      <h3>Toast Examples</h3>
    </template>

    <div class="d-flex gap-2">
      <DButton variant="success" @click="showSuccess">
        Success Toast
      </DButton>

      <DButton variant="danger" @click="showError">
        Error Toast
      </DButton>

      <DButton variant="info" @click="showInfo">
        Info Toast
      </DButton>

      <DButton variant="warning" @click="showWarning">
        Warning Toast
      </DButton>
    </div>
  </DCard>
</template>
```

## Search and Filter

Implement search and filtering:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DCard,
  DFormInput,
  DFormSelect,
  DTable
} from '@omnitend/dashboard-for-laravel'

const searchQuery = ref('')
const statusFilter = ref('all')

const customers = ref([
  { id: 1, name: 'Acme Ltd', status: 'active' },
  { id: 2, name: 'Tech Corp', status: 'inactive' },
  { id: 3, name: 'Global Inc', status: 'active' }
])

const filteredCustomers = computed(() => {
  return customers.value.filter(customer => {
    const matchesSearch = customer.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())

    const matchesStatus =
      statusFilter.value === 'all' ||
      customer.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

const fields = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' }
]
</script>

<template>
  <DCard>
    <template #header>
      <h3>Customers</h3>
    </template>

    <div class="row mb-3">
      <div class="col-md-6">
        <DFormInput
          v-model="searchQuery"
          placeholder="Search customers..."
        />
      </div>

      <div class="col-md-6">
        <DFormSelect v-model="statusFilter">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </DFormSelect>
      </div>
    </div>

    <DTable :items="filteredCustomers" :fields="fields" />
  </DCard>
</template>
```

## Next Steps

- [Component Reference](/components/) - Explore all components
- [Form System](/guide/forms) - Learn more about forms
- [Theming](/guide/theming) - Customise the appearance
