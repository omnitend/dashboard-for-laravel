<!--
  @component (internal — not exported)
  The chrome every DXField branch shares: the optional label (with its info
  affordance and, in horizontal layout, its hint), the control (default slot),
  and the trailing validation feedback + info block + hint + static help. Before
  #135 this markup was re-rendered separately in each of DXField's ~7 branches;
  it now lives here once.

  Two shapes:
  - `mode="group"` — root is a `DFormGroup` that owns the `#label` column and
    holds the control + trailing block inside it (standard / horizontal
    checkbox / horizontal switch).
  - `mode="plain"` — root is a plain `div`; the control renders its own inline
    label (vertical checkbox/switch), or a heading/rows (switch-list), or a
    nested group (repeater). The trailing block follows the control in the div.

  The `hint` and `info` slots are forwarded down from DXField (content AND slot
  props). `hint` falls back to `{{ resolvedHint }}` when no slot is supplied.
-->
<template>
    <DFormGroup
        v-if="mode === 'group'"
        :class="wrapperClass"
        v-bind="groupAttrs"
    >
        <template v-if="!hideLabel" #label>
            <DXFieldLabel :label="label" :info="info" />
            <small
                v-if="hintInLabel && (resolvedHint || $slots.hint)"
                class="form-text text-muted d-block dx-field-hint"
            >
                <slot name="hint" :field="field" :model="model">{{
                    resolvedHint
                }}</slot>
            </small>
        </template>

        <slot />

        <DFormInvalidFeedback v-if="form.hasError(errorKey)" force-show>
            {{ form.getError(errorKey) }}
        </DFormInvalidFeedback>
        <slot name="info" :field="field" :model="model" />
        <DFormText
            v-if="!hintInLabel && (resolvedHint || $slots.hint)"
            class="text-muted"
        >
            <slot name="hint" :field="field" :model="model">{{
                resolvedHint
            }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </DFormGroup>

    <div v-else :class="wrapperClass">
        <slot />

        <DFormInvalidFeedback v-if="form.hasError(errorKey)" force-show>
            {{ form.getError(errorKey) }}
        </DFormInvalidFeedback>
        <slot name="info" :field="field" :model="model" />
        <DFormText v-if="resolvedHint || $slots.hint" class="text-muted">
            <slot name="hint" :field="field" :model="model">{{
                resolvedHint
            }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </div>
</template>

<script setup lang="ts">
import DFormGroup from "../base/DFormGroup.vue";
import DFormInvalidFeedback from "../base/DFormInvalidFeedback.vue";
import DFormText from "../base/DFormText.vue";
import DXFieldLabel from "./DXFieldLabel.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { FieldDefinition } from "../../types";

interface Props {
    /** The field definition (for `field.help` and slot props). */
    field: FieldDefinition;

    /** Form instance owning the field's errors. */
    form: UseFormReturn<any>;

    /** Error key for validation lookups. */
    errorKey: string;

    /** Model passed to `hint`/`info` slot props. */
    model?: any;

    /**
     * Layout shape. `group` = DFormGroup root with a label column; `plain` =
     * plain div, the control owning its own inline label/heading.
     */
    mode: "group" | "plain";

    /** Wrapper class (`field.class || 'mb-3'`). */
    wrapperClass?: string;

    /** BFormGroup attrs (horizontal label-cols etc.); group mode only. */
    groupAttrs?: Record<string, any>;

    /** Resolved label text (group mode). Always supplied by DXField. */
    label: string;

    /** Resolved info text for the label popover (group mode). */
    info?: string;

    /** Skip the label column entirely (group mode). */
    hideLabel?: boolean;

    /**
     * Whether the hint sits in the label column (horizontal) rather than below
     * the control. Group mode only; plain mode always renders the hint below.
     */
    hintInLabel?: boolean;

    /** Resolved hint text (fallback when no `hint` slot is supplied). */
    resolvedHint?: string;
}

defineProps<Props>();
</script>
