/**
 * Field types supported by OForm
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
    | "time"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio";

/**
 * Option for select or radio fields
 */
export interface FieldOption extends Record<string, unknown> {
    value: any;
    text: string;
    disabled?: boolean;
}

/**
 * Field definition for OForm
 */
export interface FieldDefinition {
    /** Field key (must match form data key) */
    key: string;

    /** Field type */
    type: FieldType;

    /** Field label (optional) */
    label?: string;

    /** Placeholder text (optional) */
    placeholder?: string;

    /** Whether field is required (optional) */
    required?: boolean;

    /** Options for select or radio fields */
    options?: FieldOption[];

    /** Number of rows for textarea (default: 3) */
    rows?: number;

    /** Help text displayed below field */
    help?: string;

    /** CSS class for the form group */
    class?: string;

    /** Additional props to pass to the input component */
    inputProps?: Record<string, any>;
}
