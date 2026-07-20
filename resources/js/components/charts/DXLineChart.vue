<!--
  @component
  A themed line chart. Thin wrapper around vue-chartjs (chart.js) with the
  theme's dedicated chart palette applied (--dx-chart-1..8 stroke + translucent fill, smoothed line)
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
import { Line } from "vue-chartjs";
import { registerCharts } from "./chartTheme";
import { useThemedChart, type ThemedChartProps } from "./useThemedChart";

registerCharts();

// `showLegend` defaults to `undefined` (not Vue's Boolean-cast `false`) so the
// `?? datasets.length > 1` default can actually fire when it isn't passed.
const props = withDefaults(defineProps<ThemedChartProps<"line">>(), {
  currencySymbol: "£",
  showLegend: undefined,
});

const { chartData, mergedOptions } = useThemedChart("line", props);
</script>
