<!--
  @component
  Wrapper around bootstrap-vue-next's BModal. Two defaults differ from bvn's:
  `size="lg"` (room for horizontal form labels on desktop) and
  `fullscreen="sm"`: below 576px the modal covers the whole screen, with the
  header and footer pinned and the body scrolling between them (Bootstrap's
  `.modal-fullscreen-sm-down`). A `size="sm"` modal (a short confirmation)
  keeps the centred small dialog on phones too. Pass `fullscreen` explicitly to
  override either way, e.g. `:fullscreen="false"` to opt out.
-->
<template>
  <BModal size="lg" :fullscreen="defaultFullscreen()" v-bind="$attrs">
    <template #default="slotProps">
      <slot v-bind="slotProps" />
      <DXModalActions v-if="$slots.actions" class="mt-3">
        <slot name="actions" v-bind="slotProps" />
      </DXModalActions>
    </template>
    <template v-for="name in forwardedSlots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BModal>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from "vue";
import { BModal } from "bootstrap-vue-next";
import DXModalActions from "../extended/DXModalActions.vue";

const slots = useSlots();
const attrs = useAttrs();
const forwardedSlots = computed(() => Object.keys(slots).filter(name => name !== "default" && name !== "actions"));

// Full screen below `sm` unless the modal is a small dialog. An explicit
// `fullscreen` from the consumer wins: it is in $attrs, which also fall
// through onto the root BModal after its own bindings. A function, not a
// computed: `useAttrs()` is not reactive, but the template re-runs it on every
// render, which an attrs change triggers.
const defaultFullscreen = (): "sm" | undefined => (attrs.size === "sm" ? undefined : "sm");
</script>
