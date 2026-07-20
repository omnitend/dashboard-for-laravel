<!--
  @component
  A themed bar chart. Thin wrapper around vue-chartjs (chart.js) with the
  theme's dedicated chart palette (--dx-chart-1..8) applied and dashboard-friendly defaults (no x gridlines,
  formatted value ticks, responsive, legend hidden for a single series). Pass
  `labels` + `datasets`; `options` deep-merges over the defaults.

  Requires the optional peer deps `chart.js` and `vue-chartjs`.
-->
<template>
  <div class="dx-chart">
    <Bar :data="chartData" :options="mergedOptions" />
  </div>
</template>

<script setup lang="ts">
import { Bar } from "vue-chartjs";
import { registerCharts } from "./chartTheme";
import { useThemedChart, type ThemedChartProps } from "./useThemedChart";

registerCharts();

// `showLegend` defaults to `undefined` (not Vue's Boolean-cast `false`) so the
// `?? datasets.length > 1` default can actually fire when it isn't passed.
const props = withDefaults(defineProps<ThemedChartProps<"bar">>(), {
  currencySymbol: "£",
  showLegend: undefined,
});

const { chartData, mergedOptions } = useThemedChart("bar", props);
</script>
