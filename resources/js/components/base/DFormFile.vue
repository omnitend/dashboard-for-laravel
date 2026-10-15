/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormFile component.
 * File picker with a browse button, file-name display and drag-and-drop
 * zone. `v-model` is a `File` (single), `File[]` (`multiple`/`directory`)
 * or `null`; setting it to `null` (or `[]`) also clears the native input.
 * A disabled control (the prop, or a disabled fieldset) ignores dropped
 * files. Slots: `label`, `placeholder`, `file-name` (`{ files, names }`)
 * and `drop-placeholder`. Exposes BFormFile's `focus`, `blur` and `reset`.
 */
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { BFormFile } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});

const bFormFileRef = ref<InstanceType<typeof BFormFile> | null>(null);

const rootElement = (): HTMLElement | null => {
  const element = bFormFileRef.value?.$el as unknown;
  return element instanceof HTMLElement ? element : null;
};

const nativeInput = (): HTMLInputElement | null =>
  rootElement()?.querySelector<HTMLInputElement>('input[type="file"]') ?? null;

// bvn's drop handler checks only `noDrop`, so a disabled control still took
// a dropped file. `disabled` arrives as `true`, `""` (the bare attribute) or
// `"disabled"`; only false/null/undefined leave it enabled. A consumer's own
// `noDrop` wins. Divergence from bvn: DIVERGENCES.md.
const dropShield = (attrs: Record<string, unknown>): Record<string, unknown> => {
  const disabled = attrs.disabled;
  const isDisabled = disabled === "" || (disabled !== undefined && disabled !== null && disabled !== false);
  const hasOwnNoDrop = "noDrop" in attrs || "no-drop" in attrs;
  return isDisabled && !hasOwnNoDrop ? { noDrop: true } : {};
};

// A disabled fieldset disables the native input without the prop, so the
// attrs cannot see it. Capture the drag events on BFormFile's root (useDropZone
// listens on the drop zone inside it) and stop them while the input is
// :disabled. dragleave too, or useDropZone's enter/leave counter drifts and
// the overlay sticks once the control is enabled again.
const blockedDragEvents = ["dragenter", "dragover", "dragleave", "drop"] as const;
let listeningRoot: HTMLElement | null = null;

const stopDragWhileDisabled = (event: Event) => {
  if (nativeInput()?.matches(":disabled")) {
    event.stopPropagation();
    // Without this the browser opens a dropped file in the tab.
    event.preventDefault();
  }
};

onMounted(() => {
  listeningRoot = rootElement();
  blockedDragEvents.forEach((type) =>
    listeningRoot?.addEventListener(type, stopDragWhileDisabled, { capture: true })
  );
});

onBeforeUnmount(() => {
  blockedDragEvents.forEach((type) =>
    listeningRoot?.removeEventListener(type, stopDragWhileDisabled, { capture: true })
  );
  listeningRoot = null;
});

// bvn clears its own file list when the model becomes null or [], but in the
// custom control it leaves the hidden native input holding the files (and
// `plain` keeps them on []), so a plain form submit (FormData) still posted
// them. Clear the native input directly: bvn's reset() would also set the
// model to null, echoing an extra update:modelValue to the parent.
// Read from BFormFile's own props: they are reactive and normalised
// (`modelValue` whether the parent wrote `v-model` or `:model-value`).
// Divergence from bvn: DIVERGENCES.md.
const isCleared = (value: unknown) =>
  value === null || value === undefined || (Array.isArray(value) && value.length === 0);

watch(
  () => bFormFileRef.value?.$props.modelValue,
  (modelValue, previousModelValue) => {
    if (isCleared(modelValue) && !isCleared(previousModelValue)) {
      const input = nativeInput();
      if (input) {
        input.value = "";
      }
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
  <BFormFile ref="bFormFileRef" v-bind="{ ...$attrs, ...dropShield($attrs) }">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormFile>
</template>
