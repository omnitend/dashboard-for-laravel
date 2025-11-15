<template>
  <div class="examples">
    <div class="example-section">
      <h5>Input Group with Prepend</h5>
      <DInputGroup prepend="@">
        <DFormInput placeholder="Username" />
      </DInputGroup>
    </div>

    <div class="example-section">
      <h5>Input Group with Button</h5>
      <DInputGroup>
        <DFormInput placeholder="Search..." />
        <template #append>
          <DButton variant="primary">Search</DButton>
        </template>
      </DInputGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DInputGroup, DFormInput, DButton } from '@omnitend/dashboard-for-laravel';

</script>
