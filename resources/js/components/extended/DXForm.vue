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
        <!-- What the last failed submit returned (#194), when the consumer
             asked for it at the top rather than beside the submit button. -->
        <DXFormErrorSummary
            v-if="errorSummary === 'top'"
            class="mb-3"
            v-bind="summaryBindings"
            @select-target="focusErrorTarget"
        />

        <!-- Form-level error message. Not while the summary shows a failure:
             one alert, never two (the summary already carries the message). -->
        <DAlert
            v-if="resolvedForm.shouldShowMessage && !isSummaryShowing"
            :model-value="resolvedForm.shouldShowMessage"
            variant="danger"
            class="mb-3"
        >
            {{ resolvedForm.message }}
        </DAlert>

        <!-- Tabbed layout. DXForm owns the selection (`activeTabKey`); DTabs
             only renders it. DTabs gets the active PANE ID, controlled: its
             own writes back (`update:modelValue`) are ignored, because bvn
             re-derives ids from its registered-tab list, which lags a render
             behind ours. Clicks and keys reach DXForm through each tab's own
             click handler and button attributes, by tab key, never by
             index; `no-key-nav` hands the arrow keys to DXForm.
             `card` needs BOTH: DTabs' own `card` prop (adds `card-header`/
             `card-body` classes to its nav/content internally) AND an outer
             `.card` element wrapping it (BVN's `card` prop does not add the
             outer wrapper itself — the consumer supplies it, per BVN's docs
             pattern). `no-body` stops DCard from adding its own
             `.card-body` wrapper — DTabs already provides `.card-header`/
             `.card-body` internally via its own `card` prop, so wrapping
             that in another `.card-body` would double up. -->
        <component :is="tabsInCard ? DCard : 'div'" v-if="hasTabs" v-bind="tabsInCard ? { noBody: true } : {}">
            <DTabs
                :modelValue="activePaneId"
                :card="tabsInCard"
                :noKeyNav="true"
                @update:modelValue="ignoreTabsWrite"
            >
                <DTab
                    v-for="tab in visibleTabs"
                    :key="tab.key"
                    :id="paneIdFor(tab.key)"
                    :buttonId="buttonIdFor(tab.key)"
                    :title="resolveTabLabel(tab)"
                    :lazy="tab.lazy"
                    :titleLinkAttrs="tabButtonAttrs(tab.key)"
                    :onClick="tabControlsFor(tab.key).onClick"
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

                <!-- Failed-submit summary, directly above the submit button. -->
                <DXFormErrorSummary
                    v-if="errorSummary === 'footer'"
                    class="mt-3"
                    v-bind="summaryBindings"
                    @select-target="focusErrorTarget"
                />

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
            <!-- Failed-submit summary: below the tabs (never inside a pane,
                 which may be hidden), directly above the submit button. -->
            <DXFormErrorSummary
                v-if="errorSummary === 'footer'"
                class="mt-3"
                v-bind="summaryBindings"
                @select-target="focusErrorTarget"
            />

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
    nextTick,
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
import DXFormErrorSummary, { type ErrorSummarySelection } from "./DXFormErrorSummary.vue";
import { resolveErrorTargets, type ErrorTarget } from "../../utils/formErrorTargets";
import type { UseFormReturn, ValidationErrors } from "../../composables/useForm";
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

    /**
     * Where to list what the last failed submit returned (`form.submitFailure`:
     * the server's message and every validation message, with readable
     * labels):
     *
     * - `"footer"` (default) — directly above the submit button, below any
     *   tabs, next to the control the user just pressed.
     * - `"top"` — above the fields, where the form-level alert sits.
     * - `"external"` — the host renders a `DXFormErrorSummary` of its own
     *   elsewhere (beside a submit button outside the form, as DXTable's
     *   modal does). DXForm renders neither a summary nor, while a failure
     *   is listed, the form-level alert.
     * - `false` — no summary; the form-level alert behaves as before.
     *
     * While a summary shows a failure the form-level alert does not render,
     * so a failure shows exactly one alert. Each row naming a visible field is
     * a button that selects the field's tab and focuses it.
     */
    errorSummary?: "footer" | "top" | "external" | false;

    /**
     * The summary's heading when the failure has field errors (default
     * "Couldn't save. Please check:"). A failure with none (a message-only
     * 422, a 500) is headed by the server's message instead.
     */
    errorSummaryTitle?: string;

    /**
     * The summary's sub-heading over the rows no visible field owns (default
     * "Other problems"), shown only when some rows ARE owned.
     */
    errorSummaryOtherTitle?: string;

    /**
     * After a failed submit, scroll the first field with an error into view
     * (once its tab is selected and rendered). Never moves focus. On by
     * default.
     */
    scrollToError?: boolean;
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
    errorSummary: "footer",
    scrollToError: true,
});

