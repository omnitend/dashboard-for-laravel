/**
 * Which field a validation-error key belongs to (#194).
 *
 * One pure function decides, so the error summary's rows, the tab a failed
 * submit selects and the field it scrolls to can never disagree. No Vue: the
 * caller injects visibility and label resolution, so DXForm can pass its own
 * `when`/`context`-aware predicates and a standalone summary can use the
 * defaults below.
 */
import type { FieldDefinition, FormTab } from "../types";
import type { ValidationErrors } from "../composables/useForm";
import {
    isFieldVisible as isFieldVisibleFor,
    resolvePredicate,
} from "./formSchema";
import { getByPath } from "./objectPath";

/** One error key and where it belongs. */
export interface ErrorTarget {
    /** The key as the server sent it (`lines.0.price`). */
    errorKey: string;
    /** The server's messages for that key, as sent. */
    messages: string[];
    /**
     * One display line per message: the message itself, or `"Label: message"`
     * when the message does not already say which field it is about (see
     * `resolveErrorTargets`).
     */
    lines: string[];
    /** The owning field's key, or `null` when no visible field owns it. */
    fieldKey: string | null;
    /** The tab holding the owning field, or `null` (flat form, or unowned). */
    tabKey: string | null;
    /** A readable name for the key: "Price (line 1)", "Delivery date". */
    label: string;
}

export interface ResolveErrorTargetsOptions {
    /** The form's field definitions. */
    fields?: FieldDefinition[];
    /**
     * The form's tabs. When given (non-empty), only fields listed in a
     * visible tab can own an error, as only those render. A tab key with no
     * field definition (consumer-rendered content) can still own its own key
     * and keys nested under it.
     */
    tabs?: FormTab[];
    /** Model for the default predicates and labels (form data + context). */
    model?: Record<string, any>;
    /** Field visibility. Default: `when` and `show` against `model`. */
    isFieldVisible?: (field: FieldDefinition) => boolean;
    /** Tab visibility. Default: the tab's `when` against `model`. */
    isTabVisible?: (tab: FormTab) => boolean;
    /**
     * A field's label. Default: its `label`, called with `labelModel` when it
     * is a function. `labelModel` is `model` for a form field and the ROW
     * (`model.lines[0]`) for a repeater sub-field, as DXRepeater renders it.
     * An empty result, or a label function that throws, falls back to the
     * humanised key, so a broken label can never hide an error.
     */
    resolveLabel?: (
        field: FieldDefinition,
        labelModel: Record<string, any>,
    ) => string | null | undefined;
}

interface Candidate {
    field: FieldDefinition;
    tabKey: string | null;
    /** Position for ordering: [tab index, position within the tab / form]. */
    rank: [number, number];
}

/** Sorts after every owned key. */
const UNOWNED_RANK = Number.MAX_SAFE_INTEGER;

const NUMERIC_SEGMENT = /^\d+$/;

/**
 * A message that names a raw key (`delivery_date`, `lines.0.price`) is not
 * readable on its own, so it keeps its label prefix. A sentence-ending full
 * stop or a decimal (`5.5`) is not a key.
 */
const RAW_KEY_IN_MESSAGE = /\w_\w|[A-Za-z0-9]\.[A-Za-z]|[A-Za-z]\.[0-9]/;

/** `delivery_date` → "Delivery date"; `lines.0.price` → "Lines price (line 1)". */
export function humaniseErrorKey(key: string): string {
    const words: string[] = [];
    const lineNumbers: number[] = [];
    for (const segment of key.split(".")) {
        if (NUMERIC_SEGMENT.test(segment)) {
            lineNumbers.push(Number(segment) + 1);
        } else {
            const spaced = segment
                .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
                .replace(/[_\-\s]+/g, " ")
                .trim();
            if (spaced !== "") words.push(spaced.toLowerCase());
        }
    }
    let label = words.join(" ");
    label = label.charAt(0).toUpperCase() + label.slice(1);
    if (lineNumbers.length > 0) {
        label = `${label} (line ${lineNumbers.join(", ")})`.trim();
    }
    return label === "" ? key : label;
}

/** `*` matches exactly one dot segment; everything else matches literally. */
function patternMatches(pattern: string, errorKey: string): boolean {
    const patternSegments = pattern.split(".");
    const keySegments = errorKey.split(".");
    if (patternSegments.length !== keySegments.length) return false;
    return patternSegments.every(
        (segment, index) => segment === "*" || segment === keySegments[index],
    );
}

function isNestedUnder(errorKey: string, fieldKey: string): boolean {
    return errorKey.startsWith(`${fieldKey}.`);
}

function defaultLabel(
    field: FieldDefinition,
    model: Record<string, any>,
): string | null | undefined {
    return typeof field.label === "function" ? field.label(model) : field.label;
}

/**
 * Resolve every key in `errors` to its owning field, tab and label, with the
 * display line for each message. Rows come in tab order, then field order
 * (the order of `tab.fieldKeys`, or of `fields` in a flat form), then the
 * order the server sent the keys; keys no visible field owns come last.
 *
 * Ownership, first match wins: a field whose `errorKeys` pattern matches; a
 * field whose key equals the error key; the field with the longest key that
 * is a dot prefix of it (repeater rows, media maps). Hidden fields, and
 * fields on hidden tabs or on no tab of a tabbed form, never own a key; it
 * falls through to the next rule, or is unowned.
 *
 * Labels: the owning field's label; for `field.N.sub` the sub-field's label
 * (when the field defines `fields` and one has that key) or the field's own,
 * plus "(line N+1)"; for any other nested key (a media map's
 * `image_media.<uuid>`) the field's label. An unowned key is humanised.
 *
 * Display lines: "Label: message", except that the label is left off when
 * the message already contains it (case-insensitive) — unless the message
 * contains a raw key (`_`, or a dot inside a word) or another row has the
 * same message text, when the label is what tells the rows apart.
 */
