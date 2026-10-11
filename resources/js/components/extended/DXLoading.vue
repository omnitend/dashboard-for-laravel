<template>
  <!-- The status box is there from the start, holding the loader's space
       with its contents hidden (theme.scss); the delay only reveals them.
       Content added to a live region already in the page is announced,
       where a region inserted with its text can be missed. -->
  <div
    class="dx-loading py-5"
    :class="{ 'dx-loading--shown': isVisible }"
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

// Styles (one line, grey, a slow sweep across the text, a fade-in, contents
// hidden until `.dx-loading--shown`) are global in theme.scss under
// `.dx-loading`, with `--dx-loading-*` tokens.
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
  // Always a timer, even for no delay: the empty status box must reach the
  // page a task before its contents, or the announcement can be missed.
  showTimer = setTimeout(() => {
    isVisible.value = true;
  }, Math.max(props.delay, 0));
});

onBeforeUnmount(() => {
  if (showTimer !== undefined) {
    clearTimeout(showTimer);
  }
});
</script>
