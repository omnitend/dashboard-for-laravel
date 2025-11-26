<template>
  <div class="examples">
    <div class="example-section">
      <h5>List Group Items</h5>
      <DListGroup>
        <DListGroupItem>Basic item</DListGroupItem>
        <DListGroupItem active>Active item</DListGroupItem>
        <DListGroupItem disabled>Disabled item</DListGroupItem>
        <DListGroupItem variant="primary">Primary variant</DListGroupItem>
        <DListGroupItem variant="success">Success variant</DListGroupItem>
        <DListGroupItem variant="danger">Danger variant</DListGroupItem>
      </DListGroup>
    </div>

    <div class="example-section">
      <h5>Actionable Items</h5>
      <DListGroup>
        <DListGroupItem button @click="handleClick('Item 1')">Clickable item 1</DListGroupItem>
        <DListGroupItem button @click="handleClick('Item 2')">Clickable item 2</DListGroupItem>
        <DListGroupItem href="https://example.com" target="_blank">Link item</DListGroupItem>
      </DListGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DListGroup, DListGroupItem } from '@omnitend/dashboard-for-laravel';

const handleClick = (item: string) => {
  alert(`Clicked: ${item}`);
};
</script>

<style scoped>
.examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
