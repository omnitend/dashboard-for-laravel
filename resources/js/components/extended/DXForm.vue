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
    <BForm @submit.prevent="handleSubmit">
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
        <component :is="card ? DCard : 'div'" v-if="hasTabs" v-bind="card ? { noBody: true } : {}">
            <DTabs v-model:index="activeTab" :card="card">
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

                        <template v-for="field in visibleFieldsFor(tab)" :key="field.key">
                            <!--
                              @slot Fully replaces a field's rendering (including its label), keyed by field key: `field(<key>)`. Unlike `value(<key>)`, bypasses DXField entirely — like `tab-content`, this also supersedes `field-before(<key>)`/`field-after(<key>)` for the same key.
                              @binding {FieldDefinition} field The field definition being replaced.
                              @binding {object} model Live form data merged with `context`, for predicates.
                            -->
                            <slot
                                v-if="$slots[`field(${field.key})`]"
                                :name="`field(${field.key})`"
                                :field="field"
                                :model="model"
                            />
                            <template v-else>
                                <!--
                                  @slot Content inserted directly above a field, keyed by field key: `field-before(<key>)`. Not rendered when `field(<key>)` replaces the same field.
                                  @binding {FieldDefinition} field The field about to be rendered.
                                  @binding {object} model Live form data merged with `context`, for predicates.
                                -->
                                <slot :name="`field-before(${field.key})`" :field="field" :model="model" />

                                <DXField
                                    :field="field"
                                    :form="resolvedForm"
                                    :model="model"
                                    :layout="field.layout ?? layout"
                                    :label-cols="field.labelCols ?? labelCols"
                                >
                                    <template
                                        v-for="(slotName, target) in fieldSlotMap(field.key)"
                                        :key="target"
                                        #[target]="slotProps"
                                    >
                                        <!-- @slot Per-field overrides forwarded to DXField, keyed by field key: `value(<key>)`, `span(<key>)`, `info(<key>)`, `hint(<key>)`, `repeater-row(<key>)`. -->
                                        <slot :name="slotName" v-bind="slotProps" />
                                    </template>
                                </DXField>

                                <!--
                                  @slot Content inserted directly below a field, keyed by field key: `field-after(<key>)`. Not rendered when `field(<key>)` replaces the same field.
                                  @binding {FieldDefinition} field The field that was just rendered.
                                  @binding {object} model Live form data merged with `context`, for predicates.
                                -->
                                <slot :name="`field-after(${field.key})`" :field="field" :model="model" />
                            </template>
                        </template>

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
                <template v-for="field in visibleFlatFields" :key="field.key">
                    <!--
                      @slot Fully replaces a field's rendering (including its label), keyed by field key: `field(<key>)`. Unlike `value(<key>)`, bypasses DXField entirely — like `tab-content`, this also supersedes `field-before(<key>)`/`field-after(<key>)` for the same key.
                      @binding {FieldDefinition} field The field definition being replaced.
                      @binding {object} model Live form data merged with `context`, for predicates.
                    -->
                    <slot
                        v-if="$slots[`field(${field.key})`]"
                        :name="`field(${field.key})`"
                        :field="field"
                        :model="model"
                    />
                    <template v-else>
                        <!--
                          @slot Content inserted directly above a field, keyed by field key: `field-before(<key>)`. Not rendered when `field(<key>)` replaces the same field.
                          @binding {FieldDefinition} field The field about to be rendered.
                          @binding {object} model Live form data merged with `context`, for predicates.
                        -->
                        <slot :name="`field-before(${field.key})`" :field="field" :model="model" />

                        <DXField
                            :field="field"
                            :form="resolvedForm"
                            :model="model"
                            :layout="field.layout ?? layout"
                            :label-cols="field.labelCols ?? labelCols"
                        >
                            <template
                                v-for="(slotName, target) in fieldSlotMap(field.key)"
                                :key="target"
                                #[target]="slotProps"
                            >
                                <!-- @slot Per-field overrides forwarded to DXField, keyed by field key: `value(<key>)`, `span(<key>)`, `info(<key>)`, `hint(<key>)`, `repeater-row(<key>)`. -->
                                <slot :name="slotName" v-bind="slotProps" />
                            </template>
                        </DXField>

                        <!--
                          @slot Content inserted directly below a field, keyed by field key: `field-after(<key>)`. Not rendered when `field(<key>)` replaces the same field.
                          @binding {FieldDefinition} field The field that was just rendered.
                          @binding {object} model Live form data merged with `context`, for predicates.
                        -->
                        <slot :name="`field-after(${field.key})`" :field="field" :model="model" />
                    </template>
                </template>

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
import { computed, watch } from "vue";
import { BForm } from "bootstrap-vue-next";
import DAlert from "../base/DAlert.vue";
import DButton from "../base/DButton.vue";
import DCard from "../base/DCard.vue";
import DTabs from "../base/DTabs.vue";
import DTab from "../base/DTab.vue";
import DXField from "./DXField.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { DefineFormReturn } from "../../composables/defineForm";
import type { FieldDefinition, FormTab, LabelCols, MaybeFn } from "../../types";

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
     * `card` prop). Tabbed forms render the tab nav as a BS5
     * card-header-tabs instead of double-wrapping. Off by default since
     * DXForm is commonly embedded in a page card or modal already.
     */
    card?: boolean;

    /**
     * Form-wide field layout: "vertical" (default, label above input) or
     * "horizontal" (label left, input right). Overridable per-field via
     * `field.layout`. A field with `span: true` always renders full-width,
     * regardless of layout.
     */
    layout?: "vertical" | "horizontal";

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
    layout: "vertical",
});

const emit = defineEmits<{
    /** Emitted when the form is submitted, after the native submit is prevented. */
    submit: [];
}>();

const slots = defineSlots<Record<string, (props: any) => any>>();

/** v-model for the active tab index. */
const activeTab = defineModel<number>("activeTab", { default: 0 });

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

function resolvePredicate(
    when: MaybeFn<boolean> | undefined,
    fallback: boolean,
): boolean {
    if (when === undefined) return fallback;
    return typeof when === "function" ? when(model.value) : when;
}

/** Resolve a tab's (possibly function-valued) label against the live model. */
function resolveTabLabel(tab: FormTab): string {
    const label =
        typeof tab.label === "function" ? tab.label(model.value) : tab.label;
    return label || tab.key;
}

function isFieldVisible(field: FieldDefinition): boolean {
    const whenOk = resolvePredicate(field.when, true);
    const showOk = field.show ? field.show() : true;
    return whenOk && showOk;
}

// ————————————————— tabs

const hasTabs = computed(
    () => !!props.tabs && props.tabs.length > 0,
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

// ————————————————— per-field slot forwarding

/** Map a DXField slot name to the parent's keyed slot, when present. */
function fieldSlotMap(key: string): Record<string, string> {
    const map: Record<string, string> = {};
    const candidates: Array<[string, string]> = [
        ["value", `value(${key})`],
        ["span", `span(${key})`],
        ["info", `info(${key})`],
        ["hint", `hint(${key})`],
        ["repeater-row", `repeater-row(${key})`],
    ];
    for (const [target, source] of candidates) {
        if (slots[source]) map[target] = source;
    }
    return map;
}

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
