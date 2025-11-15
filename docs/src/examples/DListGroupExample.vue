<template>
  <div class="examples">
    <div class="example-section">
      <h5>Basic List Group</h5>
      <DListGroup>
        <DListGroupItem>First item</DListGroupItem>
        <DListGroupItem active>Second item (active)</DListGroupItem>
        <DListGroupItem>Third item</DListGroupItem>
        <DListGroupItem disabled>Fourth item (disabled)</DListGroupItem>
      </DListGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DListGroup, DListGroupItem } from '@omnitend/dashboard-for-laravel';

</script>