const emit = defineEmits<{
    /** Emitted when the form is submitted, after the native submit is prevented. */
    submit: [];
}>();

const slots = defineSlots<Record<string, (props: any) => any>>();

/**
 * v-model for the active tab, as an index into the VISIBLE tabs. It is a
 * view of `activeTabKey` (below), which is what DXForm actually tracks.
 */
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

// ————————————————— active tab, tracked by key (#194)
//
// One owner: `activeTabKey`. The pane bvn shows (`activePaneId`) and the
// index the `activeTab` model reports are both derived from it, and every
// change goes through `commitTabKey`, the one writer. Tracking an index
// instead broke whenever the tab list changed under it: an earlier tab
// hiding or tabs reordering silently showed a different tab, and bvn (which
// tracks tabs by id) mapped indexes against a stale list.

/** Keys that currently carry at least one validation error. */
const erroredKeys = computed<string[]>(() =>
    Object.keys(resolvedForm.value.errors).filter(
        (key) => (resolvedForm.value.errors[key]?.length ?? 0) > 0,
    ),
);

const visibleTabKeys = computed<string[]>(() =>
    visibleTabs.value.map((tab) => tab.key),
);

/**
 * Where each error key belongs, decided by the one resolver the summary also
 * uses (#194), under THIS form's visibility rules: a field hidden by `when`,
 * or on a tab DXForm does not render, owns nothing. So the tab a failure
 * selects, the field it scrolls to and the summary's rows always agree,
 * including nested keys a field claims with `errorKeys`. A tab key with no
 * field definition (consumer-rendered content) still owns its own key and
 * keys nested under it.
 */
function errorTargetsFor(errors: ValidationErrors | null | undefined): ErrorTarget[] {
    return resolveErrorTargets(errors, {
        fields: resolvedFields.value,
        tabs: hasTabs.value ? props.tabs : undefined,
        model: model.value,
        isFieldVisible,
        isTabVisible: (tab) => visibleTabKeys.value.includes(tab.key),
    });
}

/** Targets for the errors on the form now (tab choice, scrolling). */
const liveErrorTargets = computed<ErrorTarget[]>(() =>
    erroredKeys.value.length === 0 ? [] : errorTargetsFor(resolvedForm.value.errors),
);

/** Targets for what the last failed submit returned (the summary's rows). */
const summaryTargets = computed<ErrorTarget[]>(() => {
    const failure = resolvedForm.value.submitFailure;
    return failure ? errorTargetsFor(failure.errors) : [];
});

/** Key of the first visible tab owning a visible errored field, or null. */
function firstErrorTabKey(): string | null {
    const owned = liveErrorTargets.value.find((target) => target.tabKey !== null);
    return owned ? owned.tabKey : null;
}

function sameKeys(keys: readonly string[], otherKeys: readonly string[] | undefined): boolean {
    return (
        otherKeys !== undefined &&
        keys.length === otherKeys.length &&
        keys.every((key, index) => key === otherKeys[index])
    );
}

/** The selected tab's key: the single source of truth for the active tab. */
const activeTabKey = ref<string | null>(null);

// Pane ids are opaque and stable per tab KEY: a number assigned the first
// time a key is seen, never derived from the key's text (which may hold
// spaces, invalid in an id) or from its position (which changes when tabs
// reorder or hide, and would make bvn show a different pane).
const tabIdBase = useId();
const paneNumbers = new Map<string, number>();
/** Monotonic: a pruned key's number is never handed out again. */
let nextPaneNumber = 0;

