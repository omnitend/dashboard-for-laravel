<!--
  @component (internal — not exported)
  The choice control family for DXField: `select` (plain or `searchable`),
  `radio`, and `checkbox-group`. Extracted from DXField (#135) unchanged. These
  share the "no native readonly" convention (read-only is expressed as
  `disabled`, hence the pre-merged `disabled` + `controlProps`). The parent
  DXField still owns the value/options/guards and the `setValue` coercion; this
  component only renders the control and emits the edited value up.

  Plain-text `autocomplete` (a text input + datalist) stays in DXField itself,
  with the text-family controls, because it uses the native-readonly guard path
  rather than this disabled-only convention.
-->
<template>
    <!-- Searchable select: type to filter a long option list, while the model
         keeps the option's VALUE (an id), not the typed text. -->
    <template v-if="field.type === 'select' && field.searchable">
        <DAutocomplete
            v-if="optionsReady"
            :model-value="modelValue"
            :options="options"
            :placeholder="field.placeholder"
            :required="field.required"
            :state="state"
            :disabled="disabled"
            open-on-focus
            v-bind="controlProps"
            @update:model-value="emit('update:modelValue', $event)"
        />
        <!-- BAutocomplete resolves the input's display text from the model AT
             MOUNT and doesn't re-derive it when `options` arrive later, so an
             async list would leave the raw id showing ("51" instead of
             "Waitrose") — and a long list is exactly the case that loads async.
             Hold the control until the options are in. -->
        <DFormInput v-else placeholder="Loading…" disabled />
    </template>

    <!-- Select (sync or async options) -->
    <DFormSelect
        v-else-if="field.type === 'select'"
        :model-value="modelValue"
        :required="field.required"
        :options="options"
        :state="state"
        :disabled="disabled"
        v-bind="controlProps"
        @update:model-value="emit('update:modelValue', $event)"
    />

    <!-- Radio group -->
    <DFormRadioGroup
        v-else-if="field.type === 'radio'"
        :model-value="modelValue"
        :options="options"
        :required="field.required"
        :state="state"
        :disabled="disabled"
        v-bind="controlProps"
        @update:model-value="emit('update:modelValue', $event)"
    />

    <!-- Checkbox group: "pick any of N" — the model is an ARRAY of the checked
         option values (default the field to []). -->
    <DFormCheckboxGroup
        v-else
        :model-value="modelValue"
        :options="options"
        :state="state"
        :disabled="disabled"
        v-bind="controlProps"
        @update:model-value="emit('update:modelValue', $event)"
    />
</template>

<script setup lang="ts">
import DFormSelect from "../base/DFormSelect.vue";
import DFormRadioGroup from "../base/DFormRadioGroup.vue";
import DFormCheckboxGroup from "../base/DFormCheckboxGroup.vue";
import DFormInput from "../base/DFormInput.vue";
import DAutocomplete from "../base/DAutocomplete.vue";
import type { FieldDefinition, FieldOption } from "../../types";

interface Props {
    /** Field definition (type select/radio/checkbox-group + `searchable`). */
    field: FieldDefinition;

    /** Current model value. */
    modelValue: any;

    /** Resolved options (async-loaded or static). */
    options?: FieldOption[];

    /** Validation state passed to the control. */
    state?: boolean | null;

    /** Pre-merged disabled state (`isDisabled || isReadonly || isPlaintext`). */
    disabled?: boolean;

    /** Escape-hatch control props, already guard-merged by DXField. */
    controlProps?: Record<string, any>;

    /**
     * Whether async options have resolved (a searchable select must not render
     * before its options load, or it shows the raw id instead of the label).
     */
    optionsReady?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
    (event: "update:modelValue", value: any): void;
}>();
</script>
