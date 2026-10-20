<!--
  Type-level test, compiled by `npm run typecheck` (tests/types/tsconfig.json),
  never rendered. Pins DXField's `password-actions` slot props as a consumer
  sees them (vue-tsc infers them from DXField's `<slot>`), and that they stay
  assignable to the exported `PasswordActionsSlotProps`, so the documented
  type and the real slot cannot drift apart. Each `@vue-expect-error` is a
  misuse that must stay an error; an unused directive fails vue-tsc.
-->
<template>
  <DXField :field="field" :form="form">
    <template #password-actions="slotProps">
      {{ takesSlotProps(slotProps) }}
      {{ slotProps.setRevealed(true) }} {{ slotProps.update('generated') }}
      {{ takesBoolean(slotProps.revealed) }} {{ takesBoolean(slotProps.disabled) }}
      <!-- @vue-expect-error setRevealed takes a boolean -->
      {{ slotProps.setRevealed('yes') }}
      <!-- @vue-expect-error revealed is a boolean -->
      {{ takesString(slotProps.revealed) }}
    </template>
  </DXField>
</template>

<script setup lang="ts">
import DXField from '../../resources/js/components/extended/DXField.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition, PasswordActionsSlotProps } from '../../resources/js/types';

const field: FieldDefinition = { key: 'password', type: 'password', label: 'Password' };
const form = useForm({ password: '' });

const takesSlotProps = (value: PasswordActionsSlotProps) => value;
const takesString = (value: string) => value;
const takesBoolean = (value: boolean) => value;
</script>
