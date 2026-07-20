<!--
  @component
  DXFormField — internal per-field renderer for DXForm.

  Owns the single per-field render block that DXForm's tabbed and flat layouts
  both need: the `field(<key>)` full-replacement slot, the
  `field-before(<key>)`/`field-after(<key>)` wrapper slots, and the `<DXField>`
  element with its `value`/`span`/`info`/`hint`/`repeater-row` slot forwarding.

  Extracted so those per-field props/slots are wired in ONE place — before this,
  DXForm carried two near-identical copies (tabbed + flat) and a new per-field
  prop had to be added to both, which was easy to miss (see #78/#83). DXForm
  forwards all of its slots into each instance; this component only reads the
  ones matching its field's key.

  Internal: not exported from the package index — consumers use DXForm.
-->
<template>
  <!-- Full replacement slot bypasses DXField entirely (mirrors tab-content):
       also supersedes field-before/field-after for the same key. -->
  <slot
    v-if="$slots[`field(${field.key})`]"
    :name="`field(${field.key})`"
    :field="field"
    :model="model"
  />
  <template v-else>
    <!-- Content inserted directly above the field. -->
    <slot :name="`field-before(${field.key})`" :field="field" :model="model" />

    <DXField
      :field="field"
      :form="form"
      :model="model"
      :layout="field.layout ?? layout"
      :label-cols="field.labelCols ?? labelCols"
      :hide-label="field.hideLabel"
    >
      <template
        v-for="(slotName, target) in fieldSlotMap()"
        :key="target"
        #[target]="slotProps"
      >
        <!-- Per-field overrides forwarded to DXField: value/span/info/hint/repeater-row. -->
        <slot :name="slotName" v-bind="slotProps" />
      </template>
    </DXField>

    <!-- Content inserted directly below the field. -->
    <slot :name="`field-after(${field.key})`" :field="field" :model="model" />
  </template>
</template>

<script setup lang="ts">
import { useSlots } from "vue";
import DXField from "./DXField.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { FieldDefinition, LabelCols } from "../../types";

interface Props {
  /** The field to render. */
  field: FieldDefinition;
  /** The resolved form instance (state, errors, submit helpers). */
  form: UseFormReturn<any>;
  /** Live form data merged with context, for slot bindings/predicates. */
  model: Record<string, any>;
  /** Form-level layout; overridden per-field by `field.layout`. */
  layout?: "vertical" | "horizontal";
  /** Form-level label column width; overridden per-field by `field.labelCols`. */
  labelCols?: LabelCols;
}

const props = defineProps<Props>();
const slots = useSlots();

/**
 * Map a DXField slot name to this field's keyed parent slot, when present.
 * A plain function (re-read each render) rather than a computed, so a slot the
 * consumer adds after mount is still picked up — matching DXForm's original
 * per-render behaviour before this component was extracted.
 */
function fieldSlotMap(): Record<string, string> {
  const key = props.field.key;
  const map: Record<string, string> = {};
  const candidates: Array<[string, string]> = [
    ["value", `value(${key})`],
    ["span", `span(${key})`],
    ["info", `info(${key})`],
    ["info-popover", `info-popover(${key})`],
    ["hint", `hint(${key})`],
    ["repeater-row", `repeater-row(${key})`],
    ["switch-list-item", `switch-list-item(${key})`],
  ];
  for (const [target, source] of candidates) {
    if (slots[source]) map[target] = source;
  }
  return map;
}
</script>
