<template>
  <div class="dropdown-divider-examples">
    <div class="example-section">
      <h5>Dropdown with Dividers</h5>
      <div class="dropdown-group">
        <DDropdown text="File Menu" variant="primary">
          <DDropdownItem>New</DDropdownItem>
          <DDropdownItem>Open</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem>Save</DDropdownItem>
          <DDropdownItem>Save As...</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem>Close</DDropdownItem>
        </DDropdown>

        <DDropdown text="User Actions" variant="secondary">
          <DDropdownItem>View Profile</DDropdownItem>
          <DDropdownItem>Edit Profile</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem>Settings</DDropdownItem>
          <DDropdownItem>Preferences</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem variant="danger">Sign Out</DDropdownItem>
        </DDropdown>
      </div>
    </div>

    <div class="example-section">
      <h5>Grouped Actions</h5>
      <div class="dropdown-group">
        <DDropdown text="Manage Items" variant="info">
          <DDropdownItem>Create New Item</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem>View All Items</DDropdownItem>
          <DDropdownItem>Search Items</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem>Export Items</DDropdownItem>
          <DDropdownItem>Import Items</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem variant="danger">Delete All Items</DDropdownItem>
        </DDropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DDropdown, DDropdownItem, DDropdownDivider } from '@omnitend/dashboard-for-laravel';

</script>

<style scoped>
.dropdown-divider-examples {
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
</style>
