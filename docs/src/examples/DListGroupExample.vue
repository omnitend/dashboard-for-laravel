<template>
  <div class="examples">
    <div class="example-section">
      <h5>Basic List Group</h5>
      <DListGroup>
        <BListGroupItem>First item</BListGroupItem>
        <BListGroupItem active>Second item (active)</BListGroupItem>
        <BListGroupItem>Third item</BListGroupItem>
        <BListGroupItem disabled>Fourth item (disabled)</BListGroupItem>
      </DListGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import DListGroup from "../../../resources/js/components/base/DListGroup.vue";
import { BListGroupItem } from "bootstrap-vue-next";
</script>
