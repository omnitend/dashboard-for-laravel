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
            <DTabs v-model:index="activeTab" :card="tabsInCard">
                <DTab
                    v-for="(tab, index) in visibleTabs"
                    :key="tab.key"
                    :title="resolveTabLabel(tab)"
                    :lazy="tab.lazy"
                    :active="index === 0"
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
                <DButton
                    v-if="showSubmit"
                    type="submit"
                    variant="primary"
                    block
                    :loading="resolvedForm.processing"
                    :loading-text="submitLoadingText"
                    class="mt-3"
                >
                    {{ submitText }}
                </DButton>

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
            <DButton
                v-if="showSubmit"
                type="submit"
                variant="primary"
                block
                :loading="resolvedForm.processing"
                :loading-text="submitLoadingText"
                class="mt-3"
            >
                {{ submitText }}
            </DButton>

            <!--
              @slot Content rendered below the submit button (e.g. a cancel link or secondary actions).
              @binding {UseFormReturn} form The resolved form instance (state, errors, submit helpers).
            -->
            <slot name="footer" :form="resolvedForm" />
        </template>
    </BForm>
</template>

<script setup lang="ts">
import { computed, ref, watch, type ComponentPublicInstance } from "vue";
import { BForm } from "bootstrap-vue-next";
import DAlert from "../base/DAlert.vue";
import DButton from "../base/DButton.vue";
import DCard from "../base/DCard.vue";
import DTabs from "../base/DTabs.vue";
import { BTab as DTab } from "bootstrap-vue-next"; // raw BTab: BTabs scans slot vnodes for it (#119)
import DXFormField from "./DXFormField.vue";
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
     * - `"horizontal"` — label left, input right, always.
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
     * Default 640, measured rather than guessed: with the default 3-column
     * label the label's text area is `containerWidth / 4 - 18` px, so 640 gives
     * it 142px — enough for a ~20-character label ("Unit price (ex VAT)"
     * measures 128px at the theme's label font) to stay on one line, with the
     * control column still 474px. Below ~584px that label starts wrapping,
     * which is the cramped-label symptom this exists to avoid. Raise it if your
     * labels run longer, or lower `labelCols` instead.
     */
    layoutThreshold?: number;

    /**
     * Label column width for horizontal layout (mirrors BFormGroup's
     * `labelCols`/`labelCols*` props). Overridable per-field via
     * `field.labelCols`. Ignored when `layout` is "vertical".
     */
    labelCols?: LabelCols;
}

const props = withDefaults(defineProps<Props>(), {
    submitText: "Submit",
    submitLoadingText: "Submitting...",
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

// ————————————————— auto-switch to the first error tab

/** Keys that currently carry at least one validation error. */
const erroredKeys = computed<string[]>(() =>
    Object.keys(resolvedForm.value.errors).filter(
        (key) => (resolvedForm.value.errors[key]?.length ?? 0) > 0,
    ),
);

function goToErrorTab(): void {
    if (!hasTabs.value || erroredKeys.value.length === 0) return;
    const tabIndex = visibleTabs.value.findIndex((tab) =>
        tab.fieldKeys.some((key) =>
            erroredKeys.value.some(
                // Match exact keys and nested (repeater) error keys.
                (errorKey) => errorKey === key || errorKey.startsWith(`${key}.`),
            ),
        ),
    );
    if (tabIndex !== -1) activeTab.value = tabIndex;
}

// Watch a primitive derived from the error keys so the effect reliably
// re-runs when errors are set (deep-watching the stable reactive object
// reference does not fire on key additions). `immediate` handles errors
// already present on the form before mount.
watch(
    () => erroredKeys.value.join("|"),
    (joined) => {
        if (props.autoErrorTab && joined) goToErrorTab();
    },
    { immediate: true },
);

function handleSubmit(): void {
    emit("submit");
}

defineExpose({ goToErrorTab });
</script>
