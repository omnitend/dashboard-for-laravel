<template>
  <div class="dropdown-item-examples">
    <div class="example-section">
      <h5>Basic Dropdown Items</h5>
      <div class="dropdown-group">
        <DDropdown text="Actions" variant="primary">
          <DDropdownItem @click="handleClick('Action 1')">Action 1</DDropdownItem>
          <DDropdownItem @click="handleClick('Action 2')">Action 2</DDropdownItem>
          <DDropdownItem @click="handleClick('Action 3')">Action 3</DDropdownItem>
        </DDropdown>
        <p v-if="lastAction" class="action-feedback">Last action: {{ lastAction }}</p>
      </div>
    </div>

    <div class="example-section">
      <h5>Dropdown Items with Links</h5>
      <div class="dropdown-group">
        <DDropdown text="Navigation" variant="secondary">
          <DDropdownItem href="#home">Home</DDropdownItem>
          <DDropdownItem href="#about">About</DDropdownItem>
          <DDropdownItem href="#contact">Contact</DDropdownItem>
        </DDropdown>
      </div>
    </div>

    <div class="example-section">
      <h5>Disabled Dropdown Items</h5>
      <div class="dropdown-group">
        <DDropdown text="Mixed States" variant="info">
          <DDropdownItem>Available Action</DDropdownItem>
          <DDropdownItem disabled>Disabled Action</DDropdownItem>
          <DDropdownItem>Another Available Action</DDropdownItem>
          <DDropdownItem disabled>Another Disabled Action</DDropdownItem>
        </DDropdown>
      </div>
    </div>

    <div class="example-section">
      <h5>Active Dropdown Items</h5>
      <div class="dropdown-group">
        <DDropdown text="Status Menu" variant="success">
          <DDropdownItem active>Current Page</DDropdownItem>
          <DDropdownItem>Other Page 1</DDropdownItem>
          <DDropdownItem>Other Page 2</DDropdownItem>
        </DDropdown>
      </div>
    </div>

    <div class="example-section">
      <h5>Dropdown Items with Variants</h5>
      <div class="dropdown-group">
        <DDropdown text="Delete Menu" variant="warning">
          <DDropdownItem>View Details</DDropdownItem>
          <DDropdownItem>Edit</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem variant="danger">Delete Permanently</DDropdownItem>
        </DDropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DDropdown, DDropdownItem, DDropdownDivider } from '@omnitend/dashboard-for-laravel';

import { ref } from 'vue';

const lastAction = ref<string | null>(null);

const handleClick = (action: string) => {
  lastAction.value = action;
};
</script>

<style scoped>
.dropdown-item-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.dropdown-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-start;
}

.action-feedback {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}
</style>
