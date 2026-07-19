/**
 * Chart entry point — `@omnitend/dashboard-for-laravel/charts` (#142).
 *
 * The chart components are the ONLY ones that need `chart.js` / `vue-chartjs`,
 * so they live behind this separate subpath entry. The main entry
 * (`@omnitend/dashboard-for-laravel`) never references the chart libraries, so
 * they are genuinely OPTIONAL peers: a consumer that renders no charts installs
 * neither and their build no longer fails resolving them.
 *
 *   import { DXBarChart } from '@omnitend/dashboard-for-laravel/charts';
 *
 * Chart containers are styled by `.dx-chart` in the main stylesheet
 * (`@omnitend/dashboard-for-laravel/style.css`), which chart consumers already
 * import for the theme and the `--dx-chart-*` palette variables — so this entry
 * ships no CSS of its own.
 */
export { default as DXBarChart } from "./components/charts/DXBarChart.vue";
export { default as DXLineChart } from "./components/charts/DXLineChart.vue";
export { default as DXDoughnutChart } from "./components/charts/DXDoughnutChart.vue";
