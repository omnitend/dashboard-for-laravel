<template>
  <div class="examples">
    <div class="example-section">
      <h5>Tag Input</h5>
      <DFormTags
        v-model="tags"
        placeholder="Add tags..."
        duplicate-tag-text="Duplicate tag!"
      />
      <p class="mt-2">Tags: <strong>{{ tags.join(", ") }}</strong></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DFormTags } from '@omni-tend/dashboard-for-laravel';

import { ref } from "vue";

const tags = ref(["vue", "bootstrap", "typescript"]);
</script>
