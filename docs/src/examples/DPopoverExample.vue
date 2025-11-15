<template>
  <div class="examples">
    <div class="example-section">
      <h5>Popover</h5>
      <DButton id="popover-button" variant="primary">Hover Me</DButton>
      <DPopover target="popover-button" triggers="hover" placement="top">
        <template #title>Popover Title</template>
        This is the popover content. It can contain any HTML.
      </DPopover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DPopover, DButton } from '@omnitend/dashboard-for-laravel';

</script>
