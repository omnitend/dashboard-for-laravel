import { onMounted, ref, watch, type ComputedRef, type Ref } from "vue";
import type { FieldDefinition, FieldOption } from "../types";

/**
 * Async option loading for a `DXField`: runs `field.optionsLoader` on mount and
 * (when `field.reloadOptionsOnChange` is set) whenever the model changes,
 * exposing the loaded options. A monotonic request token guards against
 * out-of-order responses clobbering newer ones; loader failures are swallowed
 * so the last good options (or the static `field.options` fallback) stay put.
 *
 * Extracted verbatim from DXField's inline logic (#135) — behaviour unchanged.
 * `getField` is an accessor (props aren't destructurable without losing
 * reactivity); `effectiveModel` is the model passed to the loader.
 */
export interface UseAsyncOptionsReturn {
    /** Options returned by the most recent successful load, or null if none yet. */
    loadedOptions: Ref<FieldOption[] | null>;
    /** Trigger a load (no-op when the field has no `optionsLoader`). */
    loadOptions: () => Promise<void>;
}

export function useAsyncOptions(
    getField: () => FieldDefinition,
    effectiveModel: ComputedRef<any> | Ref<any>,
): UseAsyncOptionsReturn {
    const loadedOptions = ref<FieldOption[] | null>(null);

    // Monotonic token so out-of-order async responses can't clobber newer ones.
    let optionsRequestToken = 0;

    async function loadOptions(): Promise<void> {
        const field = getField();
        if (!field.optionsLoader) return;
        const token = ++optionsRequestToken;
        try {
            const options = await field.optionsLoader(effectiveModel.value);
            // Ignore a stale response superseded by a newer load.
            if (token === optionsRequestToken) loadedOptions.value = options;
        } catch (error) {
            // Swallow loader failures: keep the last successfully loaded options
            // (or the static `field.options` fallback when none have loaded yet).
            if (token === optionsRequestToken) {
                // eslint-disable-next-line no-console
                console.error(
                    `optionsLoader failed for field "${field.key}"`,
                    error,
                );
            }
        }
    }

    onMounted(() => {
        void loadOptions();
    });

    if (getField().reloadOptionsOnChange) {
        watch(effectiveModel, () => void loadOptions(), { deep: true });
    }

    return { loadedOptions, loadOptions };
}
