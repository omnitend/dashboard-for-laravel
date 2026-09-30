<template>
  <BModal size="lg" v-bind="$attrs">
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
import { computed, useSlots } from "vue";
import { BModal } from "bootstrap-vue-next";
import DXModalActions from "../extended/DXModalActions.vue";

const slots = useSlots();
const forwardedSlots = computed(() => Object.keys(slots).filter(name => name !== "default" && name !== "actions"));
</script>