function paneIdFor(key: string): string {
    let paneNumber = paneNumbers.get(key);
    if (paneNumber === undefined) {
        paneNumber = nextPaneNumber;
        nextPaneNumber += 1;
        paneNumbers.set(key, paneNumber);
    }
    return `${tabIdBase}-tab-${paneNumber}`;
}

function buttonIdFor(key: string): string {
    return `${paneIdFor(key)}-button`;
}

/** The pane DTabs shows; undefined while the selected tab is not rendered. */
const activePaneId = computed<string | undefined>(() =>
    activeTabKey.value !== null && visibleTabKeys.value.includes(activeTabKey.value)
        ? paneIdFor(activeTabKey.value)
        : undefined,
);

/** Invalidates a pending parent-answer check when a newer write happens. */
let modelWriteToken = 0;

/**
 * The one writer of the active tab. Sets the key, then reports its visible
 * index through the `activeTab` model when that differs from what the model
 * holds (a new selection, or the same tab at a new position).
 *
 * A parent binding the model may reject or normalise the index it is sent.
 * Once the flush has carried its answer back, the parent's value wins
 * (controlled behaviour). With no binding the model updates locally, so the
 * check finds the value it wrote and nothing changes.
 */
function commitTabKey(key: string | null): void {
    activeTabKey.value = key;
    const index = key === null ? -1 : visibleTabKeys.value.indexOf(key);
    if (index === -1 || index === activeTab.value) return;
    activeTab.value = index;
    const writeToken = ++modelWriteToken;
    nextTick(() => {
        if (writeToken !== modelWriteToken) return;
        const answeredIndex = activeTab.value;
        if (answeredIndex === index) return;
        const answeredKey = visibleTabKeys.value[answeredIndex];
        if (answeredKey !== undefined) commitTabKey(answeredKey);
    });
}

/**
 * Which tab to show. In order: after a failed submit (or with errors present
 * at mount), the first visible tab owning a visible errored field; a tab
 * index the parent just set; the current tab while it is still visible; the
 * first visible tab. With no visible tabs the key is kept, so the same tab
 * returns when they come back, and an index the parent sets meanwhile (or
 * at mount) is held until they do: it cannot be resolved to a key yet.
 */
let pendingRequestedIndex: number | null = null;

function decideTabKey(failed: boolean, incomingIndex: number | null): string | null {
    const keys = visibleTabKeys.value;
    if (keys.length === 0) {
        if (incomingIndex !== null) pendingRequestedIndex = incomingIndex;
        return activeTabKey.value;
    }
    const requestedIndex = incomingIndex ?? pendingRequestedIndex;
    pendingRequestedIndex = null;
    if (failed && props.autoErrorTab) {
        const errorTabKey = firstErrorTabKey();
        if (errorTabKey !== null) return errorTabKey;
    }
    if (requestedIndex !== null) {
        const requestedKey = keys[requestedIndex];
        if (requestedKey !== undefined) return requestedKey;
    }
    const currentKey = activeTabKey.value;
    if (currentKey !== null && keys.includes(currentKey)) return currentKey;
    return keys[0];
}

// "A submit failed": what sends the form to its error tab. Either signal
// counts:
//
// - `failedSubmitCount` changing. useForm counts every failed submit, so a
//   `preserveErrors` resubmit that returns exactly the same set (its keys
//   never leave the form) still takes the user back to the error.
// - the errored-key set GROWING. Errors set without a submit through useForm
//   (`form.setErrors()` after a client-side check, or after a consumer's own
//   request) keep selecting their tab, as they always have.
//
// An error CLEARING (a field edit) is neither, so fixing a field never moves
// the tab. The key comparison is between flushes, never inside one:
// `setErrors` empties the set and refills it synchronously, which a sync
// watcher would misread as an addition.
const failureCount = (): number => resolvedForm.value.failedSubmitCount ?? 0;

