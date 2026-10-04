#!/usr/bin/env node
/**
 * Validate the DX*Chart palettes in resources/css/theme.scss.
 *
 * Scores each palette the way the theme comment documents it:
 *   - colour difference is OKLab ΔE ×100;
 *   - colour-vision deficiency is simulated with the Viénot protan/deutan
 *     matrices, and "adjacent CVD ΔE" is the smallest difference between
 *     neighbouring slots under either simulation (the slot ORDER matters,
 *     because neighbouring series are the ones a reader has to tell apart);
 *   - "best order" exhaustively permutes slots 2..8 (slot 1 stays pinned) and
 *     reports the order that maximises the adjacent CVD ΔE, so you can see
 *     whether the shipped order is the best available one;
 *   - contrast is the WCAG ratio against the surface the colour sits on.
 *
 * Usage:
 *   node scripts/validate-chart-palette.mjs
 *       reads $dx-chart-palette, $dx-chart-line-palette and
 *       $dx-chart-palette-dark from theme.scss
 *   node scripts/validate-chart-palette.mjs "#aaaaaa,#bbbbbb,..." [surface]
 *       scores one ad-hoc palette (surface defaults to #ffffff)
 *
 * The line shades are each fill darkened toward black (same hue) until they
 * clear LINE_CONTRAST on white; the script re-derives them and reports any
 * slot whose shipped shade differs from the derivation.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LINE_CONTRAST = 3.5;
const LIGHT_SURFACE = "#ffffff";
const DARK_SURFACE = "#212529"; // Bootstrap's $body-bg-dark

const PROTAN = [
    [0.11238, 0.88762, 0],
    [0.11238, 0.88762, 0],
    [0.00401, -0.00401, 1],
];
const DEUTAN = [
    [0.29275, 0.70725, 0],
    [0.29275, 0.70725, 0],
    [-0.02234, 0.02234, 1],
];

const hexToChannels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const linearise = (channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toLinear = (hex) => hexToChannels(hex).map(linearise);
const multiply = (matrix, vector) =>
    matrix.map((row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2]);
const clampUnit = (vector) => vector.map((c) => Math.min(1, Math.max(0, c)));

function oklab([r, g, b]) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

const deltaE = (a, b) => 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const luminance = (hex) => {
    const [r, g, b] = toLinear(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
};

const views = {
    normal: (hex) => oklab(toLinear(hex)),
    protan: (hex) => oklab(clampUnit(multiply(PROTAN, toLinear(hex)))),
    deutan: (hex) => oklab(clampUnit(multiply(DEUTAN, toLinear(hex)))),
};

export function score(palette, surface = LIGHT_SURFACE) {
    let adjacentCvd = Infinity;
    let adjacentNormal = Infinity;
    let anyPairNormal = Infinity;
    let weakestPair = null;
    let closestPair = null;
    for (let i = 0; i < palette.length; i++) {
        for (let j = i + 1; j < palette.length; j++) {
            const normal = deltaE(views.normal(palette[i]), views.normal(palette[j]));
            if (normal < anyPairNormal) {
                anyPairNormal = normal;
                closestPair = [palette[i], palette[j]];
            }
            if (j !== i + 1) continue;
            adjacentNormal = Math.min(adjacentNormal, normal);
            const cvd = Math.min(
                deltaE(views.protan(palette[i]), views.protan(palette[j])),
                deltaE(views.deutan(palette[i]), views.deutan(palette[j])),
            );
            if (cvd < adjacentCvd) {
                adjacentCvd = cvd;
                weakestPair = [palette[i], palette[j]];
            }
        }
    }
    const contrasts = palette.map((hex) => contrast(hex, surface));
    return {
        adjacentCvd,
        adjacentNormal,
        anyPairNormal,
        minContrast: Math.min(...contrasts),
        maxContrast: Math.max(...contrasts),
        weakestPair,
        closestPair,
    };
}

function* permutations(items) {
    if (items.length <= 1) {
        yield items;
        return;
    }
    for (let i = 0; i < items.length; i++) {
        const rest = [...items.slice(0, i), ...items.slice(i + 1)];
        for (const tail of permutations(rest)) yield [items[i], ...tail];
    }
}

/** Best order with slot 1 pinned, maximising adjacent CVD ΔE. */
export function bestOrder(palette, surface = LIGHT_SURFACE) {
    const [first, ...rest] = palette;
    let best = null;
    for (const tail of permutations(rest)) {
        const order = [first, ...tail];
        const result = score(order, surface);
        if (best === null || result.adjacentCvd > best.score.adjacentCvd) {
            best = { order, score: result };
        }
    }
    return best;
}

