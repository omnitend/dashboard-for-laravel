<template>
  <div
    v-if="isVisible"
    class="dx-loading text-center text-muted py-5"
    role="status"
    aria-live="polite"
  >
    <DSpinner variant="primary" aria-hidden="true" />
    <div class="mt-2">{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import DSpinner from "../base/DSpinner.vue";

const props = withDefaults(
  defineProps<{
    text?: string;
    delay?: number;
  }>(),
  {
    text: "Loading…",
    delay: 300,
  },
);

const isVisible = ref(false);
let showTimer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  if (props.delay <= 0) {
    isVisible.value = true;
    return;
  }

  showTimer = setTimeout(() => {
    isVisible.value = true;
  }, props.delay);
});

onBeforeUnmount(() => {
  if (showTimer !== undefined) {
    clearTimeout(showTimer);
  }
});
</script>