function keysGrew(keys: readonly string[], previousKeys: readonly string[] | undefined): boolean {
    const previous = new Set(previousKeys ?? []);
    return keys.some((key) => !previous.has(key));
}

// The decision runs ONCE per tick for every input that changed in it (the
// visible tabs, the failure signals, the model index), so two concerns can
// never write competing values in one flush.
let hasDecided = false;
watch(
    [visibleTabKeys, () => erroredKeys.value, failureCount, () => activeTab.value] as const,
    ([keys, errorKeys, count, index], previous) => {
        if (!hasDecided) {
            // Errors already on the form at mount select their tab.
            hasDecided = true;
            commitTabKey(decideTabKey(errorKeys.length > 0, index));
            return;
        }
        const [previousKeys, previousErrorKeys, previousCount, previousIndex] = previous;
        const submitFailed = count !== previousCount;
        const failed = submitFailed || keysGrew(errorKeys, previousErrorKeys);
        const requestedIndex = index !== previousIndex ? index : null;
        if (!failed && requestedIndex === null && sameKeys(keys, previousKeys)) return;
        commitTabKey(decideTabKey(failed, requestedIndex));
        if (submitFailed && props.scrollToError) scrollToFirstError();
    },
    { immediate: true },
);

/** A tab button the user clicked or reached with the keyboard. */
function selectTabFromUser(key: string): void {
    if (visibleTabKeys.value.includes(key)) commitTabKey(key);
}

/**
 * DTabs' own writes of the active pane id are ignored: they come from bvn
 * re-deriving the selection from its registered-tab list, which can lag
 * DXForm's by a render. The listener stays so the binding is controlled
 * (without it bvn would overwrite the id locally).
 */
function ignoreTabsWrite(): void {}

/**
 * A tab's click handler and its nav button's attributes: a roving tabindex
 * (only the selected tab is in the tab order) and the arrow-key handler,
 * which DXForm owns because DTabs runs with `no-key-nav`.
 *
 * Cached per key (and selection state), so every value keeps its identity
 * across renders. bvn re-evaluates this slot on every BTabs render and folds
 * each tab's `onClick` and `titleLinkAttrs` into its tab list, so a fresh
 * function or object each time re-renders BTabs, which re-evaluates the
 * slot: an endless update loop ("Maximum recursive updates").
 */
interface TabControls {
    onClick: () => void;
    selectedButtonAttrs: Record<string, unknown>;
    unselectedButtonAttrs: Record<string, unknown>;
}

const tabControlsByKey = new Map<string, TabControls>();

function tabControlsFor(key: string): TabControls {
    let controls = tabControlsByKey.get(key);
    if (controls === undefined) {
        const onKeydown = (event: KeyboardEvent) => handleTabKeydown(event, key);
        controls = {
            onClick: () => selectTabFromUser(key),
            selectedButtonAttrs: { tabindex: 0, onKeydown },
            unselectedButtonAttrs: { tabindex: -1, onKeydown },
        };
        tabControlsByKey.set(key, controls);
    }
    return controls;
}

// Forget the ids and controls of keys no longer in `props.tabs`, so a form
// whose tab list is rebuilt over its life does not keep every key it ever
// had. A tab hidden by `when` is still in `props.tabs` and keeps its id, so
// it returns as the same pane.
watch(
    () => (props.tabs ?? []).map((tab) => tab.key),
    (keys) => {
        const current = new Set(keys);
        for (const key of [...paneNumbers.keys()]) {
            if (!current.has(key)) paneNumbers.delete(key);
        }
        for (const key of [...tabControlsByKey.keys()]) {
            if (!current.has(key)) tabControlsByKey.delete(key);
        }
    },
);

function tabButtonAttrs(key: string): Record<string, unknown> {
    const controls = tabControlsFor(key);
    return key === activeTabKey.value
        ? controls.selectedButtonAttrs
        : controls.unselectedButtonAttrs;
}

