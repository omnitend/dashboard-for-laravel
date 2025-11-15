<template>
  <div class="examples">
    <div class="example-section">
      <h5>Overlay</h5>
      <DOverlay :show="showOverlay" variant="light" opacity="0.85" blur="2px">
        <DCard class="text-center">
          <p>This content can be overlaid</p>
          <DButton @click="showOverlay = !showOverlay" variant="primary">
            Toggle Overlay
          </DButton>
        </DCard>
      </DOverlay>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DOverlay, DCard, DButton } from '@omnitend/dashboard-for-laravel';

import { ref } from "vue";

const showOverlay = ref(false);
</script>
