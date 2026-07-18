import { computed, ref, useSlots, type Ref } from "vue";
import axios from "axios";
import { useForm } from "./useForm";
import { useToast } from "./useToast";

/**
 * The subset of `DXTable`'s props the resource editor reads. Declared
 * structurally (not imported from DXTable.vue) so the composable stays a
 * lower-level dependency — DXTable imports the composable, not the reverse.
 * DXTable's full `Props` is structurally assignable to this.
 */
export interface ResourceEditorProps<T = any> {
    /** Field definitions for the edit/create modal (enables edit-on-row-click). */
    editFields?: any[];
    /** Tab definitions — only their `key` is read here (DXForm consumes the rest). */
    editTabs?: Array<{ key: string }>;
    /** Modal title, or a function of the edited row. */
    editModalTitle?: string | ((item: any) => string);
    /** `PUT` endpoint pattern for updates, e.g. `/api/products/:id`. */
    editUrl?: string;
    /** `GET` endpoint pattern to fetch the full record on open, e.g. `/api/products/:id`. */
    showUrl?: string;
    /** `DELETE` endpoint pattern, e.g. `/api/products/:id`. */
    deleteUrl?: string;
    /** `POST` endpoint for creating new items, e.g. `/api/products`. */
    createUrl?: string;
    /** Guard run before delete — a message short-circuits with a toast. */
    deleteGuard?: (item: T) => string | null | undefined;
}

/**
 * The events the editor emits back through DXTable's `emit`. Declared as the
 * exact call signatures it uses (a subset of DXTable's emits) so DXTable's typed
 * `emit` is structurally assignable here.
 */
export interface ResourceEditorEmit<T = any> {
    (event: 'rowCreated', item: any, response: any): void;
    (event: 'createError', error: any): void;
    (event: 'rowUpdated', item: T, response: any): void;
    (event: 'editError', item: T, error: any): void;
    (event: 'rowDeleted', item: T, response: any): void;
    (event: 'deleteError', item: T, error: any): void;
}

export interface UseResourceEditorOptions {
    /** Invalidate whichever data source is active, after a successful CRUD op. */
    refresh: () => void;
    /** Singular item noun (e.g. "product") — for toasts and the modal title. */
    singularItemName: Ref<string>;
}

/**
 * The resource editor for `DXTable` — the create/edit/delete concern lifted out
 * of the god-component (#129). Owns the edit-modal state, form seeding and
 * visibility rules, the `showUrl` full-record fetch, submission (create `POST` /
 * edit `PUT` / delete), the success/error toasts, and the edit-modal slot-key
 * computeds. It never touches the table's data source, sort, filter, per-page
 * or pagination state — the only coupling back to the table is the `refresh`
 * callback it calls after a successful op.
 *
 * DXTable keeps `handleRowClick` (which emits `rowClicked` regardless) and calls
 * `openEdit` from it; `openEdit` is a no-op unless `editFields` are set.
 */
