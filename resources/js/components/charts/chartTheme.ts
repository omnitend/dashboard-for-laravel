/**
 * Shared theming for the DX*Chart wrappers: the dedicated categorical chart
 * palette (--dx-chart-* from the live theme), dashboard-friendly default options (no gridlines /
 * legend clutter, responsive, formatted ticks), and a one-time Chart.js
 * registration. chart.js / vue-chartjs are OPTIONAL peer deps.
 */
import { Chart, registerables } from "chart.js";
import { getCurrentScope, onScopeDispose, ref, type Ref } from "vue";

export type ChartValueFormat = "number" | "currency" | "percent";

const isPlainObject = (value: unknown): value is Record<string, any> =>
    !!value && typeof value === "object" && !Array.isArray(value);

/** Deep-merge consumer `options` over the themed defaults (arrays replace). */
export function mergeOptions(
    base: Record<string, any>,
    override: Record<string, any>,
): Record<string, any> {
    const result: Record<string, any> = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = mergeOptions(result[key], value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

let registered = false;

/**
 * Register Chart.js (idempotent). Uses the full `registerables` set so every
 * controller / scale / element / plugin (incl. Legend, Tooltip, Filler) is
 * available — chart.js is an external peer dep, so this adds no bundle weight.
 */
export function registerCharts(): void {
    if (registered) return;
    Chart.register(...registerables);
    registered = true;
}

// The dedicated data-viz palette (`$dx-chart-palette` in theme.scss) — eight
// vivid hues in a fixed, CVD-validated order, published as --dx-chart-1..8.
// Deliberately NOT the semantic --bs-* colours (#141): the base theme colours
// are dark AA "emphasis" shades (too muted for series), and status colours
// shouldn't impersonate "series 2". Fallbacks mirror the shipped theme so
// charts still render without the CSS (SSR / tests / a consumer who didn't
// import it). Sync with theme.scss's $dx-chart-palette is enforced by a test
// that parses the Sass source (charts.test.ts), which is why this is exported.
export const PALETTE_VARS: Array<[string, string]> = [
    ["--dx-chart-1", "#2563eb"], // blue
    ["--dx-chart-2", "#65a30d"], // lime
    ["--dx-chart-3", "#7c3aed"], // violet
    ["--dx-chart-4", "#0d9488"], // teal
    ["--dx-chart-5", "#ea580c"], // orange
    ["--dx-chart-6", "#0891b2"], // cyan
    ["--dx-chart-7", "#d97706"], // amber
    ["--dx-chart-8", "#db2777"], // pink
];

/**
 * The element whose computed style the theme variables are read from.
 *
 * Bootstrap 5.3 allows `data-bs-theme` on ANY container, not just `<html>` — a
 * dark card on a light page is a supported pattern. Reading the variables off
 * `document.documentElement` therefore gives a *nested* scope the wrong palette
 * (#161), so every resolver takes the chart's own container and only falls back
 * to the root when it has none (SSR, a caller outside a component).
 */
function themeScope(scope?: Element | null): Element | null {
    if (typeof document === "undefined" || typeof getComputedStyle === "undefined") {
        return null;
    }
    if (scope !== undefined && scope !== null) return scope;
    return document.documentElement;
}

/**
 * Resolve the themed categorical palette.
 *
 * @param scope The chart's container element; its computed style decides which
 *   `data-bs-theme` scope applies. Omit (or pass null) to read the document
 *   root — the pre-#161 behaviour, kept so the exported signature stays
 *   backward compatible.
 */
export function getPalette(scope?: Element | null): string[] {
    const host = themeScope(scope);
    if (host === null) {
        return PALETTE_VARS.map(([, fallback]) => fallback);
    }
    const styles = getComputedStyle(host);
    return PALETTE_VARS.map(([name, fallback]) => {
        const value = styles.getPropertyValue(name).trim();
        return value || fallback;
    });
}

/** Read a single theme colour (e.g. the body text colour) with a fallback. */
function themeColor(name: string, fallback: string, scope?: Element | null): string {
    const host = themeScope(scope);
    if (host === null) {
        return fallback;
    }
    const value = getComputedStyle(host).getPropertyValue(name).trim();
    return value || fallback;
}

// ---------------------------------------------------------------------------
// Colour-mode reactivity (#161)
//
// The palette lives in CSS variables, which Vue cannot track: a computed that
// calls getPalette() depends only on the props it also reads, so flipping
// `data-bs-theme` repaints the page but leaves every MOUNTED chart on the old
// palette until a prop changes or it remounts. One shared MutationObserver
// bumps a version ref that the chart computeds read, which re-resolves the
// variables. `subtree: true` because the attribute can sit on any container,
// and `attributeFilter` keeps the observer from firing on unrelated mutations.
// ---------------------------------------------------------------------------

const colorModeVersion = ref(0);
let colorModeObserver: MutationObserver | null = null;
let colorModeWatchers = 0;

/**
 * A version ref that increments whenever a `data-bs-theme` attribute changes
 * anywhere in the document. Read it inside a computed that resolves theme
 * variables to make that computed re-run on a colour-mode switch.
 *
 * The observer is started on first use and disconnected when the last consumer's
 * effect scope is disposed, so nothing leaks after the charts unmount. Called
 * outside an effect scope (or without a DOM) it is a no-op returning a static
 * ref — there would be no teardown hook to disconnect the observer.
 */
export function useColorModeVersion(): Ref<number> {
    if (
        typeof document === "undefined" ||
        typeof MutationObserver === "undefined" ||
        getCurrentScope() === undefined
    ) {
        return colorModeVersion;
    }

    colorModeWatchers += 1;
    if (colorModeObserver === null) {
        colorModeObserver = new MutationObserver(() => {
            colorModeVersion.value += 1;
        });
        colorModeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-bs-theme"],
            subtree: true,
        });
    }

    onScopeDispose(() => {
        colorModeWatchers -= 1;
        if (colorModeWatchers === 0 && colorModeObserver !== null) {
            colorModeObserver.disconnect();
            colorModeObserver = null;
        }
    });

    return colorModeVersion;
}