/** Darken toward black (same hue) in small steps until `target`:1 on white. */
export function darkenTo(hex, target) {
    const channels = hexToChannels(hex);
    for (let step = 0; step <= 200; step++) {
        const k = step / 200;
        const candidate =
            "#" +
            channels
                .map((v) => Math.round(v * (1 - k)).toString(16).padStart(2, "0"))
                .join("");
        if (contrast(candidate, LIGHT_SURFACE) >= target) return candidate;
    }
    return "#000000";
}

function readSassList(source, name) {
    const match = source.match(new RegExp(`\\$${name}:\\s*\\(([^)]*)\\)`));
    if (match === null) throw new Error(`$${name} not found in theme.scss`);
    return match[1].split(",").map((hex) => hex.trim().toLowerCase()).filter(Boolean);
}

const round = (n) => n.toFixed(2);

function report(label, palette, surface) {
    const result = score(palette, surface);
    const best = bestOrder(palette, surface);
    console.log(`${label}: ${palette.join(" ")}`);
    console.log(
        `  min adjacent CVD ΔE ${round(result.adjacentCvd)}` +
            ` (weakest pair ${result.weakestPair.join(" / ")})`,
    );
    console.log(
        `  min adjacent normal ΔE ${round(result.adjacentNormal)},` +
            ` min any-pair normal ΔE ${round(result.anyPairNormal)}` +
            ` (${result.closestPair.join(" / ")})`,
    );
    console.log(
        `  contrast on ${surface}: ${round(result.minContrast)}–${round(result.maxContrast)}:1`,
    );
    const isBest = best.order.join() === palette.join();
    console.log(
        `  best order (slot 1 pinned): ${isBest ? "the shipped order" : best.order.join(" ")}` +
            ` → min adjacent CVD ΔE ${round(best.score.adjacentCvd)}`,
    );
    return result;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
    const adHoc = process.argv[2];
    if (adHoc !== undefined) {
        const palette = adHoc.split(",").map((hex) => hex.trim().toLowerCase());
        report("palette", palette, (process.argv[3] ?? LIGHT_SURFACE).toLowerCase());
    } else {
        const here = dirname(fileURLToPath(import.meta.url));
        const source = readFileSync(resolve(here, "../resources/css/theme.scss"), "utf8");
        const fills = readSassList(source, "dx-chart-palette");
        const lines = readSassList(source, "dx-chart-line-palette");
        const dark = readSassList(source, "dx-chart-palette-dark");

        report("light fills", fills, LIGHT_SURFACE);
        report("light lines", lines, LIGHT_SURFACE);
        report("dark fills (and dark lines)", dark, DARK_SURFACE);

        const mismatches = fills
            .map((fill, i) => ({ slot: i + 1, fill, shipped: lines[i], derived: darkenTo(fill, LINE_CONTRAST) }))
            .filter(({ shipped, derived }) => shipped !== derived);
        if (lines.length !== fills.length) {
            console.log(`\nLINE COUNT MISMATCH: ${fills.length} fills, ${lines.length} lines`);
            process.exitCode = 1;
        } else if (mismatches.length > 0) {
            console.log(`\nLine shades that differ from "fill darkened to ${LINE_CONTRAST}:1 on white":`);
            for (const { slot, fill, shipped, derived } of mismatches) {
                console.log(`  slot ${slot}: fill ${fill}, shipped ${shipped}, derived ${derived}`);
            }
            process.exitCode = 1;
        } else {
            console.log(`\nEvery line shade is its fill darkened to ${LINE_CONTRAST}:1 on white.`);
        }
    }
}
