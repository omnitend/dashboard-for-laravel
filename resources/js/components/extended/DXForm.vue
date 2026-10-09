<!--
  DXForm — the canonical form renderer.

  Driven by field definitions, with optional tabs. Renders every field
  through DXField (the single field engine), so flat and tabbed forms share
  one code path. Supports conditional fields/tabs, per-field slot overrides,
  async options, nested repeaters, and auto-switching to the first tab
  containing a validation error.

  Accepts either a `useForm` return or a `defineForm` return; with the latter
  `fields` may be omitted. Works with the fetch-based `useForm` composable
  (no Inertia required).
-->
<template>
    <BForm
        ref="formRoot"
        @submit.prevent="handleSubmit"
        :class="{ 'dx-form--horizontal': resolvedLayout === 'horizontal' }"
    >
        <!-- Form-level error message -->
        <DAlert
            v-if="resolvedForm.shouldShowMessage"
            :model-value="resolvedForm.shouldShowMessage"
            variant="danger"
            class="mb-3"
        >
            {{ resolvedForm.message }}
        </DAlert>

        <!-- Tabbed layout. BTabs exposes the active *index* via v-model:index
             (plain v-model is the active tab id), which is what we track.
             `card` needs BOTH: DTabs' own `card` prop (adds `card-header`/
             `card-body` classes to its nav/content internally) AND an outer
             `.card` element wrapping it (BVN's `card` prop does not add the
             outer wrapper itself — the consumer supplies it, per BVN's docs
             pattern). `no-body` stops DCard from adding its own
             `.card-body` wrapper — DTabs already provides `.card-header`/
             `.card-body` internally via its own `card` prop, so wrapping
             that in another `.card-body` would double up. -->
        <component :is="tabsInCard ? DCard : 'div'" v-if="hasTabs" v-bind="tabsInCard ? { noBody: true } : {}">
            <DTabs v-if="visibleTabs.length > 0" v-model="activeTabId" :card="tabsInCard">
                <DTab
                    v-for="tab in visibleTabs"
                    :key="tab.key"
                    :id="tabPaneId(tab)"
                    :title="resolveTabLabel(tab)"
                    :lazy="tab.lazy"
                >
                    <!--
                      @slot Replaces the entire body of a tab, keyed by tab (slot name `tab-content(<tabKey>)`).
                      @binding {FormTab} tab The tab definition being rendered.
                      @binding {object} model Live form data merged with `context`, for predicates.
                    -->
                    <slot
                        v-if="$slots[`tab-content(${tab.key})`]"
                        :name="`tab-content(${tab.key})`"
                        :tab="tab"
                        :model="model"
                    />

                    <div v-else class="pt-3">
                        <!--
                          @slot Content inserted above a tab's fields, keyed by tab (slot name `tab-before(<tabKey>)`).
                          @binding {FormTab} tab The tab definition being rendered.
                          @binding {object} model Live form data merged with `context`, for predicates.
                        -->
                        <slot :name="`tab-before(${tab.key})`" :tab="tab" :model="model" />

                        <DXFormField
                            v-for="field in visibleFieldsFor(tab)"
                            :key="field.key"
                            :field="field"
                            :form="resolvedForm"
                            :model="model"
                            :layout="resolvedLayout"
                            :label-cols="labelCols"
                        >
                            <!-- Forward every DXForm slot so the field can render
                                 its keyed field(<key>)/field-before/field-after/
                                 value/span/info/hint/repeater-row slots. -->
                            <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
                                <slot :name="name" v-bind="slotProps" />
                            </template>
                        </DXFormField>

                        <!--
                          @slot Content inserted below a tab's fields, keyed by tab (slot name `tab-after(<tabKey>)`).
                          @binding {FormTab} tab The tab definition being rendered.
                          @binding {object} model Live form data merged with `context`, for predicates.
                        -->
                        <slot :name="`tab-after(${tab.key})`" :tab="tab" :model="model" />
                    </div>
                </DTab>
            </DTabs>
        </component>

        <!-- Flat layout (no tabs). When `card` is set, the fields + submit
             button + footer render inside a DCard, giving the form a visual
             boundary (the tabbed case gets this from DTabs' own `card` prop
             instead, above). -->
        <template v-if="!hasTabs">
            <component :is="card ? DCard : 'div'">
                <DXFormField
                    v-for="field in visibleFlatFields"
                    :key="field.key"
                    :field="field"
                    :form="resolvedForm"
                    :model="model"
                    :layout="resolvedLayout"
                    :label-cols="labelCols"
                >
                    <!-- Forward every DXForm slot so the field can render its
                         keyed field(<key>)/field-before/field-after/value/span/
                         info/hint/repeater-row slots. -->
                    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
                        <slot :name="name" v-bind="slotProps" />
                    </template>
                </DXFormField>

                <!-- Submit button -->
                <DXSaveButton
                    v-if="showSubmit"
                    type="submit"
                    block
                    :saving="resolvedForm.processing"
                    :saving-text="submitLoadingText"
                    :saved="isSaved"
                    :saved-text="submitSavedText"
                    class="mt-3"
                >
                    {{ submitText }}
                </DXSaveButton>

                <!--
                  @slot Content rendered below the submit button (e.g. a cancel link or secondary actions).
                  @binding {UseFormReturn} form The resolved form instance (state, errors, submit helpers).
                -->
                <slot name="footer" :form="resolvedForm" />
            </component>
        </template>

        <!-- Tabbed layout: submit button + footer always render as siblings
             below DTabs (outside the card, when `card` is set) — unlike the
             flat layout, they aren't pulled inside the card here, since
             DTabs' own card-body padding belongs to its tab content, not to
             trailing form-level actions. -->
        <template v-else>
            <!-- Submit button -->
            <DXSaveButton
                v-if="showSubmit"
                type="submit"
                block
                :saving="resolvedForm.processing"
                :saving-text="submitLoadingText"
                :saved="isSaved"
                :saved-text="submitSavedText"
                class="mt-3"
            >
                {{ submitText }}
            </DXSaveButton>

            <!--
              @slot Content rendered below the submit button (e.g. a cancel link or secondary actions).
              @binding {UseFormReturn} form The resolved form instance (state, errors, submit helpers).
            -->
            <slot name="footer" :form="resolvedForm" />
        </template>
    </BForm>