/** bvn's horizontal key map: ←/→ step (Shift: to the end), Home/End/PageUp/PageDown jump. */
function handleTabKeydown(event: KeyboardEvent, key: string): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const keys = visibleTabKeys.value;
    const fromIndex = keys.indexOf(key);
    if (fromIndex === -1) return;
    const lastIndex = keys.length - 1;
    let targetIndex: number;
    switch (event.key) {
        case "ArrowLeft":
            targetIndex = event.shiftKey ? 0 : Math.max(fromIndex - 1, 0);
            break;
        case "ArrowRight":
            targetIndex = event.shiftKey ? lastIndex : Math.min(fromIndex + 1, lastIndex);
            break;
        case "Home":
        case "PageUp":
            targetIndex = 0;
            break;
        case "End":
        case "PageDown":
            targetIndex = lastIndex;
            break;
        default:
            return;
    }
    event.preventDefault();
    selectTabFromUser(keys[targetIndex]);
    // Focus follows the tab that ends up selected, after any parent answer
    // (commitTabKey's check was queued first, so it has run by now).
    nextTick(() => {
        const selectedKey = activeTabKey.value;
        if (selectedKey === null) return;
        document.getElementById(buttonIdFor(selectedKey))?.focus();
    });
}

/** Select the first visible tab owning a visible errored field, if any. */
function goToErrorTab(): void {
    const errorTabKey = firstErrorTabKey();
    if (errorTabKey !== null) commitTabKey(errorTabKey);
}

// ————————————————— taking the user to an errored field (#194)

/**
 * Controls a user types into or picks from: what a focus request lands on.
 * Looked for before anything else focusable, so a field whose label carries
 * an info button ("More information", earlier in document order) focuses
 * its input, not the button. Matching is only the first step: every
 * candidate must also pass `canTakeFocus`.
 */
const EDITABLE_CONTROL = [
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
    "select",
    "textarea",
    '[contenteditable="true"]',
    '[contenteditable=""]',
    '[role="combobox"]',
    '[role="textbox"]',
    '[role="spinbutton"]',
    '[role="listbox"]',
].join(", ");

/** The fallback for a widget with no editable control (a button picker). */
const ANY_FOCUSABLE = ["button", "a[href]", "[tabindex]"].join(", ");

/** Elements the browser focuses without a `tabindex`. */
const NATIVELY_FOCUSABLE = "input, select, textarea, button, a[href]";

/**
 * Frames to wait for a field's element: a lazy tab mounts its pane a render
 * or two after it is selected, and a repeater (an async component) renders
 * its rows after that. After this many, a nested key that never rendered an
 * element of its own (a media map's `image_media.<uuid>`) settles for its
 * owning field.
 */
const FIELD_RENDER_ATTEMPTS = 10;

/**
 * Further frames a FOCUS request waits for a control that can take focus
 * (about a second): an async editor renders its wrapper before its control,
 * and a widget may render its control disabled until its data loads.
 */
const CONTROL_RENDER_ATTEMPTS = 60;

const nextFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

/**
 * Whether `candidate` can take focus now: laid out, not disabled (itself or
 * through a disabled fieldset), not `aria-disabled`, not inside an `inert`
 * subtree, and focusable at all (a native control, contenteditable, or any
 * `tabindex`; a `div role="combobox"` with none is not). A negative
 * `tabindex` only takes an element out of the Tab order; it can still be
 * focused, so an editor surface with `tabindex="-1"` qualifies.
 */
function canTakeFocus(candidate: HTMLElement): boolean {
    if (candidate.offsetParent === null) return false;
    if (candidate.matches(":disabled")) return false;
    if (candidate.closest("fieldset:disabled") !== null) return false;
    if (candidate.getAttribute("aria-disabled") === "true") return false;
    if (candidate.closest("[inert]") !== null) return false;
    return (
        candidate.matches(NATIVELY_FOCUSABLE) ||
        candidate.isContentEditable ||
        candidate.hasAttribute("tabindex")
    );
}

/**
 * True when an element belongs to THIS form rather than to a DXForm nested in
 * one of its slots, whose fields can carry the same `data-dx-field-key`.
 */
function belongsToThisForm(element: HTMLElement): boolean {
    const root = resolveFormElement();
    return root !== null && element.closest("form") === root;
}

