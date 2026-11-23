<script setup lang="ts">
import { BFormCheckbox } from "bootstrap-vue-next";
import { useSlots } from "vue";

defineOptions({
  inheritAttrs: false,
});

const slots = useSlots();

/**
 * bvn 0.46 dropped BFormCheckbox's `uncheckedValue` default (`false`) to
 * "no value", so an unticked box emitted `undefined`, which Laravel's
 * `boolean` rule rejects. Restore `false` (DIVERGENCES.md #9). The
 * consumer's attrs spread after the default, so their value wins in either
 * spelling: Vue camelises `unchecked-value` later in the same props object.
 * Not a declared prop, so Vue's Boolean casting never touches the consumer's
 * value (`unchecked-value=""` stays `""`).
 */
const withUncheckedDefault = (attrs: Record<string, unknown>) => ({
  uncheckedValue: false,
  ...attrs,
});
</script>

<template>
  <BFormCheckbox v-bind="withUncheckedDefault($attrs)">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </BFormCheckbox>
</template>
