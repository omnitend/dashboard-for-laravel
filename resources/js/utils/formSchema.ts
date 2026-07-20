/**
 * Pure form-schema semantics — defaulting, cloning, predicate resolution,
 * visibility, and submission-eligibility — extracted so the rule is defined
 * ONCE and tested once (#134).
 *
 * These lived, drifted, in three-plus places: `defineForm`, `useResourceEditor`,
 * `DXForm`, and `DXRepeater` each re-implemented seeding/visibility and were
 * "kept in step" by hand — the exact shape of bug behind #117/#122/#125. Each
 * copy had drifted: `DXRepeater`'s type map was missing the array-valued
 * `checkbox-group`/`switch-list` cases, and `useResourceEditor` wasn't
 * type-aware at all (a flat `""` fallback). Consolidating here fixes that drift.
 *
 * Everything is a plain function of its inputs (no Vue reactivity), so it unit
 * tests directly.
 */
import { toRaw } from "vue";
import type { FieldType, MaybeFn } from "../types";

/**
 * The canonical starting value for a field TYPE, used when a field declares no
 * explicit `default`. Superset of the previous copies:
 * - `checkbox` / `switch` → `false`
 * - `number` / `currency` / `percentage` → `0`
 * - `repeater` / `checkbox-group` / `switch-list` → `[]` (array-valued models)
 * - `image` / `file` → `null`
 * - everything else (text family, `select`, `radio`, `autocomplete`, …) → `""`
 */
export function defaultValueForType(type: FieldType): any {
    switch (type) {
        case "checkbox":
        case "switch":
            return false;
        case "number":
        case "currency":
        case "percentage":
            return 0;
        case "repeater":
        case "checkbox-group":
        case "switch-list":
            return [];
        case "image":
        case "file":
            return null;
        default:
            return "";
    }
}

/**
 * Deep-clone a default so object/array defaults aren't shared BY REFERENCE
 * across form instances or repeater rows (mutating one row would otherwise
 * mutate the field's declared default and every sibling row).
 *
 * Mirrors `useForm`'s `deepClone`: `toRaw` unwraps a Vue reactive proxy, then
 * `structuredClone` (which preserves Date/File/Map — a plain JSON round-trip
 * would flatten a `Date` default to a string) with a JSON fallback for a
 * residual nested proxy or otherwise-uncloneable value. This matters because
 * `defineForm`/`useResourceEditor` now clone here BEFORE the value reaches
 * `useForm`, so a lossy clone would corrupt a rich default the raw path used
 * to preserve (#134 review).
 */
export function cloneDefault<TValue>(value: TValue): TValue {
    if (value === null || typeof value !== "object") return value;
    const raw = toRaw(value);
    if (typeof structuredClone === "function") {
        try {
            return structuredClone(raw);
        } catch {
            // Reactive proxy or otherwise-uncloneable — fall through to JSON.
        }
    }
    return JSON.parse(JSON.stringify(raw));
}

/**
 * A field's starting value: its explicit `default` (deep-cloned) when one is
 * DEFINED, else the type default. Definedness — not nullishness — decides, so a
 * legitimate `null` default (e.g. a "none" select option whose value is `null`)
 * survives instead of being replaced by the type default (#122/#125). An absent
 * or explicitly-`undefined` default falls back to the type default rather than
 * seeding `undefined`, which would drop the key from the JSON payload.
 */
export function resolveFieldDefault(field: {
    type: FieldType;
    default?: any;
}): any {
    return field.default !== undefined
        ? cloneDefault(field.default)
        : defaultValueForType(field.type);
}

/**
 * Resolve a `MaybeFn<boolean>` predicate (`when` on a field or tab) against the
 * live model. `undefined` yields `fallback` (the field/tab is unconditioned).
 */
export function resolvePredicate(
    when: MaybeFn<boolean> | undefined,
    model: any,
    fallback: boolean,
): boolean {
    if (when === undefined) return fallback;
    return typeof when === "function" ? when(model) : when;
}

/**
 * Whether a field is VISIBLE against a model, by the one rule every renderer
 * shares: the `when` predicate (default visible) AND the legacy no-arg `show`
 * predicate. A field is visible only if both pass.
 */
export function isFieldVisible(
    field: { when?: MaybeFn<boolean>; show?: () => boolean },
    model: any,
): boolean {
    const whenOk = resolvePredicate(field.when, model, true);
    const showOk = field.show ? field.show() : true;
    return whenOk && showOk;
}

/**
 * Whether a field's value belongs in the submitted payload. A presentational
 * field (`submit: false`) — a header, an alert, an explanatory `span` block —
 * renders but holds no data and must not be POSTed just because it was declared.
 */
export function isSubmittableField(field: { submit?: boolean }): boolean {
    return field.submit !== false;
}
