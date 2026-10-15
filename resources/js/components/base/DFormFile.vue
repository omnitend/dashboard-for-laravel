/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormFile component.
 * File picker with a browse button, file-name display and drag-and-drop
 * zone. `v-model` is a `File` (single), `File[]` (`multiple`/`directory`)
 * or `null`. Slots: `label`, `placeholder`, `file-name` (`{ files, names }`)
 * and `drop-placeholder`. Exposes BFormFile's `focus`, `blur` and `reset`.
 */
<script setup lang="ts">
import { computed, ref } from "vue";
import { BFormFile } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});

const bFormFileRef = ref<InstanceType<typeof BFormFile> | null>(null);

// A template ref on the wrapper would otherwise stop at the wrapper, so
// `reset()` (the only way to clear the native input's selection) is passed on.
defineExpose({
  focus: () => bFormFileRef.value?.focus(),
  blur: () => bFormFileRef.value?.blur(),
  reset: () => bFormFileRef.value?.reset(),
  element: computed(() => bFormFileRef.value?.element ?? null),
});
</script>

<template>
  <BFormFile ref="bFormFileRef" v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormFile>
</template>
