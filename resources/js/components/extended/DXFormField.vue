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
       also supersedes field-before/field-after for the same key. Rendered
       as-is, with no wrapper (#194): `targetAttrs` is the marker DXForm
       looks for to scroll to and focus a field after a failed submit, and
       the consumer opts in by binding it (`v-bind="targetAttrs"`) on the
       element holding the control. Whether they did is reported to DXForm
       (`slot-target`), so an unmarked field's summary row is plain text. -->
  <slot
    v-if="$slots[`field(${field.key})`]"
    :name="`field(${field.key})`"
    :field="field"
    :model="model"
    :targetAttrs="targetAttrs"
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
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  useSlots,
} from "vue";
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

const emit = defineEmits<{
  /**
   * For a `field(<key>)` slot, after each render: whether an element carrying
   * the field's marker (`targetAttrs`) is in what the slot rendered. `null`
   * when the field is not (or no longer) rendered through the slot.
   */
  "slot-target": [fieldKey: string, marked: boolean | null];
}>();

const MARKER_ATTRIBUTE = "data-dx-field-key";

/** What a `field(<key>)` slot binds to opt in to scroll/focus (#194). */
const targetAttrs = computed(() => ({ [MARKER_ATTRIBUTE]: props.field.key }));

const instance = getCurrentInstance();

function hasMarker(node: Node, key: string): boolean {
  if (!(node instanceof Element)) return false;
  if (node.getAttribute(MARKER_ATTRIBUTE) === key) return true;
  for (const element of Array.from(node.querySelectorAll(`[${MARKER_ATTRIBUTE}]`))) {
    if (element.getAttribute(MARKER_ATTRIBUTE) === key) return true;
  }
  return false;
}

/**
 * Whether the slot's rendered DOM holds the marker. The slot renders as a
 * fragment, so its nodes are the siblings between the fragment's start and
 * end anchors (Vue's own, present without the wrapper too).
 */
function slotIsMarked(): boolean {
  const subTree = instance?.subTree;
  const start = subTree?.el as Node | null | undefined;
  const end = subTree?.anchor as Node | null | undefined;
  if (!start) return false;
  if (!end) return hasMarker(start, props.field.key);
  for (let node: Node | null = start; node !== null; node = node.nextSibling) {
    if (hasMarker(node, props.field.key)) return true;
    if (node === end) break;
  }
  return false;
}

let reported: { key: string; marked: boolean | null } | null = null;

function report(): void {
  const key = props.field.key;
  const marked = slots[`field(${key})`] ? slotIsMarked() : null;
  if (reported !== null && reported.key !== key) emit("slot-target", reported.key, null);
  if (reported?.key === key && reported.marked === marked) return;
  reported = { key, marked };
  emit("slot-target", key, marked);
}

onMounted(report);
onUpdated(report);
onBeforeUnmount(() => {
  if (reported !== null) emit("slot-target", reported.key, null);
  reported = null;
});

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
