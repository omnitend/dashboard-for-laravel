<template>
  <div class="examples">
    <div class="example-section">
      <h5>Button Toolbar</h5>
      <DButtonToolbar>
        <DButtonGroup class="me-2">
          <DButton variant="primary">1</DButton>
          <DButton variant="primary">2</DButton>
          <DButton variant="primary">3</DButton>
        </DButtonGroup>
        <DButtonGroup class="me-2">
          <DButton variant="secondary">4</DButton>
          <DButton variant="secondary">5</DButton>
        </DButtonGroup>
        <DButtonGroup>
          <DButton variant="success">6</DButton>
        </DButtonGroup>
      </DButtonToolbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import DButtonToolbar from "../../../resources/js/components/base/DButtonToolbar.vue";
import DButtonGroup from "../../../resources/js/components/base/DButtonGroup.vue";
import DButton from "../../../resources/js/components/base/DButton.vue";
</script>
