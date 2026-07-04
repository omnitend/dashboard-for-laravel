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

    /** Options for select or radio fields */
    options?: FieldOption[];

    /**
     * Asynchronously load options for select/radio fields. Takes
     * precedence over `options` once resolved.
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
     * content to the `#span(<key>)` slot. Useful for custom blocks.
     */
    span?: boolean;

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

    /** Display label (optional, defaults to the key) */
    label?: string;

    /** Field keys (from the form's fields) to render in this tab */
    fieldKeys: string[];

    /** Conditional display — boolean or a function of the form model */
    when?: MaybeFn<boolean>;

    /** Lazily mount tab content until first activated */
    lazy?: boolean;
}