export function useResourceEditor<T = any>(
    props: ResourceEditorProps<T>,
    emit: ResourceEditorEmit<T>,
    options: UseResourceEditorOptions,
) {
    const { refresh, singularItemName } = options;
    const slots = useSlots();

    // Edit Modal State
    const showEditModal = ref(false);

    // Bumped on every modal open (edit or create) to key the DXForm subtree, so
    // each record gets fresh DXField instances. NOT bumped by the showUrl fetch,
    // which reseeds the SAME record — remounting there would discard edits the
    // user has already made while the fetch was in flight.
    const editFormInstanceKey = ref(0);
    const selectedItem = ref<T | null>(null);
    const editForm = ref<any>(null);
    const activeTabIndex = ref(0);
    const isCreateMode = ref(false);

    // Which modal action is in flight, so the Save and Delete buttons show their
    // own loading label independently. `editForm.processing` is shared by every
    // request the form makes, so it can't tell Save from Delete on its own.
    const pendingAction = ref<'save' | 'delete' | null>(null);

    // True while the edit modal is fetching the full record via `showUrl`.
    const editLoading = ref(false);

    // Monotonic token so a slow fetch for a previously-opened row can't overwrite
    // the form after the user has since opened a different row.
    let editFetchToken = 0;

    // Toast (may not be available in test environment)
    let createToast: ((obj: any) => any) | undefined;
    try {
        const toast = useToast();
        createToast = toast.create;
    } catch (e) {
        // BApp not available (test environment or missing setup)
        createToast = undefined;
    }

    // The edit/create form rendering is delegated to DXForm, which
    // owns field/tab visibility, dynamic labels/hints, conditional fields,
    // and auto-switching to the first tab with a validation error.

    /*
     * A field's own starting value, used to seed a CREATE form and as the fallback
     * when a row lacks the key (#122).
     *
     * `field.default ?? ''` can't express a NULL default: a select whose "none"
     * option is `value: null` — which is what the column stores — seeds '' instead,
     * matches no option, and renders blank. Presence, not nullishness, decides here
     * too, so the create and edit paths agree about the same field.
     */
    const defaultValueFor = (field: any): any =>
        Object.prototype.hasOwnProperty.call(field, 'default') ? field.default : '';

    /*
     * Seeding an EDIT form from a row (#117).
     *
     * `row[key] ?? field.default` is wrong: it can't tell "the row has no such key"
     * from "the row's value IS null", so an explicitly-null column gets overwritten
     * by the field's default — a value the user never saw, on a field they may not
     * even be able to see. Presence, not nullishness, decides.
     */
    const seedValueFor = (field: any, row: T): any => {
        if (Object.prototype.hasOwnProperty.call(row as any, field.key)) {
            return (row as any)[field.key];
        }
        return defaultValueFor(field);
    };

    /*
     * Whether a field is currently VISIBLE, by the same rule DXForm renders by
     * (`when` + the legacy `show`), against the same model (context + live data).
     * Kept in step with DXForm.isFieldVisible.
     */
    const editPredicateModel = computed(() => ({
        ...((selectedItem.value as any) ?? {}),
        ...(editForm.value?.data ?? {}),
    }));

    const isEditFieldVisible = (field: any): boolean => {
        const when = field.when;
        const whenOk =
            when === undefined
                ? true
                : typeof when === 'function'
                  ? when(editPredicateModel.value)
                  : when;
        const showOk = field.show ? field.show() : true;
        return whenOk && showOk;
    };

    // Fields whose value actually belongs in the payload. A presentational field
    // (submit: false) renders but holds no data — see FieldDefinition.submit.
    const submittableEditFields = computed(() =>
        (props.editFields ?? []).filter((field) => field.submit !== false),
    );

    // Enforced at SUBMIT, not just at seeding: the modal still renders every field,
    // so a `submit: false` control — or a `span` slot calling `update` — can write
    // its key back into the form data after seeding. Strip them on the way out.
    const nonSubmittedFieldKeys = computed(
        () =>
            new Set(
                (props.editFields ?? [])
                    .filter(
                        (field) =>
                            // Presentational: lays the form out, holds no data (#110).
                            field.submit === false ||
                            // Hidden by `when` at submit time (#117). Submitting a field
                            // the user cannot see is a silent write — and with `default`
                            // set it writes a value they never chose. Omitting the key
                            // leaves the stored value alone.
                            !isEditFieldVisible(field),
                    )
                    .map((field) => field.key),
            ),
    );

    const stripNonSubmittedFields = (data: Record<string, any>): Record<string, any> => {
        if (nonSubmittedFieldKeys.value.size === 0) return data;
        return Object.fromEntries(
            Object.entries(data).filter(([key]) => !nonSubmittedFieldKeys.value.has(key)),
        );
    };

    const editFieldKeys = computed<string[]>(() =>
        (props.editFields ?? []).map((field: any) => field.key),
    );
    const tabKeys = computed<string[]>(() =>
        (props.editTabs ?? []).map((tab) => tab.key),
    );
    // Forward only the keyed edit slots the consumer actually provided, so
    // DXForm doesn't mistake an always-present (but empty) wrapper for
    // a real custom-value override.
    const editValueSlotKeys = computed(() =>
        editFieldKeys.value.filter((key) => !!slots[`edit-value(${key})`]),
    );
    const editSpanSlotKeys = computed(() =>
        editFieldKeys.value.filter((key) => !!slots[`edit-span(${key})`]),
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

    // Modal title (supports function)
    const computedModalTitle = computed(() => {
        if (isCreateMode.value) {
            return `New ${singularItemName.value}`;
        }
        if (!selectedItem.value) {
            return `Edit ${singularItemName.value}`;
        }
        if (!props.editModalTitle) {
            return `Edit ${singularItemName.value}`;
        }
        return typeof props.editModalTitle === 'function'
            ? props.editModalTitle(selectedItem.value)
            : props.editModalTitle;
    });

    // Open the edit modal for a row. No-op unless `editFields` are set — the row
    // click still emits `rowClicked` (in DXTable) regardless.
    const openEdit = (item: T) => {
        if (!props.editFields || props.editFields.length === 0) return;

        // Set selected item FIRST before any rendering
        isCreateMode.value = false;
        selectedItem.value = item;

        // Reset to first tab
        activeTabIndex.value = 0;

        // Initialize form with item data. `useForm` is statically imported, so
        // seeding is synchronous — no interleaving between successive row opens.
        if (!editForm.value) {
            const formData: Record<string, any> = {};
            // Presentational fields (submit: false) lay the form out; they hold
            // no data and must not be POSTed just because they were declared.
            submittableEditFields.value.forEach(field => {
                formData[field.key] = seedValueFor(field, item);
            });
            editForm.value = useForm(formData);
        } else {
            // Update existing form
            submittableEditFields.value.forEach(field => {
                editForm.value.data[field.key] = seedValueFor(field, item);
            });
            editForm.value.clearErrors();
        }

        // Open modal
        editFormInstanceKey.value++;
        showEditModal.value = true;

        // Optionally replace the row-seeded data with the full record.
        if (props.showUrl) void fetchFullRecordForEdit(item);
    };

    // Fetch the full record for the edit modal and re-seed the form from it. The
    // form is already showing row data; this fills in fields the list row omitted.
    const fetchFullRecordForEdit = async (item: T) => {
        const itemId = (item as any).id;
        if (itemId === undefined || itemId === null) return;

        const token = ++editFetchToken;
        editLoading.value = true;
        try {
            const url = props.showUrl!.replace(':id', String(itemId));
            const response = await axios.get(url);
            // Superseded by a newer row-open — discard.
            if (token !== editFetchToken) return;

            const record = response.data?.data ?? response.data;
            if (record && editForm.value) {
                submittableEditFields.value.forEach(field => {
                    if (Object.prototype.hasOwnProperty.call(record, field.key)) {
                        editForm.value.data[field.key] = record[field.key];
                    }
                });
                // Widen selectedItem so predicates / the delete guard see full data.
                selectedItem.value = { ...(selectedItem.value as any), ...record };
            }
        } catch (error: any) {
            if (token !== editFetchToken) return;
            const message =
                error?.response?.data?.message ??
                error?.message ??
                'Failed to load the full record.';
            createToast?.({
                title: 'Error',
                body: message,
                variant: 'danger',
                modelValue: 5000,
            });
        } finally {
            if (token === editFetchToken) editLoading.value = false;
        }
    };

    // Open the create modal.
    const openCreate = () => {
        if (!props.editFields || props.editFields.length === 0) return;

        isCreateMode.value = true;
        selectedItem.value = null;
        activeTabIndex.value = 0;

        // Supersede any in-flight row-open fetch so a slow showUrl fetch from an
        // earlier edit can't seed over this create.
        editFetchToken++;
        editLoading.value = false;

        if (!editForm.value) {
            const formData: Record<string, any> = {};
            submittableEditFields.value.forEach(field => {
                formData[field.key] = defaultValueFor(field);
            });
            editForm.value = useForm(formData);
        } else {
            // Reset existing form to defaults
            submittableEditFields.value.forEach(field => {
                editForm.value.data[field.key] = defaultValueFor(field);
            });
            editForm.value.clearErrors();
        }
        editFormInstanceKey.value++;
        showEditModal.value = true;
    };

    // Save from the edit modal
    const save = async () => {
        if (!editForm.value) return;

        pendingAction.value = 'save';
        try {
            await performSave();
        } finally {
            pendingAction.value = null;
        }
    };

    const performSave = async () => {
        // Create mode: POST to createUrl
        if (isCreateMode.value && props.createUrl) {
            try {
                await editForm.value.post(props.createUrl, {
                    transform: stripNonSubmittedFields,
                    onSuccess: (data: any) => {
                        createToast?.({
                            title: 'Success',
                            body: `${singularItemName.value} created successfully`,
                            variant: 'success',
                            modelValue: 3000,
                        });

                        emit('rowCreated', data?.data ?? data, data);
                        showEditModal.value = false;
                        selectedItem.value = null;
                        isCreateMode.value = false;

                        refresh();
                    },
                    onError: (errors: any) => {
                        let errorMessage = 'Failed to create. Please check the form for errors.';
                        if (errors && typeof errors === 'object') {
                            const firstError = Object.values(errors).flat()[0];
                            if (typeof firstError === 'string') {
                                errorMessage = firstError;
                            }
                        }

                        createToast?.({
                            title: 'Error',
                            body: errorMessage,
                            variant: 'danger',
                            modelValue: 5000,
                        });

                        // DXForm switches to the first errored tab via its
                        // own watcher on editForm.errors.
                        emit('createError', errors);
                    }
                });
            } catch (error) {
                emit('createError', error);
            }
            return;
        }

        // Edit mode: PUT to editUrl
        if (!selectedItem.value) return;

        try {
            // If editUrl provided, handle API call internally
            if (props.editUrl) {
                const itemId = (selectedItem.value as any).id;
                const url = props.editUrl.replace(':id', itemId);

                await editForm.value.put(url, {
                    transform: stripNonSubmittedFields,
                    onSuccess: (data: any) => {
                        // Show success toast
                        createToast?.({
                            title: 'Success',
                            body: `${singularItemName.value} updated successfully`,
                            variant: 'success',
                            modelValue: 3000, // Auto-dismiss after 3 seconds
                        });

                        emit('rowUpdated', selectedItem.value as T, data);
                        showEditModal.value = false;
                        selectedItem.value = null;

                        // Refresh table data to show updated values
                        refresh();
                    },
                    onError: (errors: any) => {
                        // Extract first error message for toast
                        let errorMessage = 'Failed to update. Please check the form for errors.';
                        if (errors && typeof errors === 'object') {
                            const firstError = Object.values(errors).flat()[0];
                            if (typeof firstError === 'string') {
                                errorMessage = firstError;
                            }
                        }

                        // Show error toast with specific message
                        createToast?.({
                            title: 'Error',
                            body: errorMessage,
                            variant: 'danger',
                            modelValue: 5000, // Auto-dismiss after 5 seconds
                        });

                        // DXForm switches to the first errored tab via its
                        // own watcher on editForm.errors.
                        emit('editError', selectedItem.value as T, errors);
                    }
                });
            } else {
                // No editUrl - just emit event for custom handling
                emit('rowUpdated', selectedItem.value as T, editForm.value.data);
                showEditModal.value = false;
                selectedItem.value = null;
            }
        } catch (error) {
            emit('editError', selectedItem.value as T, error);
        }
    };

    // Close the edit modal
    const cancel = () => {
        showEditModal.value = false;
        selectedItem.value = null;
        isCreateMode.value = false;
        activeTabIndex.value = 0; // Reset tab for next time
        // Abandon any in-flight showUrl fetch so it can't seed a closed modal.
        editFetchToken++;
        editLoading.value = false;
        if (editForm.value) {
            editForm.value.clearErrors();
        }
    };

    // Delete from the edit modal
    const remove = async () => {
        if (!editForm.value || !selectedItem.value || !props.deleteUrl) return;
        // Don't evaluate the guard until the full record has loaded (showUrl) — it
        // may depend on fields the thin list row doesn't carry.
        if (editLoading.value) return;

        // Delete guard: a non-null message means this item can't be deleted — show
        // it immediately and skip the confirm and the request entirely.
        const guardMessage = props.deleteGuard?.(selectedItem.value as T);
        if (guardMessage) {
            createToast?.({
                title: 'Cannot delete',
                body: guardMessage,
                variant: 'danger',
                modelValue: 5000,
            });
            return;
        }

        // Confirm deletion
        const itemName = (selectedItem.value as any).name || (selectedItem.value as any).title || singularItemName.value;
        const confirmed = window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`);

        if (!confirmed) return;

        pendingAction.value = 'delete';
        try {
            const itemId = (selectedItem.value as any).id;
            const url = props.deleteUrl.replace(':id', itemId);

            await editForm.value.delete(url, {
                onSuccess: (data: any) => {
                    // Show success toast
                    createToast?.({
                        title: 'Success',
                        body: `${singularItemName.value} deleted successfully`,
                        variant: 'success',
                        modelValue: 3000, // Auto-dismiss after 3 seconds
                    });

                    emit('rowDeleted', selectedItem.value as T, data);
                    showEditModal.value = false;
                    selectedItem.value = null;

                    // Refresh table data to remove deleted item
                    refresh();
                },
                onError: (error: any) => {
                    // Extract error message from server response
                    const errorData = error?.response?.data ?? error?.data ?? error;
                    const errorMessage = errorData?.message ?? 'Failed to delete. Please try again.';

                    // Show error toast with server message
                    createToast?.({
                        title: 'Error',
                        body: errorMessage,
                        variant: 'danger',
                        modelValue: 5000, // Auto-dismiss after 5 seconds
                    });

                    emit('deleteError', selectedItem.value as T, error);
                }
            });
        } catch (error) {
            emit('deleteError', selectedItem.value as T, error);
        } finally {
            pendingAction.value = null;
        }
    };

    return {
        // State the modal template binds
        showEditModal,
        editForm,
        editFormInstanceKey,
        activeTabIndex,
        selectedItem,
        isCreateMode,
        pendingAction,
        editLoading,
        computedModalTitle,
        // Edit-modal slot-key computeds (which keyed slots the consumer provided)
        editValueSlotKeys,
        editSpanSlotKeys,
        tabContentSlotKeys,
        tabBeforeSlotKeys,
        tabAfterSlotKeys,
        // Actions
        openEdit,
        openCreate,
        save,
        cancel,
        remove,
    };
}
