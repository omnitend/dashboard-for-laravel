import type { Component } from "vue";

/**
 * Field types supported by DXForm (and DXField, its per-field renderer).
 *
 * Text-like types render an `<input>`; the remainder render purpose-built
 * controls:
 * - `currency` / `percentage` — numeric input wrapped in an input-group
 *   with a symbol affix.
 * - `datetime` — alias for the native `datetime-local` control.
 * - `image` / `file` — file input (`image` additionally shows a preview).
 * - `component` — escape hatch that renders `field.component`.
 * - `repeater` — nested, repeatable sub-form driven by `field.fields`.
 * - `switch` — a toggle checkbox with contextual on/off text and an
 *   on-state (filled) style; see `textWhenTrue` / `textWhenFalse`.
 */
export type FieldType =
    | "text"
    | "email"
    | "password"
    | "number"
    | "url"
    | "tel"
    | "date"
    | "datetime-local"
    | "datetime"
    | "time"
    | "currency"
    | "percentage"
    | "textarea"
    | "select"
    | "autocomplete"
    | "checkbox"
    | "switch"
    | "radio"
    | "image"
    | "file"
    | "component"
    | "repeater";

/**
 * A value that may be supplied directly or computed from the live form
 * model. Predicates receive the current model so fields can react to
 * other fields (cross-field reactivity).
 */
export type MaybeFn<TValue> = TValue | ((model: any) => TValue);

/**
 * Option for select or radio fields
 */
export interface FieldOption extends Record<string, unknown> {
    value: any;
    text: string;
    disabled?: boolean;
}

/**
 * Asynchronously resolves the options for a select/radio field from the
 * current model (e.g. fetch a dependent list). Resolved on mount, and
 * again on model change when `reloadOptionsOnChange` is set.
 */
export type OptionsLoader = (model: any) => Promise<FieldOption[]>;

/**
 * Label column width for horizontal layout, mirroring Bootstrap Vue Next's
 * `BFormGroup` `labelCols`/`labelCols*` props: either a single width applied
 * at all breakpoints, or a per-breakpoint object (omitted breakpoints fall
 * back to BFormGroup's own defaults, which is how "collapse to vertical
 * below a breakpoint" comes for free — e.g. `{ md: 3 }` stacks below `md`).
 *
 * Deliberately excludes `boolean` (which BFormGroup's own `labelCols` prop
 * accepts): Vue's type-based `defineProps` auto-defaults an omitted prop to
 * `false` (not `undefined`) whenever its declared type includes `boolean`,
 * which would silently break the `field.labelCols ?? formLabelCols ?? 3`
 * fallback chain used to resolve this value.
 */
export type LabelCols =
    | number
    | { sm?: number; md?: number; lg?: number; xl?: number };

/**
 * Field definition shared by every form renderer.
 *
 * DXForm and DXTable's edit modal honour `hint`, `span`, `when`,
 * `readonly`, `disabledWhen`, function-valued `label`/`hint`, async
 * options, the `component` escape hatch and nested `repeater` fields.
 */
export interface FieldDefinition {
    /** Field key (must match form data key) */
    key: string;

    /** Field type */
    type: FieldType;

    /** Field label — string or a function of the form model */
    label?: MaybeFn<string>;

    /** Placeholder text (optional) */
    placeholder?: string;

    /** Whether field is required (optional) */
    required?: boolean;

    /**
     * Options for `select`, `radio` and `autocomplete` fields. For
     * `autocomplete` these are the datalist suggestions; the field still
     * accepts free text not present in the list.
     */
    options?: FieldOption[];

    /**
     * Asynchronously load options for `select`, `radio` and `autocomplete`
     * fields (e.g. fetch a suggestion list). Takes precedence over `options`
     * once resolved.
     */
    optionsLoader?: OptionsLoader;

    /** Re-run `optionsLoader` whenever the form model changes. */
    reloadOptionsOnChange?: boolean;

    /** Number of rows for textarea (default: 3) */
    rows?: number;

    /** Step for numeric/currency/percentage inputs */
    step?: number | string;

    /** Min/max for numeric inputs */
    min?: number | string;
    max?: number | string;

    /** Symbol shown for `currency` fields (default: the locale's, "£"). */
    currencySymbol?: string;

    /**
     * For `currency` fields: minor-unit decimal places the *display* value is
     * formatted to on blur and on initial seed (default: 2, e.g. GBP/EUR/USD —
     * pass 0 for a currency with no minor unit, e.g. JPY). The model stays a
     * plain number throughout; only the input's shown text is padded (`3.8` →
     * `3.80`). Typing is never reformatted mid-edit.
     */
    decimals?: number;

    /**
     * For `percentage` fields: treat the underlying model value as a 0–1
     * fraction while showing/editing it as a 0–100 percentage. The model keeps
     * the fraction (e.g. `0.2`), the input shows `20`. Off by default (the value
     * is taken as a whole percentage). Use for fields stored as ratios (VAT
     * rates, discounts, …).
     */
    asFraction?: boolean;

    /** `accept` attribute for `image`/`file` inputs (e.g. "image/*"). */
    accept?: string;

    /** Help text displayed below the field (always visible). */
    help?: string;

