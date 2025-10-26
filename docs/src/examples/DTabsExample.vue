<template>
  <div class="examples">
    <div class="example-section">
      <h5>Tabbed Interface</h5>
      <DTabs content-class="mt-3">
        <BTab title="First Tab" active>
          <p>This is the content of the first tab.</p>
        </BTab>
        <BTab title="Second Tab">
          <p>This is the content of the second tab.</p>
        </BTab>
        <BTab title="Disabled Tab" disabled>
          <p>This tab is disabled.</p>
        </BTab>
      </DTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import DTabs from "../../../resources/js/components/base/DTabs.vue";
import { BTab } from "bootstrap-vue-next";
</script>
