<template>
  <div class="examples">
    <div class="example-section">
      <h5>Avatar Sizes</h5>
      <div class="d-flex gap-3 align-items-center">
        <DAvatar size="sm" text="SM" variant="primary" />
        <DAvatar text="MD" variant="secondary" />
        <DAvatar size="lg" text="LG" variant="success" />
      </div>
    </div>

    <div class="example-section">
      <h5>Avatar with Image</h5>
      <DAvatar
        src="https://picsum.photos/100"
        alt="User Avatar"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DAvatar from "../../../resources/js/components/base/DAvatar.vue";
</script>