    /**
     * Hint text displayed below the field. Unlike `help`, may be a
     * function of the model for dynamic hints.
     */
    hint?: MaybeFn<string>;

    /**
     * Longer help text revealed in a popover from a small info affordance
     * on the field's label (on hover/focus). Complements `hint` (which is
     * always-visible muted text below the control). May be a function of
     * the model. For rich content, use the `#info` slot instead.
     */
    info?: MaybeFn<string>;

    /**
     * For `switch` fields: contextual label shown when the toggle is on.
     * Falls back to `label` when omitted. May be a function of the model.
     */
    textWhenTrue?: MaybeFn<string>;

    /**
     * For `switch` fields: contextual label shown when the toggle is off.
     * Falls back to `label` when omitted. May be a function of the model.
     */
    textWhenFalse?: MaybeFn<string>;

    /** CSS class for the form group */
    class?: string;

    /** Additional props to pass to the input component */
    inputProps?: Record<string, any>;

    /**
     * Render the field full-width with no label wrapper, delegating its
     * content to the `#span(<key>)` slot. Useful for custom blocks. Also
     * doubles as the "fill both columns" escape hatch in horizontal layout —
     * a span field always bypasses the label/content column split.
     */
    span?: boolean;

    /**
     * Per-field override of DXForm's `layout` prop ("vertical" | "horizontal").
     * Falls back to the form-level `layout` when omitted.
     */
    layout?: "vertical" | "horizontal";

    /**
     * Per-field override of DXForm's `labelCols` prop, for horizontal
     * layout. Falls back to the form-level `labelCols` when omitted.
     */
    labelCols?: LabelCols;

    /**
     * Component rendered for `type: "component"` fields. Receives
     * `modelValue`, `field`, `model` props and emits `update:modelValue`.
     */
    component?: Component;

    /** Sub-field definitions for `type: "repeater"` fields. */
    fields?: FieldDefinition[];

    /**
     * Default/initial value. Used by `defineForm` to seed form data and by
     * repeaters to seed a freshly-added row's sub-fields. (`defineForm`'s
     * `FormFieldDefinition` re-declares this as required for inference.)
     */
    default?: any;

    /** Label for a repeater's "add row" button (default: "Add"). */
    addLabel?: string;

    /** Minimum / maximum number of repeater rows. */
    minItems?: number;
    maxItems?: number;

    /**
     * For `repeater` fields: `"cards"` (default) stacks each row as its own
     * card with sub-fields listed vertically — best for rows with several
     * or complex sub-fields. `"table"` renders one row per item with
     * sub-fields as columns — far more compact for simple child-row lists
     * (e.g. 2-3 short sub-fields). Named `repeaterLayout` (not `layout`) to
     * avoid colliding with the unrelated form-level `layout` prop
     * ("vertical" | "horizontal") every field type accepts.
     */
    repeaterLayout?: "cards" | "table";

    /**
     * For `repeater` fields backed by an upsert-children API contract (rows
     * carrying a persisted `id` are only deleted server-side when submitted
     * flagged, e.g. Laravel's `{ id, to_delete: true }` pattern): the
     * sub-field key to set `true` when a row is removed, instead of splicing
     * it out of the array. Only applies to rows that already have an `id`
     * (freshly added, never-persisted rows are still spliced normally since
     * the server has never seen them). Flagged rows remain in `form.data`
     * (so they're submitted) but are hidden from the UI and excluded from
     * `minItems`/`maxItems` counts.
     */
    softDeleteKey?: string;

    /** Disable the field (static or computed from the model). */
    disabled?: MaybeFn<boolean>;

    /**
     * Disable the field based on the model. Retained for backwards
     * compatibility with DXTable; prefer `disabled` with a function.
     */
    disabledWhen?: (model: any) => boolean;

    /**
     * Render the field read-only (static or computed). For controls
     * without a native readonly state (select/checkbox/radio) this is
     * applied as `disabled`.
     */
    readonly?: MaybeFn<boolean>;

    /**
     * Conditionally show or hide this field. When omitted the field is
     * always visible. Boolean or a function of the form model; evaluated
     * reactively for cross-field conditional fields.
     */
    when?: MaybeFn<boolean>;

    /**
     * Legacy no-argument visibility predicate. Retained for backwards
     * compatibility; prefer `when`. When both are present, a field is
     * visible only if both pass.
     */
    show?: () => boolean;
}

/**
 * A tab in a tabbed form. Groups a subset of fields and can be shown
 * conditionally or lazily mounted.
 */
export interface FormTab {
    /** Unique key for this tab */
    key: string;

    /**
     * Display label (optional, defaults to the key). May be a function of the
     * form model — the live form data merged with any `context` (e.g. the row
     * DXTable is editing) — so a tab title can reflect the record, such as
     * `label: (model) => \`Products (${model.products_count ?? 0})\``.
     */
    label?: MaybeFn<string>;

    /** Field keys (from the form's fields) to render in this tab */
    fieldKeys: string[];

    /** Conditional display — boolean or a function of the form model */
    when?: MaybeFn<boolean>;

    /** Lazily mount tab content until first activated */
    lazy?: boolean;
}