/** The first element matching `selector` (itself or inside) that can take focus. */
function firstFocusable(element: HTMLElement, selector: string): HTMLElement | null {
    if (element.matches(selector) && canTakeFocus(element) && belongsToThisForm(element)) {
        return element;
    }
    for (const candidate of Array.from(element.querySelectorAll<HTMLElement>(selector))) {
        if (canTakeFocus(candidate) && belongsToThisForm(candidate)) return candidate;
    }
    return null;
}

/**
 * The first shown element marked with this data path, or null. Compared as
 * an attribute value rather than built into a selector, so a key holding
 * quotes, brackets, spaces or dots (`image_media.<uuid>`) needs no escaping.
 * Nested markers for one key (a slot binding `targetAttrs` around a DXField)
 * resolve to the outer one, whose subtree holds the inner one's control.
 */
function shownFieldElement(path: string): HTMLElement | null {
    const root = resolveFormElement();
    if (root === null) return null;
    for (const element of Array.from(root.querySelectorAll<HTMLElement>("[data-dx-field-key]"))) {
        if (
            element.getAttribute("data-dx-field-key") === path &&
            element.offsetParent !== null &&
            element.closest("form") === root
        ) {
            return element;
        }
    }
    return null;
}

/**
 * The element to take the user to for an error: the one rendered for the
 * EXACT error path (`lines.1.price`, a repeater row's field) when there is
 * one, else the owning field's (`lines`). DXField's roots carry
 * `data-dx-field-key`, as does whatever a `field(<key>)` slot binds
 * `targetAttrs` to. Null when neither renders (an unmarked slot, consumer
 * content, a tab that cannot be shown).
 */
async function renderedErrorElement(
    errorKey: string,
    fieldKey: string,
): Promise<HTMLElement | null> {
    for (let attempt = 0; attempt < FIELD_RENDER_ATTEMPTS; attempt += 1) {
        await nextTick();
        const exact = shownFieldElement(errorKey);
        if (exact !== null) return exact;
        if (attempt < FIELD_RENDER_ATTEMPTS - 1) await nextFrame();
    }
    return errorKey === fieldKey ? null : shownFieldElement(fieldKey);
}

/**
 * Scroll a field into view. A field that fits in the viewport is scrolled
 * whole, so its label and the message under its input show too. One taller
 * than the viewport (a marked container with a long explanation above its
 * input) is scrolled by its first usable control, centred, since scrolling
 * by its own edge can leave the input below the fold: an editable control
 * when there is one, else anything focusable (a picker's button). Never
 * focuses.
 */
function scrollFieldIntoView(element: HTMLElement): void {
    const control =
        firstFocusable(element, EDITABLE_CONTROL) ?? firstFocusable(element, ANY_FOCUSABLE);
    if (control !== null && element.getBoundingClientRect().height > window.innerHeight) {
        control.scrollIntoView({ block: "center" });
        return;
    }
    element.scrollIntoView({ block: "nearest" });
}

/** Bumped per scroll/focus request, so only the latest one acts. */
let revealToken = 0;

/**
 * After a failed submit: once the decision has selected the tab and the
 * failure's render has flushed (its pane mounted), scroll the first owned
 * field on that tab into view. Each target is looked up in the form's DOM
 * at that moment, in order, never from an earlier render's record: a target
 * whose marker never renders (an unmarked `field(<key>)` slot, consumer
 * content) is skipped after its render frames, for the next one. No focus,
 * so a phone does not raise its keyboard over the summary.
 */
function scrollToFirstError(): void {
    const selectedKey = activeTabKey.value;
    const targets = liveErrorTargets.value.filter(
        (target) =>
            target.fieldKey !== null &&
            (target.tabKey === null || target.tabKey === selectedKey),
    );
    if (targets.length === 0) return;
    const token = ++revealToken;
    void (async () => {
        for (const target of targets) {
            // Its first lookup waits for the flush (nextTick), so a marker
            // rendered by the failure itself is found.
            const element = await renderedErrorElement(target.errorKey, target.fieldKey!);
            if (token !== revealToken) return;
            if (element !== null) {
                scrollFieldIntoView(element);
                return;
            }
        }
    })();
}

