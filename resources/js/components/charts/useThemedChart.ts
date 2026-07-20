import { computed, type ComputedRef } from "vue";
import type { ChartData, ChartDataset, ChartOptions } from "chart.js";
import {
    baseOptions,
    applyPalette,
    mergeOptions,
    type ChartValueFormat,
} from "./chartTheme";

/**
 * Shared props for the value-axis chart wrappers (`DXBarChart`, `DXLineChart`).
 * `DXBarChart` and `DXLineChart` differ ONLY in the chart.js component they
 * render and the palette kind — everything else (theming, option-merge,
 * legend-default) is identical, and lived duplicated in both SFCs (#135).
 */
export interface ThemedChartProps<TType extends "bar" | "line"> {
    /** X-axis category labels. */
    labels: string[];
    /** Chart.js datasets. Colours are themed when a dataset omits them. */
    datasets: ChartDataset<TType>[];
    /** Chart.js options; deep-merged over the themed defaults. */
    options?: ChartOptions<TType>;
    /** Format value-axis ticks and tooltips. */
    valueFormat?: ChartValueFormat;
    /** Currency symbol for valueFormat: "currency" (default "£"). */
    currencySymbol?: string;
    /** Locale for number formatting. */
    locale?: string;
    /** Show the legend (default: only when there is more than one dataset). */
    showLegend?: boolean;
}

/**
 * The themed-chart body shared by `DXBarChart` and `DXLineChart`: applies the
 * data-viz palette to un-coloured datasets and deep-merges the consumer's
 * `options` over the dashboard-friendly defaults. Pass the reactive `props`
 * object (property access stays reactive inside the computeds).
 */
export function useThemedChart<TType extends "bar" | "line">(
    type: TType,
    props: ThemedChartProps<TType>,
): {
    chartData: ComputedRef<ChartData<TType>>;
    mergedOptions: ComputedRef<ChartOptions<TType>>;
} {
    const chartData = computed(
        () =>
            ({
                labels: props.labels,
                datasets: applyPalette(props.datasets, type, props.labels.length),
            }) as ChartData<TType>,
    );

    const mergedOptions = computed(
        () =>
            mergeOptions(
                baseOptions({
                    valueFormat: props.valueFormat,
                    currencySymbol: props.currencySymbol,
                    locale: props.locale,
                    showLegend: props.showLegend ?? props.datasets.length > 1,
                    hasValueAxis: true,
                }),
                props.options ?? {},
            ) as ChartOptions<TType>,
    );

    return { chartData, mergedOptions };
}