</template>

<script setup lang="ts">
import {
    computed,
    onBeforeUnmount,
    ref,
    useId,
    watch,
    type ComponentPublicInstance,
} from "vue";
import { BForm } from "bootstrap-vue-next";
import DAlert from "../base/DAlert.vue";
import DCard from "../base/DCard.vue";
import DTabs from "../base/DTabs.vue";
import { BTab as DTab } from "bootstrap-vue-next"; // raw BTab: BTabs scans slot vnodes for it (#119)
import DXFormField from "./DXFormField.vue";
import DXSaveButton from "./DXSaveButton.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { DefineFormReturn } from "../../composables/defineForm";
import { useContainerWidth } from "../../composables/useContainerWidth";
import type { FieldDefinition, FormTab, LabelCols, MaybeFn } from "../../types";
import {
    resolvePredicate as resolvePredicateFor,
    isFieldVisible as isFieldVisibleFor,
} from "../../utils/formSchema";

interface Props {
    /**
     * Form instance — either a raw `useForm` return or a `defineForm`
     * return (`{ form, fields }`). With the latter, `fields` may be
     * omitted and is taken from the form object.
     */
    form: UseFormReturn<any> | DefineFormReturn<any>;

    /** Field definitions (optional when `form` is a defineForm return). */
    fields?: FieldDefinition[];

    /** Tab definitions. When omitted, a flat single-column form renders. */
    tabs?: FormTab[];

    /**
     * Extra context merged under the live form data when evaluating
     * predicates (label/hint/when/disabled). E.g. a table passes the
     * original row so predicates can read non-edited columns.
     */
    context?: Record<string, any>;

    /** Submit button text */
    submitText?: string;

    /** Submit button loading text */
    submitLoadingText?: string;

    /** Submit button label once the form's contents are saved. */
    submitSavedText?: string;

    /**
     * After a successful submission through the form (`form.post/put/…`,
     * read from `form.wasSuccessful`), turn the submit button into a
     * disabled "✓ Saved" until any field changes. On by default; set
     * `false` for forms whose submit is not a save (search, filter).
     */
    savedState?: boolean;

