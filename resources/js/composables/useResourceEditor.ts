import { computed, ref, watch, type Ref } from "vue";
import { api } from "../utils/api";
import { useForm } from "./useForm";
import { useToast } from "./useToast";
import type { FieldDefinition } from "../types";
import {
    resolveFieldDefault,
    isFieldVisible as isFieldVisibleFor,
    isSubmittableField,
} from "../utils/formSchema";

/**
 * The subset of `DXTable`'s props the resource editor reads. Declared
 * structurally (not imported from DXTable.vue) so the composable stays a
 * lower-level dependency — DXTable imports the composable, not the reverse.
 * DXTable's full `Props` is structurally assignable to this.
 */
export interface ResourceEditorProps<T = any> {
    /** Field definitions for the edit/create modal (enables edit-on-row-click). */
    editFields?: FieldDefinition[];
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
    /** Guard run before delete — a message short-circuits with a toast. Awaited. */
    deleteGuard?: (
        item: T,
    ) => string | null | undefined | Promise<string | null | undefined>;
    /** Guard run before save — a message aborts with a toast. Awaited. */
    saveGuard?: (
        item: T | null,
        data: Record<string, any>,
    ) => string | null | undefined | Promise<string | null | undefined>;
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

    // Bumped every time the modal closes. An action that AWAITS something —
    // a save or delete guard — re-reads this before committing, so work begun
    // in one modal session can never land after that session has ended (#174).
    //
    // A counter rather than a boolean because the modal reopens: by the time a
    // slow guard resolves the user may already be editing a different row, and
    // "is it open?" answers yes for the WRONG record. The generation only
    // matches if this is still the same session that started the action.
    //
    // Watched rather than folded into `cancel()` because `cancel()` is not the
    // only way out: the Cancel button and the slot's `close` binding route
    // through it, but the header X, Escape and a backdrop click reach BModal
    // directly and merely flip `show`. Watching the flag itself catches every
    // route, including any added later. `flush: 'sync'` so the bump lands in
    // the same tick as the dismissal, leaving no window of its own.
    const editGeneration = ref(0);
    watch(
        showEditModal,
        (isOpen) => {
            if (!isOpen) editGeneration.value++;
        },
        { flush: 'sync' },
    );

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
     * Seeding an EDIT form from a row (#117): use the row's own value when it
     * HAS the key (presence, not nullishness — an explicitly-null column must
     * not be overwritten by the field's default), else the field's own default.
     * The default comes from the shared `resolveFieldDefault` rule, so create
     * and edit seeding agree with defineForm/DXRepeater (#134) — this path is
     * now type-aware (an array field falls back to `[]`, not `''`).
     */
    const seedValueFor = (field: any, row: T): any => {
        if (Object.prototype.hasOwnProperty.call(row as any, field.key)) {
            return (row as any)[field.key];
        }
        return resolveFieldDefault(field);
    };

    /*
     * The model field/tab predicates evaluate against: the edited row widened
     * with the live form data (context + data), same as DXForm's `model`.
     */
    const editPredicateModel = computed(() => ({
        ...((selectedItem.value as any) ?? {}),
        ...(editForm.value?.data ?? {}),
    }));

    // Visibility by the one shared rule (`when` + legacy `show`), against the
    // edit model — see formSchema.isFieldVisible (#134).
    const isEditFieldVisible = (field: any): boolean =>
        isFieldVisibleFor(field, editPredicateModel.value);

    // Fields whose value actually belongs in the payload. A presentational field
    // (submit: false) renders but holds no data — see FieldDefinition.submit.
    const submittableEditFields = computed(() =>
        (props.editFields ?? []).filter(isSubmittableField),
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
                            !isSubmittableField(field) ||
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
            const response = await api.get<any>(url);
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
                error?.message ?? 'Failed to load the full record.';
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
                formData[field.key] = resolveFieldDefault(field);
            });
            editForm.value = useForm(formData);
        } else {
            // Reset existing form to defaults
            submittableEditFields.value.forEach(field => {
                editForm.value.data[field.key] = resolveFieldDefault(field);
            });
            editForm.value.clearErrors();
        }
        editFormInstanceKey.value++;
        showEditModal.value = true;
    };

