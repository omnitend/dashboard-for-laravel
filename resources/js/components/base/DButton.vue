<script setup lang="ts">
/**
 * DButton - A type-safe wrapper around Bootstrap Vue Next's BButton component
 *
 * @component
 * @example
 * ```vue
 * <DButton variant="primary" size="lg">Click Me</DButton>
 * <DButton variant="link-danger" @click="handleClick">Delete</DButton>
 * ```
 */
import { BButton } from "bootstrap-vue-next";
import type { ButtonVariant, Size } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();

type LinkVariant =
  | "link-primary"
  | "link-secondary"
  | "link-success"
  | "link-danger"
  | "link-warning"
  | "link-info"
  | "link-light"
  | "link-dark";

interface Props {
  /**
   * The visual style variant of the button
   * @default 'primary'
   */
  variant?: ButtonVariant | LinkVariant | null;

  /**
   * The size of the button. Omit for the default (medium) size —
   * bootstrap-vue-next 0.45 removed the no-op `'md'` value from `Size`.
   */
  size?: Size;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
});
</script>

<template>
  <BButton
    :variant="variant"
    :size="size"
    v-bind="$attrs"
  >
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BButton>
</template>
