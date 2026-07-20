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
    | "checkbox-group"
    | "switch"
    | "switch-list"
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
     * Options for `select`, `radio`, `checkbox-group`, `switch-list` and
     * `autocomplete` fields. For `autocomplete` these are the datalist
     * suggestions; the field still accepts free text not present in the list.
     * For `switch-list` each option renders a labelled toggle row
     * (`description` becomes the row label's tooltip).
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

    /**
     * For `select` fields: render a **searchable** select — type to filter a
     * long option list, while the model still holds `option.value` (an id).
     *
     * A plain `select` is fine for ten options and unusable for hundreds; the
     * `autocomplete` type filters but models the *typed text*, so it can't back
     * a foreign key (picking "Tesco" gives you `"Tesco"`, not `37`). This is the
     * combination high-frequency data entry against a long list needs.
     */
    searchable?: boolean;

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
     * For `currency` fields: the model stores integer MINOR units (pence) but
     * the input shows/edits MAJOR units (pounds) — display = value / 10^decimals,
     * submit = round(input × 10^decimals). `min`/`max`/`step` stay in major
     * units. Off by default (the model is the major-unit amount). Use for
     * legacy pence-integer columns (#116).
     */
    minorUnits?: boolean;

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
     * the model. Plain text only — for a rich popover body (lists, bold,
     * paragraphs) use the `#info-popover(<key>)` slot. Note the separate
     * `#info(<key>)` slot renders an always-visible block below the control,
     * not popover content.
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

    /**
     * For `switch` and `switch-list` fields: the on-state colour. `"success"`
     * (default) is the house green-on / red-off style for an
     * active/enabled/good switch; `"neutral"` (brand primary on / grey off) is
     * for semantically-mixed switches that shouldn't imply good/bad ("contains
     * alcohol", an allergen toggle, "hidden on web shop"). A `switch-list`
     * usually wants `"neutral"` — a wall of red-off toggles over-signals when
     * off simply means "not present". See DXSwitch `onVariant` (#158).
     */
    switchVariant?: "success" | "neutral";

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
     * Skip rendering the field's own label. In horizontal layout no label
     * column is reserved either, so the control spans the full width. Useful
     * for `switch` (and `checkbox`) fields, which render their own label
     * inside the control — the outer row label would otherwise duplicate it,
     * and the self-label then lines up with sibling row labels. Also used
     * internally by `DXRepeater`'s `table` layout, where a column header
     * already names the field.
     */
    hideLabel?: boolean;

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
     * For `repeater` fields in `cards` layout: show each row's 1-based
     * position (e.g. "1", "2") next to its Remove button. Off by default —
     * only meaningful once a consumer explicitly wants it (e.g. rows the
     * user thinks of as numbered/ordered); most repeaters don't need it.
     * Not applicable to `table` layout, which has no equivalent column.
     */
    showRowIndex?: boolean;

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
     * Display the value as static text instead of a control — no border, no
     * input box (Bootstrap's `.form-control-plaintext`). For values a
     * profile/settings page shows but never lets you edit, where a `readonly`
     * input still reads as "you could edit this, but can't".
     *
     * Implies read-only, for every field type. Anything backed by a real input
     * — the text family, textarea, currency, percentage, autocomplete — renders
     * as static text; control types with no native readonly state
     * (select/radio/checkbox/switch/file) are disabled instead, exactly as they
     * are for `readonly`.
     *
     * Enforced over `inputProps`: unlike the field's other bindings, which
     * `inputProps` may override, a plaintext field cannot be made editable
     * again through it.
     */
    plaintext?: MaybeFn<boolean>;

    /**
     * Only for `type: "password"`. Show the reveal (eye) toggle that switches
     * the input between masked and plain text. Defaults to `true` — set
     * `false` to render a bare password input.
     */
    revealable?: boolean;

    /**
     * Include this field's value in the submitted payload. Default `true`.
     *
     * Set `false` for a **presentational** field — a header, an alert, an
     * explanatory block rendered via `span` — that exists to lay out the form,
     * not to hold data. Without it, `DXTable`'s edit modal seeds its form from
     * every `editFields` key, so those decorative fields are POSTed alongside
     * the real ones (an empty string, an empty array) purely because they were
     * declared.
     */
    submit?: boolean;

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

// ───────────────────────────────────────────────────────────────────────────
// Strict, discriminated field types (#131)
//
// The permissive `FieldDefinition` above lets every option appear on every
// field type: `currencySymbol` compiles on a checkbox, `options` on a text
// input, `component` without `type: "component"`. The types below are the
// strict, `type`-keyed replacement — each variant permits only its own
// options, so the compiler catches an invalid field config at the call site.
//
// ADDITIVE for now: `FieldDefinition` stays canonical and these are opt-in
// (`import type { FieldDef } from "@omnitend/dashboard-for-laravel"`). A future
// major (#131 Phase 3) makes `FieldDef` canonical and removes the permissive
// interface with a codemod. **Until then, keep the two in step** — a prop added
// to `FieldDefinition` must be added to the matching variant(s) below. The doc
// comments live on `FieldDefinition`; variants stay terse to keep them aligned.
//
// Known limitation: the union rejects invalid FRESH object literals (excess
// property checking — the common `fields: [{ type: "checkbox", … }]` call site),
// but a PRE-DECLARED object with excess props (`const f = { type: "checkbox",
// currencySymbol: "£" }`) stays structurally assignable. Full exclusivity would
// need `never`-typed exclusion keys on every variant (or a StrictUnion helper) —
// heavy machinery with confusing errors for marginal gain on an opt-in type, so
// it's deliberately not done here.
// ───────────────────────────────────────────────────────────────────────────

/** Options common to every field variant (the non-`type`-specific props). */
export interface BaseFieldDef {
    key: string;
    label?: MaybeFn<string>;
    required?: boolean;
    help?: string;
    hint?: MaybeFn<string>;
    info?: MaybeFn<string>;
    class?: string;
    inputProps?: Record<string, any>;
    span?: boolean;
    layout?: "vertical" | "horizontal";
    labelCols?: LabelCols;
    hideLabel?: boolean;
    default?: any;
    disabled?: MaybeFn<boolean>;
    disabledWhen?: (model: any) => boolean;
    readonly?: MaybeFn<boolean>;
    plaintext?: MaybeFn<boolean>;
    submit?: boolean;
    when?: MaybeFn<boolean>;
    show?: () => boolean;
}

/** Mixins shared by several variants (not exported — internal composition). */
interface WithPlaceholder {
    placeholder?: string;
}
interface WithNumericBounds {
    step?: number | string;
    min?: number | string;
    max?: number | string;
}
interface WithSelectableOptions {
    options?: FieldOption[];
    optionsLoader?: OptionsLoader;
    reloadOptionsOnChange?: boolean;
}

/** `text` / `email` / `url` / `tel` — a plain text-like `<input>`. */
export interface TextFieldDef extends BaseFieldDef, WithPlaceholder {
    type: "text" | "email" | "url" | "tel";
}

/** `password` — text input with an optional reveal (eye) toggle. */
export interface PasswordFieldDef extends BaseFieldDef, WithPlaceholder {
    type: "password";
    revealable?: boolean;
}

/** `number` — numeric input with optional bounds. */
export interface NumberFieldDef
    extends BaseFieldDef,
        WithPlaceholder,
        WithNumericBounds {
    type: "number";
}

/** `date` / `datetime` / `datetime-local` / `time` — native date/time controls.
 *  `min`/`max`/`step` are valid on these inputs (e.g. `min="2024-01-01"`) and
 *  DXField forwards them, so the variant permits them. */
export interface DateFieldDef extends BaseFieldDef, WithNumericBounds {
    type: "date" | "datetime" | "datetime-local" | "time";
}

/** `currency` — numeric input with a symbol affix and minor-unit handling. */
export interface CurrencyFieldDef
    extends BaseFieldDef,
        WithPlaceholder,
        WithNumericBounds {
    type: "currency";
    currencySymbol?: string;
    decimals?: number;
    minorUnits?: boolean;
}

/** `percentage` — numeric input shown as a 0–100 percentage. */
export interface PercentageFieldDef
    extends BaseFieldDef,
        WithPlaceholder,
        WithNumericBounds {
    type: "percentage";
    asFraction?: boolean;
}

/** `textarea` — multi-line text input. */
export interface TextareaFieldDef extends BaseFieldDef, WithPlaceholder {
    type: "textarea";
    rows?: number;
}

/** `select` — dropdown; `searchable` upgrades it to a filterable select. */
export interface SelectFieldDef
    extends BaseFieldDef,
        WithPlaceholder,
        WithSelectableOptions {
    type: "select";
    searchable?: boolean;
}

/** `autocomplete` — free-text input with datalist suggestions. */
export interface AutocompleteFieldDef
    extends BaseFieldDef,
        WithPlaceholder,
        WithSelectableOptions {
    type: "autocomplete";
}

/** `checkbox` — a single boolean checkbox. */
export interface CheckboxFieldDef extends BaseFieldDef {
    type: "checkbox";
}

/** `checkbox-group` — multiple checkboxes; model is an array of values. */
export interface CheckboxGroupFieldDef extends BaseFieldDef {
    type: "checkbox-group";
    options?: FieldOption[];
}

/** `switch` — a toggle with contextual on/off text and on-state colour. */
export interface SwitchFieldDef extends BaseFieldDef {
    type: "switch";
    textWhenTrue?: MaybeFn<string>;
    textWhenFalse?: MaybeFn<string>;
    switchVariant?: "success" | "neutral";
}

/** `switch-list` — a labelled toggle row per option; model is an array. */
export interface SwitchListFieldDef extends BaseFieldDef {
    type: "switch-list";
    options?: FieldOption[];
    switchVariant?: "success" | "neutral";
}

/** `radio` — a radio group. */
export interface RadioFieldDef extends BaseFieldDef, WithSelectableOptions {
    type: "radio";
}

/** `image` / `file` — file input (`image` also shows a preview). */
export interface FileFieldDef extends BaseFieldDef {
    type: "image" | "file";
    accept?: string;
}

/** `component` — escape hatch rendering `field.component`. */
export interface ComponentFieldDef extends BaseFieldDef {
    type: "component";
    /** Required on the strict variant: a `component` field with no component
     *  falls through to the generic input branch, so the union enforces it. */
    component: Component;
}

/** `repeater` — a nested, repeatable sub-form driven by `fields`. */
export interface RepeaterFieldDef extends BaseFieldDef {
    type: "repeater";
    fields?: FieldDef[];
    addLabel?: string;
    minItems?: number;
    maxItems?: number;
    repeaterLayout?: "cards" | "table";
    showRowIndex?: boolean;
    softDeleteKey?: string;
}

/**
 * Strict, discriminated replacement for `FieldDefinition`. Keyed on `type`,
 * so each field only permits its own options. Opt-in today; canonical in a
 * future major (#131). See the banner above.
 */
export type FieldDef =
    | TextFieldDef
    | PasswordFieldDef
    | NumberFieldDef
    | DateFieldDef
    | CurrencyFieldDef
    | PercentageFieldDef
    | TextareaFieldDef
    | SelectFieldDef
    | AutocompleteFieldDef
    | CheckboxFieldDef
    | CheckboxGroupFieldDef
    | SwitchFieldDef
    | SwitchListFieldDef
    | RadioFieldDef
    | FileFieldDef
    | ComponentFieldDef
    | RepeaterFieldDef;

/**
 * Compile-time drift guard (#131): every strict variant must remain assignable
 * to the permissive `FieldDefinition`. If a `FieldDef` variant grows a prop that
 * `FieldDefinition` doesn't have (or types incompatibly), this fails to satisfy
 * its `true` constraint and the build goes red. Purely type-level — no runtime.
 * (The reverse direction — a prop added to `FieldDefinition` but forgotten on a
 * variant — can't be asserted this way; the banner above is the reminder.)
 */
type _AssertTrue<T extends true> = T;
// Exported (under an internal underscore name, not re-exported by the barrel)
// only so `noUnusedLocals` treats it as used — its value is the constraint check.
export type _FieldDefStaysASubset = _AssertTrue<
    FieldDef extends FieldDefinition ? true : false
>;

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
