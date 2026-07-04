<!--
  @component
  A themed doughnut chart. Thin wrapper around vue-chartjs (chart.js) with one
  Bootstrap palette colour per slice and dashboard-friendly defaults. Pass
  `labels` + either `data` (a number array) or full `datasets`; `options`
  deep-merges over the defaults.

  Requires the optional peer deps `chart.js` and `vue-chartjs`.
-->
<template>
  <div class="dx-chart">
    <Doughnut :data="chartData" :options="mergedOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import {
  registerCharts,
  baseOptions,
  applyPalette,
  mergeOptions,
  type ChartValueFormat,
} from "./chartTheme";

registerCharts();

interface Props {
  /** Slice labels. */
  labels: string[];
  /** Convenience: a single number array (one value per label). */
  data?: number[];
  /** Full Chart.js datasets (alternative to `data`). */
  datasets?: any[];
  /** Chart.js options; deep-merged over the themed defaults. */
  options?: Record<string, any>;
  /** Format tooltip values. */
  valueFormat?: ChartValueFormat;
  /** Currency symbol for valueFormat: "currency" (default "£"). */
  currencySymbol?: string;
  /** Locale for number formatting. */
  locale?: string;
  /** Show the legend (default: true — slices need identifying). */
  showLegend?: boolean;
}

// `showLegend` defaults to `undefined` (not Vue's Boolean-cast `false`) so the
// `?? true` default can actually fire when it isn't passed.
const props = withDefaults(defineProps<Props>(), {
  currencySymbol: "£",
  showLegend: undefined,
});

const resolvedDatasets = computed(() =>
  props.datasets ?? [{ data: props.data ?? [] }],
);

const chartData = computed(() => ({
  labels: props.labels,
  datasets: applyPalette(resolvedDatasets.value, "doughnut", props.labels.length),
}));

const mergedOptions = computed(() =>
  mergeOptions(
    baseOptions({
      valueFormat: props.valueFormat,
      currencySymbol: props.currencySymbol,
      locale: props.locale,
      showLegend: props.showLegend ?? true,
      hasValueAxis: false,
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
