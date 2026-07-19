<!--
  @component
  Internal edit/create modal for `DXTable` (#129). Renders the `DModal` +
  `DXForm` and maps DXTable's `edit-value`/`edit-span`/`tab-*` slots onto
  DXForm's `value`/`span`/`tab-*` slots, providing the row context and a `close`
  handle. Extracted so `DXTable` is a thin façade over the table render, the
  pagination, the editor logic (`useResourceEditor`) and this modal — rather than
  owning all four.

  The edit-modal slots reach here forwarded from DXTable (consumer → DXTable →
  here → DXForm). This component computes which keyed slots the consumer actually
  provided from its OWN `$slots`, so the slot-plumbing lives entirely with the
  modal, not the composable.
-->
<template>
    <DModal
        :model-value="show"
        :title="title"
        :size="size"
        @update:model-value="emit('update:show', $event)"
    >
        <!-- Loading the full record for edit (showUrl fetch) -->
        <div
            v-if="loading"
            class="dx-edit-loading d-flex align-items-center gap-2 text-muted mb-3"
        >
            <DSpinner small />
            <span>Loading…</span>
        </div>

        <!-- Edit/create form (tabbed when tabs provided, flat otherwise).

             Keyed per modal open: the form OBJECT is created once and then
             reseeded in place for each row, so without a key Vue reuses the
             same DXField instances across records — and any per-field UI
             state rides along with them. That leaked a revealed password
             from one row into the next. The key gives each record a fresh
             field subtree; the data still lives in `form`, so nothing
             is lost by remounting. -->
        <!-- Tabs stay bare here: the modal body already provides the panel
             boundary, so DXForm's default card-panel-around-tabs (#159) would be
             redundant nested chrome inside the modal. -->
        <DXForm
            v-if="form"
            :key="formInstanceKey"
            :active-tab="activeTab"
            :form="form"
            :fields="fields"
            :tabs="tabs"
            :card-tabs="false"
            :context="item ?? undefined"
            :show-submit="false"
            @update:active-tab="emit('update:activeTab', $event)"
            @submit="emit('save')"
        >
            <!-- Forward DXTable's edit-value(key) → DXForm value(key) -->
            <template
                v-for="key in editValueSlotKeys"
                :key="`ev-${key}`"
                #[`value(${key})`]="sp"
            >
                <!--
                  @slot Custom input for field `<key>` in the edit/create modal, forwarded to DXForm. Name it `edit-value(<fieldKey>)`.
                  @binding {object} item The row being edited (null in create mode).
                  @binding {any} value The current field value.
                  @binding {Function} update Call with a new value to update the field.
                  @binding {object} field The field definition.
                -->
                <slot
                    :name="`edit-value(${key})`"
                    :item="item"
                    :value="sp.value"
                    :update="sp.update"
                    :field="sp.field"
                />
            </template>

            <!-- Forward edit-span(key) → span(key) -->
            <template
                v-for="key in editSpanSlotKeys"
                :key="`es-${key}`"
                #[`span(${key})`]="sp"
            >
                <!--
                  @slot Full-width custom content for field `<key>` in the edit/create modal, forwarded to DXForm's span slot. Name it `edit-span(<fieldKey>)`.
                  @binding {object} item The row being edited (null in create mode).
                  @binding {any} value The current field value.
                  @binding {Function} update Call with a new value to update the field.
                  @binding {Function} close Call to close the edit modal.
                -->
                <slot
                    :name="`edit-span(${key})`"
                    :item="item"
                    :value="sp.value"
                    :update="sp.update"
                    :close="close"
                />
            </template>

            <!-- Forward tab-content / tab-before / tab-after slots -->
            <template
                v-for="key in tabContentSlotKeys"
                :key="`tc-${key}`"
                #[`tab-content(${key})`]="sp"
            >
                <!--
                  @slot Replaces the auto-rendered fields of edit-modal tab `<key>` with custom content. Name it `tab-content(<tabKey>)`.
                  @binding {object} item The row being edited (null in create mode).
                  @binding {object} tab The tab definition.
                -->
                <slot :name="`tab-content(${key})`" :item="item" :tab="sp.tab" />
            </template>
            <template
                v-for="key in tabBeforeSlotKeys"
                :key="`tb-${key}`"
                #[`tab-before(${key})`]="sp"
            >
                <!--
                  @slot Custom content rendered before the fields of edit-modal tab `<key>`. Name it `tab-before(<tabKey>)`.
                  @binding {object} item The row being edited (null in create mode).
                  @binding {object} tab The tab definition.
                -->
                <slot :name="`tab-before(${key})`" :item="item" :tab="sp.tab" />
            </template>
            <template
                v-for="key in tabAfterSlotKeys"
                :key="`taf-${key}`"
                #[`tab-after(${key})`]="sp"
            >
                <!--
                  @slot Custom content rendered after the fields of edit-modal tab `<key>`. Name it `tab-after(<tabKey>)`.
                  @binding {object} item The row being edited (null in create mode).
                  @binding {object} tab The tab definition.
                -->
                <slot :name="`tab-after(${key})`" :item="item" :tab="sp.tab" />
            </template>
        </DXForm>

        <template #footer>
            <div class="d-flex justify-content-between w-100">
                <div>
                    <DButton
                        v-if="deleteUrl && !isCreateMode"
                        variant="danger"
                        :loading="pendingAction === 'delete'"
                        loading-text="Deleting..."
                        :disabled="form?.processing || loading"
                        @click="emit('delete')"
                    >
                        Delete
                    </DButton>
                </div>
                <div class="d-flex gap-2">
                    <DButton variant="secondary" @click="close">
                        Cancel
                    </DButton>
                    <DButton
                        variant="primary"
                        :loading="pendingAction === 'save'"
                        :loading-text="isCreateMode ? 'Creating...' : 'Saving...'"
                        :disabled="form?.processing || loading"
                        @click="emit('save')"
                    >
                        {{ isCreateMode ? 'Create' : 'Save Changes' }}
                    </DButton>
                </div>
            </div>
        </template>
    </DModal>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";
import DModal from "../base/DModal.vue";
import DButton from "../base/DButton.vue";
import DSpinner from "../base/DSpinner.vue";
import DXForm from "./DXForm.vue";
import type { EditTab } from "./DXTable.vue";

interface Props {
    /** Whether the modal is open (v-model:show). */
    show: boolean;
    /** Modal title. */
    title: string;
    /** Modal size. */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** True while the full record is loading via showUrl. */
    loading: boolean;
    /** The edit/create form (a useForm instance), or null before first open. */
    form: any;
    /** Bumped per modal open to remount the DXForm subtree (fresh DXField state). */
    formInstanceKey: number;
    /** Active tab index (v-model:active-tab). */
    activeTab: number;
    /** Field definitions passed to DXForm. */
    fields: any[];
    /** Tab definitions passed to DXForm. */
    tabs?: EditTab[];
    /** The row being edited (null in create mode) — the slot/context row. */
    item: any;
    /** Whether the modal is in create mode (vs edit). */
    isCreateMode: boolean;
    /** Which action is in flight, so Save/Delete show their own loading label. */
    pendingAction: 'save' | 'delete' | null;
    /** Delete endpoint — gates the Delete button. */
    deleteUrl?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    /** v-model:show — the modal open state changed. */
    'update:show': [value: boolean];
    /** v-model:active-tab — the active tab changed. */
    'update:activeTab': [value: number];
    /** Save was requested (footer button or DXForm submit). */
    save: [];
    /** Cancel/close was requested. */
    cancel: [];
    /** Delete was requested. */
    delete: [];
}>();

// Close the modal — shared by the Cancel button and the `close` binding handed
// to consumers' edit-span slots.
const close = () => emit('cancel');

// Which keyed slots the consumer actually provided (computed from THIS
// component's slots — they're forwarded here from DXTable). Forwarding only the
// provided ones stops DXForm mistaking an always-present wrapper for a real
// custom-value override.
const slots = useSlots();
const fieldKeys = computed<string[]>(() => (props.fields ?? []).map((field: any) => field.key));
const tabKeys = computed<string[]>(() => (props.tabs ?? []).map((tab) => tab.key));

const editValueSlotKeys = computed(() =>
    fieldKeys.value.filter((key) => !!slots[`edit-value(${key})`]),
);
const editSpanSlotKeys = computed(() =>
    fieldKeys.value.filter((key) => !!slots[`edit-span(${key})`]),
);
const tabContentSlotKeys = computed(() =>
    tabKeys.value.filter((key) => !!slots[`tab-content(${key})`]),
);
const tabBeforeSlotKeys = computed(() =>
    tabKeys.value.filter((key) => !!slots[`tab-before(${key})`]),
);
const tabAfterSlotKeys = computed(() =>
    tabKeys.value.filter((key) => !!slots[`tab-after(${key})`]),
);
</script>
