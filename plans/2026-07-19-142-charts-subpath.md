# #142 — split chart components into a `/charts` subpath entry so chart.js is a true optional peer

**Date:** 2026-07-19
**Issue:** [#142](https://github.com/omnitend/dashboard-for-laravel/issues/142) (dup umbrella [#132](https://github.com/omnitend/dashboard-for-laravel/issues/132))
**Type:** Packaging fix. **Breaking for chart consumers** (import path changes) — MINOR bump + CHANGELOG migration. Non-chart consumers: pure fix (their build stops requiring chart.js).

## Problem

`dist/dashboard-for-laravel.js` statically imports `chart.js`/`vue-chartjs` at module top level (via the barrel re-exporting the chart components). Even though they're declared *optional* peers, a chart-free consumer's `vite build` fails resolving them (confirmed on custard #104). A dynamic/lazy import doesn't fix it — the consumer's bundler still resolves the reference if the chart component is reachable from the entry. The only robust fix is a **separate entry** the consumer opts into.

## Approach — second build, main entry unchanged

Chart components import only `vue`, `chart.js`, `vue-chartjs`, and their own `chartTheme.ts` — **no base/dfl components** — so the charts entry is fully self-contained and needs no shared-chunk handling.

Keep the **main entry's output format byte-stable** (ES + UMD) — only remove the 3 chart exports from it. Add a **second Vite build** for the charts entry. This avoids the multi-entry-lib UMD-drop that would change the main package's `require` path for *every* consumer.

### Steps

1. **Globalize the chart container style.** All 3 chart components share one trivial scoped rule (`.dx-chart { position; width/height 100%; min-height 240px }`). Move it into `theme.scss` (global) and delete the scoped `<style>` blocks, so the charts entry emits **no CSS** — chart consumers already import the main stylesheet (theme + `--dx-chart-*` palette vars).
2. **New entry** `resources/js/charts.ts` — exports `DXBarChart`, `DXLineChart`, `DXDoughnutChart` (matches today's public chart surface; `chartTheme` stays internal). Does NOT import `theme.scss`.
3. **Remove** the 3 chart exports from `resources/js/index.ts`.
4. **`vite.config.charts.ts`** — single-entry `build.lib` for `charts.ts` → `dist/charts.js` (ES) + `dist/charts.umd.cjs` (UMD); externalize `vue`/`chart.js`/`vue-chartjs` with the same globals as main; `emptyOutDir: false` (don't wipe the main build).
5. **`build:lib`** = `vite build && vite build --config vite.config.charts.ts && node scripts/extract-icon-font.mjs`. (Icon-font extract runs on the main `style.css`, unaffected.)
6. **package.json** — add `"./charts"` export (`types`/`import`/`require` → the charts d.ts/js/umd.cjs). Main `.`/`main`/`module` unchanged. `chart.js`/`vue-chartjs` stay external + optional peers.
7. **Declarations** — `vue-tsc --emitDeclarationOnly` already compiles the whole program; point `./charts` `types` at the emitted `charts.d.ts` (verify path after build).
8. **Docs** — update every chart example/import from the main entry to `@omnitend/dashboard-for-laravel/charts`. Update the vite alias in `astro.config.mjs` if it maps the package to `dist/...`.
9. **CHANGELOG** — Breaking: chart components move to `/charts`; one-line migration (`import { DXBarChart } from '@omnitend/dashboard-for-laravel/charts'`). MINOR bump.

## Verify (the property that was broken)

- **Main entry has ZERO chart references:** `grep -E "chart\.js|vue-chartjs" dist/dashboard-for-laravel.js` → empty. This is the assertion that would have caught the bug; guard it with a bundle test (like `icon-font.test.ts`) reading `dist/...js?raw`.
- **Charts entry has them (external, not bundled):** `dist/charts.js` imports `chart.js`/`vue-chartjs`.
- **Simulate a chart-free consumer:** a scratch Vite build that imports only the main entry resolves without `chart.js` installed (or at least: the main bundle contains no `chart.js` specifier). 
- Full suite green; docs build green.

## Out of scope
- The axios half of #132 (same mechanism; do as a follow-up if #142 lands clean).
- Exporting `chartTheme` helpers publicly (keep internal unless a consumer needs them).