/** Add an alpha channel to a hex or rgb() colour (best-effort). */
export function withAlpha(color: string, alpha: number): string {
    const hex = color.replace(/^#/, "");
    if (/^[0-9a-f]{6}$/i.test(hex)) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/);
    if (rgbMatch) {
        const [r, g, b] = rgbMatch[1].split(",").map((n) => n.trim());
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
}

/** Format a numeric value per the chart's value format (for tick/tooltips). */
export function formatValue(
    value: number,
    format: ChartValueFormat | undefined,
    currencySymbol: string,
    locale?: string,
): string {
    const num = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
    }).format(value);
    if (format === "currency") return `${currencySymbol}${num}`;
    if (format === "percent") return `${num}%`;
    return num;
}

export interface BaseOptionArgs {
    valueFormat?: ChartValueFormat;
    currencySymbol?: string;
    locale?: string;
    /** Show the legend (default: false for a single dataset, true for many). */
    showLegend?: boolean;
    /** Whether the chart has value axes (bar/line) vs none (doughnut). */
    hasValueAxis?: boolean;
    /** The chart's container element — decides which `data-bs-theme` scope the
     *  grid/tick colours resolve against (#161). Defaults to the document root. */
    scope?: Element | null;
}

/** Dashboard default Chart.js options merged under any consumer `options`. */
export function baseOptions(args: BaseOptionArgs): Record<string, any> {
    const {
        valueFormat,
        currencySymbol = "£",
        locale,
        showLegend = false,
        hasValueAxis = true,
        scope,
    } = args;

    const gridColor = withAlpha(
        themeColor("--bs-border-color", "#dee2e6", scope),
        0.6,
    );
    const tickColor = themeColor("--bs-secondary-color", "#6c757d", scope);

    const options: Record<string, any> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: showLegend, labels: { color: tickColor } },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => {
                        const raw = ctx.parsed?.y ?? ctx.parsed ?? ctx.raw;
                        const value = typeof raw === "number" ? raw : Number(raw);
                        const formatted = Number.isFinite(value)
                            ? formatValue(value, valueFormat, currencySymbol, locale)
                            : String(raw);
                        const label = ctx.dataset?.label ?? ctx.label ?? "";
                        return label ? `${label}: ${formatted}` : formatted;
                    },
                },
            },
        },
    };

    if (hasValueAxis) {
        options.scales = {
            x: {
                grid: { display: false },
                border: { color: gridColor },
                ticks: { color: tickColor },
            },
            y: {
                beginAtZero: true,
                grid: { color: gridColor, drawBorder: false },
                border: { display: false },
                ticks: {
                    color: tickColor,
                    callback: (value: number | string) =>
                        formatValue(Number(value), valueFormat, currencySymbol, locale),
                },
            },
        };
    }

    return options;
}

/**
 * Apply the themed palette to any dataset that doesn't set its own colours.
 * Bar: one colour per dataset (or per bar for a single dataset). Line: a themed
 * stroke + translucent fill. Doughnut/pie: one colour per slice.
 *
 * `scope` is the chart's container element; the palette is resolved from its
 * computed style so a nested `data-bs-theme` container themes correctly (#161).
 * Omit it to resolve against the document root.
 */
export function applyPalette(
    datasets: any[],
    kind: "bar" | "line" | "doughnut",
    labelsCount: number,
    scope?: Element | null,
): any[] {
    const palette = getPalette(scope);
    const single = datasets.length === 1;

    return datasets.map((dataset, index) => {
        const next = { ...dataset };
        const color = palette[index % palette.length];

        if (kind === "doughnut") {
            if (next.backgroundColor === undefined) {
                next.backgroundColor = Array.from(
                    { length: labelsCount },
                    (_, i) => palette[i % palette.length],
                );
            }
            return next;
        }

        if (kind === "line") {
            if (next.borderColor === undefined) next.borderColor = color;
            if (next.backgroundColor === undefined) {
                next.backgroundColor = withAlpha(color, 0.15);
            }
            if (next.tension === undefined) next.tension = 0.3;
            if (next.fill === undefined) next.fill = true;
            if (next.pointRadius === undefined) next.pointRadius = 2;
            return next;
        }

        // bar
        if (next.backgroundColor === undefined) {
            next.backgroundColor =
                single && labelsCount > 1
                    ? Array.from({ length: labelsCount }, () => color)
                    : color;
        }
        if (next.borderRadius === undefined) next.borderRadius = 4;
        return next;
    });
}
