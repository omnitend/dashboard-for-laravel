import { useForm, type UseFormReturn } from "./useForm";
import type { FieldDefinition } from "../types";
import { resolveFieldDefault } from "../utils/formSchema";

/**
 * Extended field definition that includes default value
 */
export interface FormFieldDefinition<TValue = any> extends FieldDefinition {
    /**
     * Default/initial value for the field. Optional: when omitted, the field
     * seeds from its type (`false` for checkbox/switch, `[]` for
     * checkbox-group/switch-list/repeater, `0` for numerics, `""` otherwise) —
     * previously the type required this even though the runtime had a
     * fallback, so typed consumers could never use it.
     */
    default?: TValue;
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

    // Extract initial data from field definitions. Seeding (definedness over
    // nullishness so a `null` default survives — #122/#125 — plus a type-aware
    // fallback and deep-cloning) is the shared `resolveFieldDefault` rule, so
    // every seeding site (defineForm / useResourceEditor / DXRepeater) agrees
    // by construction (#134).
    const initialData = fieldDefinitions.reduce(
        (acc, field) => {
            acc[field.key] = resolveFieldDefault(field);
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
