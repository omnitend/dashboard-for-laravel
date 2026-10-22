/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BInputGroup component.
 * Easily extend form controls by adding text, buttons, or button groups.
 */
<script setup lang="ts">
/**
 * Adds `wrap`: below md, a group with two or more controls wraps (its leading
 * text takes its own row as a label). `wrap="never"` keeps a "sentence" group,
 * such as `Every [1] [days]` or `£ [cost] ex. VAT`, joined at every width by
 * adding the `dx-input-group--joined` class, which plain `.input-group`
 * markup can use directly.
 *
 * @example
 * ```vue
 * <DInputGroup prepend="Every" wrap="never">
 *   <DFormInput type="number" />
 *   <DFormSelect :options="units" />
 * </DInputGroup>
 * ```
 */
import { BInputGroup } from "bootstrap-vue-next";

interface Props {
  /**
   * How a group with two or more controls behaves below md (768px).
   *
   * - `'narrow'` wraps it: a leading text label takes its own row and the
   *   controls sit beneath it as separate controls.
   * - `'never'` keeps it one joined control at every width, for groups whose
   *   text is an affix or part of a sentence rather than a label. Renders the
   *   `dx-input-group--joined` class.
   *
   * A group with one control never wraps either way.
   * @default 'narrow'
   */
  wrap?: "narrow" | "never";
}

withDefaults(defineProps<Props>(), {
  wrap: "narrow",
});

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BInputGroup
    v-bind="$attrs"
    :class="{ 'dx-input-group--joined': wrap === 'never' }"
  >
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BInputGroup>
</template>
