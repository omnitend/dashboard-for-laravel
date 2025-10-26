import { useForm, type UseFormReturn } from "./useForm";
import type { FieldDefinition, FieldType } from "../types";

/**
 * Extended field definition that includes default value
 */
export interface FormFieldDefinition<TValue = any> extends FieldDefinition {
    /** Default/initial value for the field */
    default: TValue;
}

/**
 * Infer data type from field definitions
 */
type InferFormData<TFields extends readonly FormFieldDefinition[]> = {
    [K in TFields[number] as K["key"]]: K["default"];
};

/**
 * Return type for defineForm
 */
export interface DefineFormReturn<TData extends Record<string, any>> {
    form: UseFormReturn<TData>;
    fields: FieldDefinition[];
}

/**
 * Helper to get default value for a field type
 */
function getDefaultValueForType(type: FieldType): any {
    switch (type) {
        case "checkbox":
            return false;
        case "number":
            return 0;
        case "select":
        case "radio":
            return "";
        default:
            return "";
    }
}

/**
 * Define a form with type-safe field definitions.
 * Reduces duplication by inferring initial values from field definitions.
 *
 * @example
 * const { form, fields } = defineForm([
 *   { key: "email", type: "email", label: "Email", default: "", required: true },
 *   { key: "password", type: "password", label: "Password", default: "", required: true },
 *   { key: "remember", type: "checkbox", label: "Remember me", default: false },
 * ] as const);
 */
export function defineForm<const TFields extends readonly FormFieldDefinition[]>(
    fieldDefinitions: TFields,
): DefineFormReturn<InferFormData<TFields>> {
    type FormData = InferFormData<TFields>;

    // Extract initial data from field definitions
    const initialData = fieldDefinitions.reduce(
        (acc, field) => {
            acc[field.key] = field.default ?? getDefaultValueForType(field.type);
            return acc;
        },
        {} as Record<string, any>,
    ) as FormData;

    // Create form instance
    const form = useForm<FormData>(initialData);

    // Strip 'default' property from fields for OForm compatibility
    const fields: FieldDefinition[] = fieldDefinitions.map(
        ({ default: _default, ...field }) => field,
    );

    return { form, fields };
}
