<template>
  <div class="examples">
    <div class="example-section">
      <h5>Basic Links</h5>
      <div class="d-flex flex-column gap-2">
        <DLink href="#">Default Link</DLink>
        <DLink href="#" variant="primary">Primary Link</DLink>
        <DLink href="#" variant="success">Success Link</DLink>
        <DLink href="#" disabled>Disabled Link</DLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DLink from "../../../resources/js/components/base/DLink.vue";
</script>
