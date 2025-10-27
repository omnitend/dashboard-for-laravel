<template>
  <div class="examples">
    <div class="example-section">
      <h5>Button Group</h5>
      <DButtonGroup>
        <DButton variant="primary">Left</DButton>
        <DButton variant="primary">Middle</DButton>
        <DButton variant="primary">Right</DButton>
      </DButtonGroup>
    </div>

    <div class="example-section">
      <h5>Vertical Button Group</h5>
      <DButtonGroup vertical>
        <DButton variant="secondary">Top</DButton>
        <DButton variant="secondary">Middle</DButton>
        <DButton variant="secondary">Bottom</DButton>
      </DButtonGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DButtonGroup, DButton } from '@omni-tend/dashboard-for-laravel';

</script>
