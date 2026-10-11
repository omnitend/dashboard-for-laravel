<template>
  <div
    v-if="isVisible"
    class="dx-loading py-5"
    role="status"
    aria-live="polite"
  >
    <DSpinner small aria-hidden="true" />
    <p class="dx-loading__text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import DSpinner from "../base/DSpinner.vue";

// Styles (one line, grey, a slow sweep across the text, a fade-in) are global
// in theme.scss under `.dx-loading`, with `--dx-loading-*` colour tokens.
const props = withDefaults(
  defineProps<{
    text?: string;
    /** Milliseconds to wait before showing anything. Most loads finish
     *  sooner, and one that has already taken this long is likely to take
     *  longer, so a quick load never flashes a loader. */
    delay?: number;
  }>(),
  {
    text: "Loading…",
    delay: 600,
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
