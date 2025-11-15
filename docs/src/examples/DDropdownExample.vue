<template>
  <div class="dropdown-examples">
    <div class="example-section">
      <h5>Basic Dropdowns</h5>
      <div class="dropdown-group">
        <DDropdown text="Dropdown Button" variant="primary">
          <DDropdownItem href="#action-1">Action 1</DDropdownItem>
          <DDropdownItem href="#action-2">Action 2</DDropdownItem>
          <DDropdownItem href="#action-3">Action 3</DDropdownItem>
        </DDropdown>

        <DDropdown text="Secondary" variant="secondary">
          <DDropdownItem>Edit</DDropdownItem>
          <DDropdownItem>Delete</DDropdownItem>
          <DDropdownItem>Archive</DDropdownItem>
        </DDropdown>
      </div>
    </div>

    <div class="example-section">
      <h5>Dropdown with Dividers</h5>
      <div class="dropdown-group">
        <DDropdown text="Actions" variant="primary">
          <DDropdownItem>New Document</DDropdownItem>
          <DDropdownItem>New Folder</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem>Settings</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem variant="danger">Delete</DDropdownItem>
        </DDropdown>
      </div>
    </div>

    <div class="example-section">
      <h5>Split Button Dropdowns</h5>
      <div class="dropdown-group">
        <DDropdown split text="Primary Action" variant="primary">
          <DDropdownItem>Secondary Action 1</DDropdownItem>
          <DDropdownItem>Secondary Action 2</DDropdownItem>
          <DDropdownItem>Secondary Action 3</DDropdownItem>
        </DDropdown>

        <DDropdown split text="Save" variant="success">
          <DDropdownItem>Save as Draft</DDropdownItem>
          <DDropdownItem>Save as Template</DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem>Export</DDropdownItem>
        </DDropdown>
      </div>
    </div>

    <div class="example-section">
      <h5>Dropdown Sizes</h5>
      <div class="dropdown-group">
        <DDropdown text="Small" variant="primary" size="sm">
          <DDropdownItem>Action 1</DDropdownItem>
          <DDropdownItem>Action 2</DDropdownItem>
        </DDropdown>

        <DDropdown text="Default" variant="primary">
          <DDropdownItem>Action 1</DDropdownItem>
          <DDropdownItem>Action 2</DDropdownItem>
        </DDropdown>

        <DDropdown text="Large" variant="primary" size="lg">
          <DDropdownItem>Action 1</DDropdownItem>
          <DDropdownItem>Action 2</DDropdownItem>
        </DDropdown>
      </div>
    </div>

    <div class="example-section">
      <h5>Dropdown Directions</h5>
      <div class="dropdown-group">
        <DDropdown text="Dropup" variant="primary" dropup>
          <DDropdownItem>Action 1</DDropdownItem>
          <DDropdownItem>Action 2</DDropdownItem>
          <DDropdownItem>Action 3</DDropdownItem>
        </DDropdown>

        <DDropdown text="Dropend" variant="primary" dropend>
          <DDropdownItem>Action 1</DDropdownItem>
          <DDropdownItem>Action 2</DDropdownItem>
          <DDropdownItem>Action 3</DDropdownItem>
        </DDropdown>

        <DDropdown text="Dropstart" variant="primary" dropstart>
          <DDropdownItem>Action 1</DDropdownItem>
          <DDropdownItem>Action 2</DDropdownItem>
          <DDropdownItem>Action 3</DDropdownItem>
        </DDropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DDropdown, DDropdownItem, DDropdownDivider } from '@omnitend/dashboard-for-laravel';

</script>

<style scoped>
.dropdown-examples {
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
