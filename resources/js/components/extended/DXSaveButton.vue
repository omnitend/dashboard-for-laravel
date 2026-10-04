<!--
  DXSaveButton — a save button that confirms the save in place.

  Three states, driven by two booleans the consumer owns:

  - idle (`saving` and `saved` both false) — the normal Save button.
  - saving (`saving`) — DButton's busy state: disabled at once, spinner after
    the anti-flash delay, `savingText` if given.
  - saved (`saved` and not `saving`) — "✓ Saved" (tick icon) and genuinely
    `disabled`, until the consumer clears `saved` (typically on the next edit
    to the form). The colour does not change: the button keeps its own
    variant (navy primary by default) at full strength, neither the neutral
    grey of a disabled button nor a faded one. Only the label and the
    disabled state say it is saved.

  `saving` wins over `saved`, so re-saving from the saved state shows busy.
  The label change is announced: the button itself is a polite live region,
  and while it is `aria-busy` (saving) announcements wait until it settles,
  so a screen reader hears "Saved" once the save lands.

  Every other attribute (type, block, size, class, listeners…) passes through
  to DButton. DXForm uses this for its submit button.
-->
<template>
    <DButton
        v-bind="$attrs"
        :variant="variant"
        :icon="isShowingSaved ? 'check-lg' : icon"
        :loading="saving"
        :loading-text="savingText"
        :disabled="disabled || isShowingSaved"
        :class="{ 'dx-save-button--saved': isShowingSaved }"
        aria-live="polite"
    >
        <template v-if="isShowingSaved">{{ savedText }}</template>
        <slot v-else>Save</slot>
    </DButton>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ButtonVariant } from "bootstrap-vue-next";
import DButton from "../base/DButton.vue";

defineOptions({ inheritAttrs: false });

interface Props {
    /** A save is in flight: busy/spinner state (DButton's `loading`). */
    saving?: boolean;

    /**
     * The form's current contents have been saved: show `savedText` with a
     * tick and disable the button. Clear it when the form changes.
     */
    saved?: boolean;

    /** Label for the saved state. @default 'Saved' */
    savedText?: string;

    /** Label shown beside the spinner while saving (DButton's `loadingText`). */
    savingText?: string;

    /** Variant in every state; the saved state keeps it. @default 'primary' */
    variant?: ButtonVariant | null;

    /** Leading icon when not saved. The saved state shows `check-lg`. */
    icon?: string;

    /** Disable the button regardless of state. */
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    saving: false,
    saved: false,
    savedText: "Saved",
    variant: "primary",
    disabled: false,
});

const isShowingSaved = computed(() => props.saved && !props.saving);
</script>