    /** Show the submit button */
    showSubmit?: boolean;

    /** Auto-switch to the first tab containing a validation error. */
    autoErrorTab?: boolean;

    /**
     * Wrap the form in a card for a visual boundary (mirrors DXTable's
     * `card` prop). Off by default since DXForm is commonly embedded in a
     * page card or modal already. Tabbed forms are wrapped by default
     * regardless — see `cardTabs`; setting `card` also forces the tabbed
     * card on even when `cardTabs` is disabled.
     */
    card?: boolean;

    /**
     * Wrap a TABBED form's content in a card panel so the active tab reads
     * as a finished panel connected to the tab strip (the standard
     * Bootstrap card-with-tabs pattern) rather than floating on the bare
     * page background (#159). On by default. Set `false` for bare tabs
     * (e.g. inside a modal that already provides a boundary). Ignored for
     * flat (non-tabbed) forms — use `card` for those.
     */
    cardTabs?: boolean;

    /**
     * Form-wide field layout:
     *
     * - `"vertical"` (default) — label above input, always.
     * - `"horizontal"` — label left, input right, whatever the container
     *   width. With the default label column that holds from the `sm`
     *   viewport breakpoint up (the label stacks on a phone); a numeric
     *   `labelCols` keeps the split at every width.
     * - `"auto"` — horizontal when the form's **own container** is at least
     *   `layoutThreshold` px wide, vertical below that. Container-driven, not
     *   viewport-driven: a page narrowed by the dashboard sidebar, or a form
     *   inside a modal, stacks even though the window is wide (which no
     *   Bootstrap media query can see).
     *
     * Overridable per-field via `field.layout`. A field with `span: true`
     * always renders full-width, regardless of layout.
     */
    layout?: "vertical" | "horizontal" | "auto";

    /**
     * Container width (px) at or above which `layout: "auto"` goes horizontal.
     * Ignored for the explicit `"vertical"`/`"horizontal"` layouts.
     *
     * Default 640, measured when the default label was 3 columns: that gave
     * the label 142px of text at 640px, just enough for a ~20-character label
     * ("Unit price (ex VAT)" measures 128px at the theme's label font) to stay
     * on one line. With the 45% default label column the same 640px gives the
     * label ~275px and the control ~341px, so the threshold now mostly keeps
     * the control column usable. Raise it if your controls need more room, or
     * set a narrower `labelCols`.
     */
    layoutThreshold?: number;

    /**
     * Label column width for horizontal layout (mirrors BFormGroup's
     * `labelCols`/`labelCols*` props). Overridable per-field via
     * `field.labelCols`. Ignored when `layout` is "vertical". Omitted (here
     * and on the field): the label takes `--dx-form-label-width` (45%) from
     * `sm` up and stacks above the input below `sm`.
     */
    labelCols?: LabelCols;
}

const props = withDefaults(defineProps<Props>(), {
    submitText: "Submit",
    submitLoadingText: "Submitting...",
    submitSavedText: "Saved",
    savedState: true,
    showSubmit: true,
    autoErrorTab: true,
    card: false,
    cardTabs: true,
    layout: "vertical",
    layoutThreshold: 640,
});

const emit = defineEmits<{
    /** Emitted when the form is submitted, after the native submit is prevented. */
    submit: [];
}>();

const slots = defineSlots<Record<string, (props: any) => any>>();

/** v-model for the active tab index. */
const activeTab = defineModel<number>("activeTab", { default: 0 });

// ————————————————— container-driven layout (`layout: "auto"`)

const formRoot = ref<ComponentPublicInstance | HTMLElement | null>(null);

/**
 * The `<form>` element BForm renders. A template ref on a component yields the
 * component instance, so unwrap `$el` — and tolerate either shape rather than
 * assuming one, so a future BForm change (or a functional re-implementation)
 * can't silently leave us observing nothing.
 */
function resolveFormElement(): HTMLElement | null {
    const rootValue = formRoot.value;
    if (rootValue === null || rootValue === undefined) return null;
    if (rootValue instanceof HTMLElement) return rootValue;
    const element = (rootValue as ComponentPublicInstance).$el;
    return element instanceof HTMLElement ? element : null;
}

