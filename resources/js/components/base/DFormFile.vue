/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormFile component.
 * File picker with a browse button, file-name display and drag-and-drop
 * zone. `v-model` is a `File` (single), `File[]` (`multiple`/`directory`)
 * or `null`; setting it to `null` also clears the native input. Slots:
 * `label`, `placeholder`, `file-name` (`{ files, names }`) and
 * `drop-placeholder`. Exposes BFormFile's `focus`, `blur` and `reset`.
 */
<script setup lang="ts">
import { ref, watch } from "vue";
import { BFormFile } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});

const bFormFileRef = ref<InstanceType<typeof BFormFile> | null>(null);

// bvn clears its own file list when the model becomes null, but in the
// custom control it leaves the hidden native input holding the file, so a
// plain form submit (FormData) still posted it. Call bvn's reset() then.
// Read from BFormFile's own props: they are reactive and normalised
// (`modelValue` whether the parent wrote `v-model` or `:model-value`).
// Divergence from bvn: DIVERGENCES.md.
watch(
  () => bFormFileRef.value?.$props.modelValue,
  (modelValue, previousModelValue) => {
    if (modelValue === null && previousModelValue !== null && previousModelValue !== undefined) {
      bFormFileRef.value?.reset();
    }
  }
);

// A template ref on the wrapper would otherwise stop at the wrapper, so
// `reset()` (the only way to clear the native input's selection) is passed on.
defineExpose({
  focus: () => bFormFileRef.value?.focus(),
  blur: () => bFormFileRef.value?.blur(),
  reset: () => bFormFileRef.value?.reset(),
  get element() {
    return bFormFileRef.value?.element ?? null;
  },
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