    // Save from the edit modal (create or edit).
    const save = async () => {
        if (!editForm.value) return;

        // Don't save — or evaluate the guard — until the full record has loaded
        // (showUrl). The thin list row is missing fields the form and the guard
        // may both depend on, so a guard keyed on one of them would see
        // `undefined` and wave the save through, which is the silent success the
        // guard exists to prevent. Same rule as `remove`.
        if (editLoading.value) return;

        // Not re-entrant. The footer button disables itself while
        // `pendingAction` is set, but DXForm's own submit (Enter in a field)
        // reaches here directly — and with an AWAITED save guard there is now a
        // real window in which a second Save would fire a second request.
        if (pendingAction.value) return;

        pendingAction.value = 'save';
        const generation = editGeneration.value;
        try {
            if (!(await passesSaveGuard())) return;

            // Dismissed while the guard was pending. Saving now would write a
            // record the user watched themselves close — the same silent
            // outliving-of-intent the guard exists to prevent, reached by a
            // different route (#174). The check sits HERE rather than inside
            // performSave so it covers the whole class, not one call site.
            if (editGeneration.value !== generation) return;

            await performSave();
        } finally {
            pendingAction.value = null;
        }
    };

    /*
     * BOTH guards run through here, which is the point of it: they must not
     * diverge. Each is AWAITED. The case `saveGuard` exists for is a control
     * that has not finished yet — an image upload still in flight when Save is
     * clicked. The form would submit the previous media map, the request would
     * SUCCEED, the toast would say saved and the modal would close: the image
     * lost with no error anywhere, because every individual step worked.
     * `deleteGuard` is awaited on the same path so an `async` guard does what
     * its author expects — unawaited, its promise is merely truthy, which would
     * block every delete with an unreadable message.
     *
     * Returns true to proceed. Aborting leaves the modal open and the form
     * untouched — the user's edits are the thing being protected, so nothing is
     * closed or reset on the way out. A guard that THROWS also aborts: a guard
     * that could not decide is not permission to proceed.
     */
    const passesGuard = async (
        run: () => string | null | undefined | Promise<string | null | undefined>,
        title: string,
        fallbackMessage: string,
    ): Promise<boolean> => {
        let message: string | null | undefined;
        try {
            message = await run();
        } catch (error: any) {
            message = error?.message ?? fallbackMessage;
        }
        if (!message) return true;

        createToast?.({
            title,
            body: message,
            variant: 'danger',
            modelValue: 5000,
        });
        return false;
    };

    const passesSaveGuard = (): Promise<boolean> => {
        const guard = props.saveGuard;
        if (!guard) return Promise.resolve(true);

        return passesGuard(
            () =>
                guard(
                    isCreateMode.value ? null : (selectedItem.value as T | null),
                    editForm.value.data,
                ),
            'Cannot save',
            'Could not save. Please try again.',
        );
    };

    const passesDeleteGuard = (): Promise<boolean> => {
        const guard = props.deleteGuard;
        if (!guard) return Promise.resolve(true);

        return passesGuard(
            () => guard(selectedItem.value as T),
            'Cannot delete',
            'Could not delete. Please try again.',
        );
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

        // Not re-entrant, for the same reason as `save`: the guard is awaited,
        // so a second Delete arriving by a path that doesn't disable the button
        // would run the guard — and the confirm — a second time.
        if (pendingAction.value) return;

        pendingAction.value = 'delete';
        const generation = editGeneration.value;
        try {
            // Delete guard: a non-null message means this item can't be deleted —
            // show it immediately and skip the confirm and the request entirely.
            if (!(await passesDeleteGuard())) return;

            // Confirm deletion
            const itemName = (selectedItem.value as any).name || (selectedItem.value as any).title || singularItemName.value;
            const confirmed = window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`);

            if (!confirmed) return;

            // Same window as `save`, opened by awaiting the guard: the modal can
            // be dismissed underneath a pending delete (#174). Checked after the
            // confirm as well as the guard, though `window.confirm` blocks the
            // event loop, so nothing can slip in during it.
            if (editGeneration.value !== generation) return;

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
        // Actions
        openEdit,
        openCreate,
        save,
        cancel,
        remove,
    };
}
