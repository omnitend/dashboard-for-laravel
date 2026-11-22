<template>
  <!-- An app mounts DApp once, around everything. Each docs example is its
       own Vue app (an Astro island), so this demo mounts its own. -->
  <DApp>
    <DToastDemoButtons />
  </DApp>
</template>

<script setup lang="ts">
import { DApp } from '@omnitend/dashboard-for-laravel';
import DToastDemoButtons from './DToastDemoButtons.vue';
</script>