/**
 * Where focus goes when the field cannot take it (nothing marked renders,
 * or nothing in it can be focused): the selected tab's button, with its pane
 * scrolled into view, so focus never drops to the body (a summary row of an
 * unopened lazy tab, once the pane replaces what was shown). A form with no
 * tabs leaves focus where it is (the summary row).
 */
function focusSelectedTab(): void {
    const selectedKey = activeTabKey.value;
    if (selectedKey === null) return;
    document.getElementById(paneIdFor(selectedKey))?.scrollIntoView({ block: "nearest" });
    document.getElementById(buttonIdFor(selectedKey))?.focus();
}

/**
 * Take the user to an error a summary lists: select its tab, wait for the
 * pane to render, look the field up in the form (its marker, anywhere
 * inside the form's element, a teleport target inside the form included),
 * scroll it into view and focus its control: an editable control that can
 * take focus, waiting (about a second) while none can, e.g. an async editor
 * still loading or a widget rendered disabled until its data arrives;
 * anything else focusable only as a fallback. A focus counts only once
 * `document.activeElement` is the control. The field is looked up again by
 * its key whenever its element leaves the DOM (a re-render replacing it),
 * and a moment with none at all is waited out. When no marker renders
 * within the field's render frames, or nothing in it takes focus, focus
 * moves to the selected tab's button. Exposed so a summary rendered OUTSIDE
 * the form (DXTable's modal footer) can drive it.
 */
async function focusErrorTarget(target: ErrorSummarySelection): Promise<void> {
    if (target.tabKey !== null && visibleTabKeys.value.includes(target.tabKey)) {
        commitTabKey(target.tabKey);
    }
    const token = ++revealToken;
    let element = await renderedErrorElement(
        target.errorKey ?? target.fieldKey,
        target.fieldKey,
    );
    if (token !== revealToken) return;
    if (element === null) {
        focusSelectedTab();
        return;
    }
    const path = element.getAttribute("data-dx-field-key") ?? target.fieldKey;
    scrollFieldIntoView(element);

    const tryFocus = (control: HTMLElement | null): boolean => {
        if (control === null) return false;
        control.focus({ preventScroll: true });
        if (document.activeElement !== control) return false;
        control.scrollIntoView({ block: "nearest" });
        return true;
    };

    for (let attempt = 0; attempt <= CONTROL_RENDER_ATTEMPTS; attempt += 1) {
        if (element !== null && tryFocus(firstFocusable(element, EDITABLE_CONTROL))) return;
        if (attempt === CONTROL_RENDER_ATTEMPTS) break;
        await nextFrame();
        if (token !== revealToken) return;
        // A re-render may have replaced the field's element, or removed it
        // for a moment: look it up again by its key.
        if (element === null || !element.isConnected) element = shownFieldElement(path);
    }
    if (element !== null && tryFocus(firstFocusable(element, ANY_FOCUSABLE))) return;
    focusSelectedTab();
}

// ————————————————— failed-submit summary

/** A summary is listing a failure, so the form-level alert steps aside. */
const isSummaryShowing = computed(
    () =>
        props.errorSummary !== false &&
        resolvedForm.value.submitFailure !== null &&
        resolvedForm.value.submitFailure !== undefined,
);

const summaryBindings = computed(() => ({
    form: resolvedForm.value,
    fields: resolvedFields.value,
    tabs: props.tabs,
    context: props.context,
    targets: summaryTargets.value,
    // Undefined when unset, so the summary's own defaults apply.
    title: props.errorSummaryTitle,
    otherTitle: props.errorSummaryOtherTitle,
}));

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

defineExpose({
    /** Select the first visible tab owning a visible errored field, if any. */
    goToErrorTab,
    /** Select an error's tab, then scroll to and focus its field. */
    focusErrorTarget,
    /** What the last failed submit returned, resolved by this form's rules. */
    errorTargets: summaryTargets,
});
</script>
