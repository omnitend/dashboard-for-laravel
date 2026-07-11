<!--
  @component
  A form field label with an optional info affordance that reveals help text
  in a hover/focus popover next to the label.
-->
<template>
    <span class="dx-field-label">
        <span class="dx-field-label__text">{{ label }}</span>
        <template v-if="info || $slots.popover || popoverRender">
            <button
                :id="infoId"
                type="button"
                class="dx-field-label__info"
                :aria-label="`More information: ${label}`"
                @click.stop.prevent
            >
                <i-lucide-info aria-hidden="true" />
            </button>
            <DPopover
                :target="infoId"
                hover
                focus
                placement="top"
            >
                <!--
                  @slot Rich popover body. Overrides the plain `info` text — use
                  it for lists, bold, paragraphs. Falls back to `{{ info }}`.
                -->
                <slot name="popover">
                    <!-- DXField forwards its `info-popover` slot here via inject. -->
                    <component v-if="popoverRender" :is="popoverRender" />
                    <template v-else>{{ info }}</template>
                </slot>
            </DPopover>
        </template>
    </span>
</template>

<script setup lang="ts">
import { computed, inject, useId } from "vue";
import DPopover from "../base/DPopover.vue";
import { dxFieldInfoPopoverKey } from "./dxFieldContext";

interface Props {
    /** Visible label text. */
    label: string;

    /** Optional help text revealed in a popover from an info affordance. */
    info?: string;
}

defineProps<Props>();

// A rich popover body forwarded by a DXField ancestor (its `info-popover`
// slot), if any. The explicit `popover` slot still takes precedence for
// standalone use. Null when there's no DXField ancestor / no such slot.
const injectedPopover = inject(dxFieldInfoPopoverKey, null);
const popoverRender = computed(() => injectedPopover?.value ?? null);

// Stable, SSR-safe id so the popover can target the trigger button.
const infoId = `dx-field-info-${useId()}`;
</script>

<style scoped>
.dx-field-label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

/* Soften the label from the near-black body colour so it doesn't dominate the
   row — but keep it a step darker than the (lighter, secondary-grey) hint so the
   label still leads. */
.dx-field-label__text {
    color: #495057; /* gray-700 */
}

.dx-field-label__info {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: none;
    line-height: 1;
    color: var(--bs-secondary-color);
    cursor: help;
}

.dx-field-label__info:hover,
.dx-field-label__info:focus-visible {
    color: var(--bs-primary);
}

.dx-field-label__info svg {
    width: 0.9em;
    height: 0.9em;
}
</style>
