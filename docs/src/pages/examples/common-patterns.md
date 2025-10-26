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
  DashboardSidebar,
  DashboardNavbar,
  OContainer
} from '@omni-tend/laravel-dashboard'
import type { NavigationItem } from '@omni-tend/laravel-dashboard'

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
    <DashboardSidebar :navigation="navigation" :user="user" />

    <div class="flex-grow-1">
      <DashboardNavbar :user="user" />

      <OContainer fluid class="p-4">
        <!-- Page content -->
        <slot />
      </OContainer>
    </div>
  </div>
</template>
```

## Data Table with Pagination

Display paginated data with a table:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DataTable, OCard, OButton } from '@omni-tend/laravel-dashboard'
import { api } from '@omni-tend/laravel-dashboard'

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
  <OCard>
    <template #header>
      <div class="d-flex justify-content-between align-items-centre">
        <h3>Customers</h3>
        <OButton variant="primary" @click="$router.push('/customers/create')">
          Add Customer
        </OButton>
      </div>
    </template>

    <DataTable
      :items="customers"
      :fields="fields"
      :pagination="pagination"
      :loading="loading"
      @page-changed="loadCustomers"
    >
      <template #cell(actions)="{ item }">
        <OButton
          variant="link"
          size="sm"
          @click="$router.push(`/customers/${item.id}/edit`)"
        >
          Edit
        </OButton>
      </template>
    </DataTable>
  </OCard>
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
  OCard,
  OBasicForm
} from '@omni-tend/laravel-dashboard'
import type { FieldDefinition } from '@omni-tend/laravel-dashboard'

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
  <OCard>
    <template #header>
      <h3>Create Customer</h3>
    </template>

    <OBasicForm
      :fields="fields"
      :form="form"
      submit-text="Create Customer"
      @submit="handleSubmit"
    />
  </OCard>
</template>
```

## Collapsible Sections

Use collapse for expandable content:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { OCard, OButton, OCollapse } from '@omni-tend/laravel-dashboard'

const detailsVisible = ref(false)
const settingsVisible = ref(false)
</script>

<template>
  <OCard>
    <div class="d-flex justify-content-between align-items-centre mb-3">
      <h4>Customer Details</h4>
      <OButton
        variant="link"
        @click="detailsVisible = !detailsVisible"
      >
        {{ detailsVisible ? 'Hide' : 'Show' }} Details
      </OButton>
    </div>

    <OCollapse v-model="detailsVisible">
      <div class="card card-body">
        <p><strong>Business:</strong> Acme Ltd</p>
        <p><strong>Contact:</strong> John Smith</p>
        <p><strong>Email:</strong> john@acme.com</p>
      </div>
    </OCollapse>

    <div class="d-flex justify-content-between align-items-centre mb-3 mt-4">
      <h4>Settings</h4>
      <OButton
        variant="link"
        @click="settingsVisible = !settingsVisible"
      >
        {{ settingsVisible ? 'Hide' : 'Show' }} Settings
      </OButton>
    </div>

    <OCollapse v-model="settingsVisible">
      <div class="card card-body">
        <p>Settings content here...</p>
      </div>
    </OCollapse>
  </OCard>
</template>
```

## Modal Dialog

Show a modal for confirmations:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { OButton, OModal } from '@omni-tend/laravel-dashboard'

const showDeleteModal = ref(false)

const handleDelete = async () => {
  // Perform delete action
  console.log('Deleting...')
  showDeleteModal.value = false
}
</script>

<template>
  <div>
    <OButton variant="danger" @click="showDeleteModal = true">
      Delete Customer
    </OButton>

    <OModal v-model="showDeleteModal" title="Confirm Delete">
      <p>Are you sure you want to delete this customer?</p>
      <p class="text-muted">This action cannot be undone.</p>

      <template #footer>
        <OButton variant="secondary" @click="showDeleteModal = false">
          Cancel
        </OButton>
        <OButton variant="danger" @click="handleDelete">
          Delete
        </OButton>
      </template>
    </OModal>
  </div>
</template>
```

## Toast Notifications

Show feedback to users with toasts:

```vue
<script setup lang="ts">
import { useToast, OButton, OCard } from '@omni-tend/laravel-dashboard'

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
  <OCard>
    <template #header>
      <h3>Toast Examples</h3>
    </template>

    <div class="d-flex gap-2">
      <OButton variant="success" @click="showSuccess">
        Success Toast
      </OButton>

      <OButton variant="danger" @click="showError">
        Error Toast
      </OButton>

      <OButton variant="info" @click="showInfo">
        Info Toast
      </OButton>

      <OButton variant="warning" @click="showWarning">
        Warning Toast
      </OButton>
    </div>
  </OCard>
</template>
```

## Search and Filter

Implement search and filtering:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  OCard,
  OFormInput,
  OFormSelect,
  OTable
} from '@omni-tend/laravel-dashboard'

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
  <OCard>
    <template #header>
      <h3>Customers</h3>
    </template>

    <div class="row mb-3">
      <div class="col-md-6">
        <OFormInput
          v-model="searchQuery"
          placeholder="Search customers..."
        />
      </div>

      <div class="col-md-6">
        <OFormSelect v-model="statusFilter">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </OFormSelect>
      </div>
    </div>

    <OTable :items="filteredCustomers" :fields="fields" />
  </OCard>
</template>
```

## Next Steps

- [Component Reference](/components/) - Explore all components
- [Form System](/guide/forms) - Learn more about forms
- [Theming](/guide/theming) - Customise the appearance