export function resolveErrorTargets(
    errors: ValidationErrors | null | undefined,
    options: ResolveErrorTargetsOptions = {},
): ErrorTarget[] {
    const fields = options.fields ?? [];
    const model = options.model ?? {};
    const isFieldVisible =
        options.isFieldVisible ??
        ((field: FieldDefinition) => isFieldVisibleFor(field, model));
    const isTabVisible =
        options.isTabVisible ??
        ((tab: FormTab) => resolvePredicate(tab.when, model, true));
    const resolveLabel = options.resolveLabel ?? defaultLabel;

    const labelFor = (
        field: FieldDefinition,
        labelModel: Record<string, any> = model,
    ): string => {
        let label: string | null | undefined;
        try {
            label = resolveLabel(field, labelModel);
        } catch {
            // A consumer's label function threw (a row missing a property
            // it reads): the error must still be listed, under its key.
            label = undefined;
        }
        return typeof label === "string" && label.trim() !== ""
            ? label
            : humaniseErrorKey(field.key);
    };

    // ——— which fields can own an error, in display order
    const candidates: Candidate[] = [];
    const tabs = options.tabs ?? [];
    if (tabs.length > 0) {
        const fieldByKey = new Map(fields.map((field) => [field.key, field]));
        const placed = new Set<string>();
        tabs.forEach((tab, tabIndex) => {
            if (!isTabVisible(tab)) return;
            tab.fieldKeys.forEach((key, position) => {
                if (placed.has(key)) return;
                const field = fieldByKey.get(key);
                // A key with no definition is consumer-rendered content: the
                // tab decides whether it shows.
                if (field && !isFieldVisible(field)) return;
                placed.add(key);
                candidates.push({
                    field: field ?? ({ key, type: "text" } as FieldDefinition),
                    tabKey: tab.key,
                    rank: [tabIndex, position],
                });
            });
        });
    } else {
        fields.forEach((field, index) => {
            if (!isFieldVisible(field)) return;
            candidates.push({ field, tabKey: null, rank: [0, index] });
        });
    }

    const ownerOf = (errorKey: string): Candidate | null => {
        const byPattern = candidates.find((candidate) =>
            (candidate.field.errorKeys ?? []).some((pattern) =>
                patternMatches(pattern, errorKey),
            ),
        );
        if (byPattern) return byPattern;
        const exact = candidates.find(
            (candidate) => candidate.field.key === errorKey,
        );
        if (exact) return exact;
        let longest: Candidate | null = null;
        for (const candidate of candidates) {
            if (
                isNestedUnder(errorKey, candidate.field.key) &&
                (!longest || candidate.field.key.length > longest.field.key.length)
            ) {
                longest = candidate;
            }
        }
        return longest;
    };

    const ownedLabel = (errorKey: string, field: FieldDefinition): string => {
        if (!isNestedUnder(errorKey, field.key)) return labelFor(field);
        const [first, second] = errorKey.slice(field.key.length + 1).split(".");
        if (!NUMERIC_SEGMENT.test(first)) return labelFor(field);
        const subField =
            second !== undefined
                ? field.fields?.find((candidate) => candidate.key === second)
                : undefined;
        // DXRepeater renders a sub-field with the ROW as its model, so its
        // label resolves against the row here too.
        const row = getByPath(model, `${field.key}.${first}`);
        const rowModel = row !== null && typeof row === "object" ? row : {};
        const base = subField ? labelFor(subField, rowModel) : labelFor(field);
        return `${base} (line ${Number(first) + 1})`;
    };

    // ——— one target per error key with at least one message
    interface Pending {
        target: Omit<ErrorTarget, "lines">;
        rank: [number, number];
        order: number;
    }
    const pending: Pending[] = [];
    Object.entries(errors ?? {}).forEach(([errorKey, value], order) => {
        const messages = (Array.isArray(value) ? value : [value]).filter(
            (message): message is string =>
                typeof message === "string" && message !== "",
        );
        if (messages.length === 0) return;
        const owner = ownerOf(errorKey);
        pending.push({
            target: {
                errorKey,
                messages,
                fieldKey: owner ? owner.field.key : null,
                tabKey: owner ? owner.tabKey : null,
                label: owner
                    ? ownedLabel(errorKey, owner.field)
                    : humaniseErrorKey(errorKey),
            },
            rank: owner ? owner.rank : [UNOWNED_RANK, UNOWNED_RANK],
            order,
        });
    });

    pending.sort(
        (left, right) =>
            left.rank[0] - right.rank[0] ||
            left.rank[1] - right.rank[1] ||
            left.order - right.order,
    );

    // ——— display lines, with the label prefix where it is needed
    const messageCounts = new Map<string, number>();
    for (const { target } of pending) {
        for (const message of target.messages) {
            messageCounts.set(message, (messageCounts.get(message) ?? 0) + 1);
        }
    }
    const needsLabel = (message: string, label: string): boolean =>
        (messageCounts.get(message) ?? 0) > 1 ||
        RAW_KEY_IN_MESSAGE.test(message) ||
        !message.toLowerCase().includes(label.toLowerCase());

    return pending.map(({ target }) => ({
        ...target,
        lines: target.messages.map((message) =>
            needsLabel(message, target.label)
                ? `${target.label}: ${message}`
                : message,
        ),
    }));
}
