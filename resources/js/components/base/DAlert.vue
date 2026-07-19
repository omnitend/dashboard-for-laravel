<script setup lang="ts">
import { BAlert } from "bootstrap-vue-next";
import { useSlots } from "vue";

/*
 * bootstrap-vue-next's BAlert defaults `modelValue` to `false`, so a bare static
 * `<DAlert variant="info">…</DAlert>` silently renders NOTHING — a footgun that
 * bit our own docs repeatedly (#144). Default it to `true` (visible) at the
 * wrapper; every call site that already passes `v-model`/`:model-value` is
 * unaffected — only the bare-static case (which was always a bug) changes.
 *
 * Care (see DIVERGENCES.md): declaring `modelValue` as a prop strips it from
 * `$attrs`, so it is re-bound explicitly below. `emits` is left UNDECLARED so an
 * `update:modelValue` listener keeps flowing through `$attrs` to BAlert — that's
 * what lets `v-model` dismissal (and the auto-dismiss countdown) still
 * round-trip. The type stays `boolean | number` (a number is the auto-dismiss
 * duration in ms) — don't narrow it.
 */
const props = withDefaults(defineProps<{ modelValue?: boolean | number }>(), {
  modelValue: true,
});

const slots = useSlots();
</script>

<template>
  <BAlert :model-value="props.modelValue" v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BAlert>
</template>
