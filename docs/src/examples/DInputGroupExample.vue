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

    <div class="example-section">
      <h5>Several controls (wraps below md)</h5>
      <DInputGroup prepend="Date range" class="w-auto">
        <DFormInput type="date" />
        <DFormInput type="date" />
      </DInputGroup>
    </div>

    <div class="example-section">
      <h5>A sentence group that never wraps</h5>
      <DInputGroup prepend="Every" wrap="never" class="w-auto">
        <DFormInput type="number" model-value="1" />
        <DFormSelect model-value="days" :options="['days', 'weeks', 'months']" />
      </DInputGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DInputGroup, DFormInput, DFormSelect, DButton } from '@omnitend/dashboard-for-laravel';

</script>
