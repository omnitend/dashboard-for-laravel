<template>
  <div class="examples">
    <div class="example-section">
      <h5>Basic Breadcrumb</h5>
      <DBreadcrumb :items="items" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DBreadcrumb } from '@omni-tend/dashboard-for-laravel';


const items = [
  { text: "Home", href: "/" },
  { text: "Library", href: "/library" },
  { text: "Data", active: true }
];
</script>