// Observe ONLY in auto mode. Returning null for the other layouts means no
// ResizeObserver is ever attached for the (overwhelmingly common) explicit
// layouts — existing consumers pay nothing and behave identically.
const { isBelow: containerIsNarrow } = useContainerWidth(
    () => (props.layout === "auto" ? resolveFormElement() : null),
    {
        // Getter, so a consumer binding `:layout-threshold` to something
        // reactive re-evaluates instead of latching the mount-time value.
        threshold: () => props.layoutThreshold,
        // Guard against an observer feedback loop at the boundary: the vertical
        // layout is TALLER, so a form inside an `overflow:auto` ancestor can
        // gain a scrollbar when it stacks, shrinking its own container by
        // ~15-17px — straight back over the threshold, and it flips forever.
        // A band wider than any scrollbar (24px) makes the crossing one-way
        // until the container genuinely grows.
        hysteresis: 24,
    },
);

/**
 * The layout actually rendered. `vertical`/`horizontal` pass through
 * unconditionally (unchanged behaviour); `auto` resolves from the measured
 * container width, defaulting to `vertical` before the first measurement and
 * under SSR — the stacked layout is legible at any width, so it is the safe
 * thing to render when the width is unknown.
 */
const resolvedLayout = computed<"vertical" | "horizontal">(() => {
    if (props.layout !== "auto") return props.layout;
    return containerIsNarrow.value ? "vertical" : "horizontal";
});

// ————————————————— resolve form / fields (accept useForm or defineForm)

function isDefineForm(
    value: Props["form"],
): value is DefineFormReturn<any> {
    return (
        !!value &&
        typeof value === "object" &&
        "form" in value &&
        "fields" in value &&
        !("data" in value)
    );
}

const resolvedForm = computed<UseFormReturn<any>>(() =>
    isDefineForm(props.form) ? props.form.form : props.form,
);

const resolvedFields = computed<FieldDefinition[]>(() => {
    if (props.fields) return props.fields;
    if (isDefineForm(props.form)) return props.form.fields;
    return [];
});

const fieldByKey = computed<Record<string, FieldDefinition>>(() => {
    const map: Record<string, FieldDefinition> = {};
    for (const field of resolvedFields.value) map[field.key] = field;
    return map;
});

// ————————————————— model for predicates (live form data + context)

const model = computed(() => ({
    ...(props.context ?? {}),
    ...resolvedForm.value.data,
}));

// Thin wrappers binding the shared formSchema predicates to this form's live
// model (context + form data), so field/tab visibility follows the one rule
// every renderer shares (#134).
function resolvePredicate(
    when: MaybeFn<boolean> | undefined,
    fallback: boolean,
): boolean {
    return resolvePredicateFor(when, model.value, fallback);
}

/** Resolve a tab's (possibly function-valued) label against the live model. */
function resolveTabLabel(tab: FormTab): string {
    const label =
        typeof tab.label === "function" ? tab.label(model.value) : tab.label;
    return label || tab.key;
}

function isFieldVisible(field: FieldDefinition): boolean {
    return isFieldVisibleFor(field, model.value);
}

// ————————————————— tabs

const hasTabs = computed(
    () => !!props.tabs && props.tabs.length > 0,
);

// Tabbed forms render inside a card panel by default (#159) so the tab
// content reads as a finished panel rather than floating on the page.
// `cardTabs` is the tabbed-only toggle (on by default); `card` (which also
// wraps flat forms) still forces it on. Flat forms are unaffected.
const tabsInCard = computed(
    () => hasTabs.value && (props.card || props.cardTabs),
);

function visibleFieldsFor(tab: FormTab): FieldDefinition[] {
    return tab.fieldKeys
        .map((key) => fieldByKey.value[key])
        .filter((field): field is FieldDefinition => !!field)
        .filter(isFieldVisible);
}

/** A tab with a custom body/before/after slot has content even with no fields. */
function hasTabSlot(key: string): boolean {
    return !!(
        slots[`tab-content(${key})`] ||
        slots[`tab-before(${key})`] ||
        slots[`tab-after(${key})`]
    );
}

