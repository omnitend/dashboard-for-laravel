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
import { ref } from "vue";
import DOverlay from "../../../resources/js/components/base/DOverlay.vue";
import DCard from "../../../resources/js/components/base/DCard.vue";
import DButton from "../../../resources/js/components/base/DButton.vue";

const showOverlay = ref(false);
</script>
