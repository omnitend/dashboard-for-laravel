<template>
    <span class="dx-field-label">
        <span class="dx-field-label__text">{{ label }}</span>
        <template v-if="info">
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
                {{ info }}
            </DPopover>
        </template>
    </span>
</template>

<script setup lang="ts">
import { useId } from "vue";
import DPopover from "../base/DPopover.vue";

interface Props {
    /** Visible label text. */
    label: string;

    /** Optional help text revealed in a popover from an info affordance. */
    info?: string;
}

defineProps<Props>();

// Stable, SSR-safe id so the popover can target the trigger button.
const infoId = `dx-field-info-${useId()}`;
</script>

<style scoped>
.dx-field-label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
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
