<!--
  @component (internal — not exported)
  A field's `prepend`/`append` unit text around its input (DXField, and
  DXNumericField's `number` and `percentage`). DXField renders this ONLY when
  the field has an affix, so a field without one keeps its bare input: the
  markup of every other field is unchanged.

  - Editable or `readonly`: a DInputGroup with an `.input-group-text` cell
    before and/or after the input (the default slot). Each cell has an id,
    and the slot's `describedBy` names them (after any id the consumer passed
    through `inputProps`), so the input reads "Online notice, 120, minutes".
  - `plaintext`: the value followed by the unit as one line of static text,
    "120 minutes". An input group around a borderless input would leave the
    unit at the far edge of the row in a grey box. An empty value shows
    neither, rather than a unit with nothing to qualify.
-->
<template>
    <div
        v-if="plaintext"
        class="form-control-plaintext dx-field-affix-plaintext"
    >{{ plaintextText }}</div>
    <DInputGroup v-else class="dx-field-affix">
        <template v-if="prepend" #prepend>
            <span :id="prependId" class="input-group-text">{{ prepend }}</span>
        </template>
        <!--
          @slot The input.
          @binding {string | undefined} describedBy The value for the input's `aria-describedby`: the affix cells' ids, after the consumer's own.
        -->
        <slot :described-by="describedBy" />
        <template v-if="append" #append>
            <span :id="appendId" class="input-group-text">{{ append }}</span>
        </template>
    </DInputGroup>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";
import DInputGroup from "../base/DInputGroup.vue";

interface Props {
    /** Resolved leading text. Empty or undefined: no leading cell. */
    prepend?: string;

    /** Resolved trailing text. Empty or undefined: no trailing cell. */
    append?: string;

    /** Show the value and its unit as static text instead of the group. */
    plaintext?: boolean;

    /** The value as the input shows it (plaintext only). */
    value?: unknown;

    /** The consumer's own `aria-describedby` (from `inputProps`), kept first. */
    consumerDescribedBy?: string;
}

const props = defineProps<Props>();

const idBase = useId();
const prependId = `${idBase}-prepend`;
const appendId = `${idBase}-append`;

const describedBy = computed<string | undefined>(() => {
    const ids = [
        props.consumerDescribedBy,
        props.prepend ? prependId : undefined,
        props.append ? appendId : undefined,
    ].filter((id): id is string => id !== undefined && id !== "");
    return ids.length > 0 ? ids.join(" ") : undefined;
});

const plaintextText = computed(() => {
    const value = props.value;
    if (value === null || value === undefined || value === "") return "";
    let text = String(value);
    if (props.prepend) text = `${props.prepend} ${text}`;
    // "20%", not "20 %": a percent sign sits against its number.
    if (props.append) {
        text += props.append.startsWith("%") ? props.append : ` ${props.append}`;
    }
    return text;
});
</script>
