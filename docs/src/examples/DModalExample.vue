<template>
  <div class="modal-examples">
    <div class="example-section">
      <h5>Basic Modal</h5>
      <DButton variant="primary" @click="showBasicModal = true">Open Basic Modal</DButton>
      <DModal v-model="showBasicModal" title="Basic Modal">
        <p>This is a basic modal with a title, body content, and footer buttons.</p>
        <p>You can include any content here, including forms, lists, or other components.</p>
      </DModal>
    </div>

    <div class="example-section">
      <h5>Modal Sizes</h5>
      <div class="button-group">
        <DButton variant="primary" size="sm" @click="showSmallModal = true">Small Modal</DButton>
        <DButton variant="primary" @click="showDefaultModal = true">Default Modal</DButton>
        <DButton variant="primary" size="lg" @click="showLargeModal = true">Large Modal</DButton>
        <DButton variant="primary" size="lg" @click="showXLModal = true">Extra Large Modal</DButton>
      </div>

      <DModal v-model="showSmallModal" title="Small Modal" size="sm">
        <p>This is a small modal.</p>
      </DModal>

      <DModal v-model="showDefaultModal" title="Default Modal">
        <p>This is a default sized modal.</p>
      </DModal>

      <DModal v-model="showLargeModal" title="Large Modal" size="lg">
        <p>This is a large modal with more space for content.</p>
      </DModal>

      <DModal v-model="showXLModal" title="Extra Large Modal" size="xl">
        <p>This is an extra large modal with maximum space.</p>
      </DModal>
    </div>

    <div class="example-section">
      <h5>Centred Modal</h5>
      <DButton variant="primary" @click="showCentredModal = true">Open Centred Modal</DButton>
      <DModal v-model="showCentredModal" title="Centred Modal" centered>
        <p>This modal is vertically centred on the page.</p>
      </DModal>
    </div>

    <div class="example-section">
      <h5>Scrollable Modal</h5>
      <DButton variant="primary" @click="showScrollableModal = true">Open Scrollable Modal</DButton>
      <DModal v-model="showScrollableModal" title="Scrollable Modal" scrollable>
        <p v-for="i in 20" :key="i">
          This is line {{ i }} of scrollable content. The modal body will scroll while the header and footer remain fixed.
        </p>
      </DModal>
    </div>

    <div class="example-section">
      <h5>Modal with Form</h5>
      <DButton variant="success" @click="showFormModal = true">Open Form Modal</DButton>
      <DModal v-model="showFormModal" title="Create New User" @ok="handleFormSubmit">
        <DFormGroup label="Name" label-for="name-input">
          <DFormInput id="name-input" v-model="formData.name" placeholder="Enter name" />
        </DFormGroup>
        <DFormGroup label="Email" label-for="email-input">
          <DFormInput id="email-input" v-model="formData.email" type="email" placeholder="Enter email" />
        </DFormGroup>
        <DFormGroup label="Role" label-for="role-select">
          <DFormSelect id="role-select" v-model="formData.role" :options="roleOptions" />
        </DFormGroup>
      </DModal>
    </div>

    <div class="example-section">
      <h5>Confirmation Modal</h5>
      <DButton variant="danger" @click="showConfirmModal = true">Delete Item</DButton>
      <DModal
        v-model="showConfirmModal"
        title="Confirm Deletion"
        ok-variant="danger"
        ok-title="Delete"
        cancel-title="Cancel"
        @ok="handleDelete"
      >
        <p>Are you sure you want to delete this item?</p>
        <p class="text-danger mb-0">This action cannot be undone.</p>
      </DModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DButton, DModal, DFormGroup, DFormInput, DFormSelect } from '@omni-tend/dashboard-for-laravel';

import { ref } from 'vue';

const showBasicModal = ref(false);
const showSmallModal = ref(false);
const showDefaultModal = ref(false);
const showLargeModal = ref(false);
const showXLModal = ref(false);
const showCentredModal = ref(false);
const showScrollableModal = ref(false);
const showFormModal = ref(false);
const showConfirmModal = ref(false);

const formData = ref({
  name: '',
  email: '',
  role: '',
});

const roleOptions = [
  { value: '', text: 'Select a role' },
  { value: 'admin', text: 'Administrator' },
  { value: 'editor', text: 'Editor' },
  { value: 'viewer', text: 'Viewer' },
];

const handleFormSubmit = () => {
  console.log('Form submitted:', formData.value);
  formData.value = { name: '', email: '', role: '' };
};

const handleDelete = () => {
  console.log('Item deleted');
};
</script>

<style scoped>
.modal-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
</style>