const visibleTabs = computed<FormTab[]>(() => {
    if (!props.tabs) return [];
    return props.tabs.filter((tab) => {
        if (!resolvePredicate(tab.when, true)) return false;
        // Hide tabs with no visible fields, unless the consumer supplies a
        // custom tab-content/before/after slot for that tab.
        return visibleFieldsFor(tab).length > 0 || hasTabSlot(tab.key);
    });
});

const visibleFlatFields = computed<FieldDefinition[]>(() =>
    resolvedFields.value.filter(isFieldVisible),
);

/**
 * The index DXForm has chosen but a parent-bound `v-model:active-tab` has not
 * echoed back yet. The prop lags our emit (the parent re-renders after us,
 * or, at mount, after our first render), and anything reading the stale prop
 * in between, DTabs included, would act on the old index. Cleared the moment
 * the prop changes, so the parent stays in charge of what it binds.
 */
const pendingActiveTab = ref<number | null>(null);
watch(activeTab, () => {
    pendingActiveTab.value = null;
}, { flush: "sync" });
const currentActiveTab = computed(() => pendingActiveTab.value ?? activeTab.value);
function selectTab(index: number): void {
    pendingActiveTab.value = index;
    activeTab.value = index;
}

// DTabs is driven by the active tab's pane ID, not its index. bvn keeps an
// index and an ID in step, and syncs the index against its tab list BEFORE
// a hidden tab unregisters: an index change landing in the same tick as an
// earlier tab hiding resolved to the wrong tab's ID, which bvn then mapped
// back to the wrong index. A pane ID names the same tab before and after
// the list changes, so bvn never has to translate. `activeTab` stays the
// public index; this only translates at the DTabs boundary.
const tabIdPrefix = useId();
function tabPaneId(tab: FormTab): string {
    return `${tabIdPrefix}-tab-${tab.key}`;
}
const activeTabId = computed<string | undefined>({
    get: () => {
        const tab = visibleTabs.value[currentActiveTab.value];
        return tab ? tabPaneId(tab) : undefined;
    },
    set: (id) => {
        const index = visibleTabs.value.findIndex((tab) => tabPaneId(tab) === id);
        if (index !== -1 && index !== currentActiveTab.value) selectTab(index);
    },
});

// ————————————————— auto-switch to the first error tab

/** Keys that currently carry at least one validation error. */
const erroredKeys = computed<string[]>(() =>
    Object.keys(resolvedForm.value.errors).filter(
        (key) => (resolvedForm.value.errors[key]?.length ?? 0) > 0,
    ),
);

/** True when an error key belongs to a field key: exact, or nested under it. */
function errorKeyMatches(errorKey: string, fieldKey: string): boolean {
    return errorKey === fieldKey || errorKey.startsWith(`${fieldKey}.`);
}

/**
 * Field keys of a tab that can show an error: the visible fields only, so a
 * field hidden by its `when` never pulls the form onto its tab. A key with
 * no field definition is rendered by the consumer (a `tab-content` slot, for
 * example), so DXForm cannot tell whether it is shown and keeps it.
 */
function errorTargetKeysFor(tab: FormTab): string[] {
    return tab.fieldKeys.filter((key) => {
        const field = fieldByKey.value[key];
        return !field || isFieldVisible(field);
    });
}

/** Index of the first visible tab holding a visible errored field, or -1. */
function firstErrorTabIndex(): number {
    if (!hasTabs.value || erroredKeys.value.length === 0) return -1;
    return visibleTabs.value.findIndex((tab) =>
        errorTargetKeysFor(tab).some((key) =>
            erroredKeys.value.some((errorKey) => errorKeyMatches(errorKey, key)),
        ),
    );
}

function goToErrorTab(): void {
    const tabIndex = firstErrorTabIndex();
    if (tabIndex !== -1) selectTab(tabIndex);
}

