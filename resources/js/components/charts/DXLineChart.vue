<!--
  @component
  A themed line chart. Thin wrapper around vue-chartjs (chart.js) with the
  Bootstrap palette applied (themed stroke + translucent fill, smoothed line)
  and dashboard-friendly defaults. Pass `labels` + `datasets`; `options`
  deep-merges over the defaults.

  Requires the optional peer deps `chart.js` and `vue-chartjs`.
-->
<template>
  <div class="dx-chart">
    <Line :data="chartData" :options="mergedOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  registerCharts,
  baseOptions,
  applyPalette,
  mergeOptions,
  type ChartValueFormat,
} from "./chartTheme";

registerCharts();

interface Props {
  /** X-axis category labels. */
  labels: string[];
  /** Chart.js datasets. Colours are themed when a dataset omits them. */
  datasets: any[];
  /** Chart.js options; deep-merged over the themed defaults. */
  options?: Record<string, any>;
  /** Format value-axis ticks and tooltips. */
  valueFormat?: ChartValueFormat;
  /** Currency symbol for valueFormat: "currency" (default "£"). */
  currencySymbol?: string;
  /** Locale for number formatting. */
  locale?: string;
  /** Show the legend (default: only when there is more than one dataset). */
  showLegend?: boolean;
}

// `showLegend` defaults to `undefined` (not Vue's Boolean-cast `false`) so the
// `?? datasets.length > 1` default can actually fire when it isn't passed.
const props = withDefaults(defineProps<Props>(), {
  currencySymbol: "£",
  showLegend: undefined,
});

const chartData = computed(() => ({
  labels: props.labels,
  datasets: applyPalette(props.datasets, "line", props.labels.length),
}));

const mergedOptions = computed(() =>
  mergeOptions(
    baseOptions({
      valueFormat: props.valueFormat,
      currencySymbol: props.currencySymbol,
      locale: props.locale,
      showLegend: props.showLegend ?? props.datasets.length > 1,
      hasValueAxis: true,
    }),
    props.options ?? {},
  ),
);
</script>

<style scoped>
.dx-chart {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
}
</style>
