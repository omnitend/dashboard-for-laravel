<!--
  @component
  A themed doughnut chart. Thin wrapper around vue-chartjs (chart.js) with one
  chart-palette colour (--dx-chart-1..8) per slice and dashboard-friendly defaults. Pass
  `labels` + either `data` (a number array) or full `datasets`; `options`
  deep-merges over the defaults.

  Requires the optional peer deps `chart.js` and `vue-chartjs`.
-->
<template>
  <div ref="host" class="dx-chart">
    <Doughnut :data="chartData" :options="mergedOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Doughnut } from "vue-chartjs";
import {
  registerCharts,
  baseOptions,
  applyPalette,
  mergeOptions,
  useColorModeVersion,
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

// The container is the `data-bs-theme` scope the palette resolves against, so a
// chart inside a dark card on a light page themes from the card. Reading the ref
// inside the computeds also re-themes on mount, when the first (pre-ref) render
// had to fall back to the document root (#161). DXDoughnutChart doesn't share
// `useThemedChart` (its data shape differs), so the wiring is repeated here.
const host = ref<HTMLElement | null>(null);

// Bumped by a MutationObserver on every `data-bs-theme` change; read below so
// the CSS-variable palette — invisible to Vue's reactivity — is re-resolved
// when the colour mode flips under a mounted chart.
const colorModeVersion = useColorModeVersion();

const resolvedDatasets = computed(() =>
  props.datasets ?? [{ data: props.data ?? [] }],
);

const chartData = computed(() => {
  void colorModeVersion.value;
  return {
    labels: props.labels,
    datasets: applyPalette(
      resolvedDatasets.value,
      "doughnut",
      props.labels.length,
      host.value,
    ),
  };
});

const mergedOptions = computed(() => {
  void colorModeVersion.value;
  return mergeOptions(
    baseOptions({
      valueFormat: props.valueFormat,
      currencySymbol: props.currencySymbol,
      locale: props.locale,
      showLegend: props.showLegend ?? true,
      hasValueAxis: false,
      scope: host.value,
    }),
    props.options ?? {},
  );
});
</script>