/**
 * The one place that moves `activeTab` on its own. Everything that can make
 * the selection wrong (the visible tabs, the index, the error set) feeds a
 * single watcher, which decides the final index once per change and emits it
 * at most once. Two separate watchers writing the tab raced: later `pre`
 * watchers run in queue order, and a parent-bound `v-model:active-tab` lags
 * the emit, so a range fallback could land after the error selection and
 * hide the error. Priority, highest first:
 *
 * 1. Error keys were ADDED since the last decision, and a visible tab holds a
 *    visible errored field: select that tab. Removals never move the tab:
 *    editing a field clears its error, and re-running the selection then
 *    threw the user onto another tab mid-fix (#194). A submit clears the
 *    errors before it is sent (unless `preserveErrors`), so a failed
 *    resubmit goes empty → full and counts as added; a `preserveErrors`
 *    resubmit returning exactly the set already on the form adds nothing.
 *    Watching the set (not DXForm's own submit) covers forms submitted
 *    outside DXForm too. Errors present at mount count as added.
 * 2. The index is out of range (negative, or past the last visible tab):
 *    fall back to the first tab. DTabs is driven by `v-model:index` alone,
 *    so an index it cannot show leaves every pane inactive.
 * 3. Otherwise leave it; a valid index is never touched.
 *
 * DTabs is also only rendered while some tab is visible: once every tab was
 * hidden, bvn reported -1 and then fought a restored index when the tabs came
 * back, activating none of them; remounting it avoids that.
 */
function decideActiveTab(
    index: number,
    tabCount: number,
    errorKeysAdded: boolean,
): number {
    if (tabCount === 0) return index;
    if (errorKeysAdded && props.autoErrorTab) {
        const errorTab = firstErrorTabIndex();
        if (errorTab !== -1) return errorTab;
    }
    if (index < 0 || index >= tabCount) return 0;
    return index;
}

let lastErroredKeys = new Set<string>();
watch(
    [() => visibleTabs.value.length, currentActiveTab, erroredKeys],
    ([tabCount, index, keys]) => {
        const errorKeysAdded = keys.some((key) => !lastErroredKeys.has(key));
        lastErroredKeys = new Set(keys);
        const nextIndex = decideActiveTab(index, tabCount, errorKeysAdded);
        if (nextIndex !== index) selectTab(nextIndex);
    },
    { immediate: true },
);

// ————————————————— saved state (submit button shows "✓ Saved")

/**
 * True from a successful save until the form's data next changes.
 *
 * Three kinds of data write have to be told apart:
 *
 * - a user edit BEFORE the response (while the request is in flight) — not
 *   in the payload, so the save must not be reported as covering it;
 * - the save's own follow-up writes — `onSuccess` copying the response into
 *   the form, `resetOnSuccess`, consumer code after `await form.post()` —
 *   which all run in the response's macrotask and are not edits;
 * - a user edit AFTER the save — clears the saved state.
 *
 * So the success (`wasSuccessful` turning true) opens a one-macrotask window
 * in which writes are treated as part of the save, and `isSaved` is set when
 * that window closes, unless the user edited between submit and response.
 * All three watchers are synchronous so the ordering is exact, not dependent
 * on Vue's scheduler.
 */
const isSaved = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | null = null;
let isInSaveResponse = false;
let wasEditedSinceSubmit = false;

function cancelPendingSaved(): void {
    if (savedTimer !== null) clearTimeout(savedTimer);
    savedTimer = null;
    isInSaveResponse = false;
}

watch(
    () => resolvedForm.value.processing,
    (isProcessing) => {
        if (!isProcessing) return;
        cancelPendingSaved();
        isSaved.value = false;
        wasEditedSinceSubmit = false;
    },
    { flush: "sync" },
);

watch(
    () => resolvedForm.value.wasSuccessful,
    (wasSuccessful) => {
        if (!wasSuccessful || !props.savedState) return;
        cancelPendingSaved();
        isInSaveResponse = true;
        savedTimer = setTimeout(() => {
            savedTimer = null;
            isInSaveResponse = false;
            // A new submit or a form swap in the meantime cancels this timer.
            if (!wasEditedSinceSubmit) isSaved.value = true;
        }, 0);
    },
    { flush: "sync" },
);

watch(
    () => resolvedForm.value.data,
    () => {
        isSaved.value = false;
        if (!isInSaveResponse) wasEditedSinceSubmit = true;
    },
    { deep: true, flush: "sync" },
);

// A different form instance (or turning the feature off) starts unsaved.
watch([resolvedForm, () => props.savedState], () => {
    cancelPendingSaved();
    isSaved.value = false;
});

onBeforeUnmount(cancelPendingSaved);

function handleSubmit(): void {
    emit("submit");
}

defineExpose({ goToErrorTab });
</script>
