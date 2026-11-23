/**
 * Casing for a DXTable `itemName` ("booking period") where it is shown.
 *
 * Titles and buttons ("New Booking Period", "Create Booking Period") take
 * Title Case; a sentence that starts with the name ("Booking period
 * created successfully") takes a capital first letter; mid-sentence uses
 * ("No booking periods found") keep the name as written.
 */

/**
 * Upper-cases the first letter of each space-separated word and leaves the
 * rest as written, so "SKU" stays "SKU" and "product's" does not become
 * "Product'S" (a `\b\w` replace capitalised the letter after an apostrophe).
 * An empty name reads as "Item".
 */
export function titleCaseItemName(itemName: string | undefined): string {
    const noun = itemName?.trim() || "item";
    return noun
        .split(/(\s+)/)
        .map((word) => (word.trim() === "" ? word : capitaliseFirst(word)))
        .join("");
}

/** Upper-cases the first character, for text that starts a sentence. */
export function capitaliseFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
