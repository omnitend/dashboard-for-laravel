/**
 * Minimal dot-path get/set helpers used for nested form binding
 * (e.g. repeater rows where a field value lives at `lines.0.price`).
 *
 * Paths are dot-separated; numeric segments index into arrays. Setting
 * creates intermediate objects/arrays as needed so a fresh repeater row
 * can be populated without pre-seeding the whole shape.
 */

type AnyRecord = Record<string, any>;

/** Split a dot path into segments, ignoring empty segments. */
function splitPath(path: string): string[] {
    return path.split(".").filter((segment) => segment.length > 0);
}

/** Read the value at `path` within `target`, or `undefined` if absent. */
export function getByPath(target: AnyRecord, path: string): any {
    const segments = splitPath(path);
    let current: any = target;
    for (const segment of segments) {
        if (current === null || current === undefined) return undefined;
        current = current[segment];
    }
    return current;
}

/**
 * Write `value` at `path` within `target`, creating intermediate
 * containers. A numeric next-segment creates an array; otherwise an
 * object. Mutates `target` in place (form.data is reactive).
 */
export function setByPath(target: AnyRecord, path: string, value: any): void {
    const segments = splitPath(path);
    if (segments.length === 0) return;

    let current: any = target;
    for (let index = 0; index < segments.length - 1; index += 1) {
        const segment = segments[index];
        const nextSegment = segments[index + 1];
        const nextIsIndex = /^\d+$/.test(nextSegment);

        if (
            current[segment] === null ||
            current[segment] === undefined ||
            typeof current[segment] !== "object"
        ) {
            current[segment] = nextIsIndex ? [] : {};
        }
        current = current[segment];
    }

    current[segments[segments.length - 1]] = value;
}
