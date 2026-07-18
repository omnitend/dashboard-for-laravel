import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { Chart } from 'chart.js';
import {
  withAlpha,
  formatValue,
  mergeOptions,
  applyPalette,
  getPalette,
} from '../../resources/js/components/charts/chartTheme';
import DXBarChart from '../../resources/js/components/charts/DXBarChart.vue';
import DXLineChart from '../../resources/js/components/charts/DXLineChart.vue';
import DXDoughnutChart from '../../resources/js/components/charts/DXDoughnutChart.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('chartTheme helpers', () => {
  it('getPalette resolves the dedicated --dx-chart-* palette from the built theme', () => {
    // The fixed, CVD-validated order from theme.scss's $dx-chart-palette (#141).
    // The values come through dist/style.css (imported in tests/setup.ts), so
    // this fails if the :root variables are dropped, reordered, or drift from
    // chartTheme.ts's fallbacks — not just if getPalette() returns "something".
    expect(getPalette()).toEqual([
      '#2563eb', // blue
      '#65a30d', // lime
      '#7c3aed', // violet
      '#0d9488', // teal
      '#ea580c', // orange
      '#0891b2', // cyan
      '#d97706', // amber
      '#db2777', // pink
    ]);
  });

  it('withAlpha converts hex and rgb to rgba', () => {
    expect(withAlpha('#0d6efd', 0.15)).toBe('rgba(13, 110, 253, 0.15)');
    expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });

  it('formatValue formats number / currency / percent', () => {
    expect(formatValue(1234.5, 'currency', '£')).toBe('£1,234.5');
    expect(formatValue(42, 'percent', '£')).toBe('42%');
    expect(formatValue(1000, 'number', '£')).toBe('1,000');
  });

  it('mergeOptions deep-merges objects and replaces arrays', () => {
    const merged = mergeOptions(
      { plugins: { legend: { display: false }, tooltip: { on: true } }, list: [1, 2] },
      { plugins: { legend: { display: true } }, list: [9] },
    );
    expect(merged.plugins.legend.display).toBe(true);
    expect(merged.plugins.tooltip.on).toBe(true); // untouched
    expect(merged.list).toEqual([9]); // arrays replace
  });

  it('applyPalette themes datasets that omit colours, respects explicit ones', () => {
    const [themed] = applyPalette([{ data: [1, 2, 3] }], 'line', 3);
    expect(themed.borderColor).toBeTruthy();
    expect(themed.fill).toBe(true);

    const [explicit] = applyPalette([{ data: [1], borderColor: '#123456' }], 'line', 1);
    expect(explicit.borderColor).toBe('#123456');

    const [doughnut] = applyPalette([{ data: [1, 2] }], 'doughnut', 2);
    expect(Array.isArray(doughnut.backgroundColor)).toBe(true);
    expect(doughnut.backgroundColor.length).toBe(2);
  });
});

describe('chart components render', () => {
  it('DXBarChart renders a canvas', async () => {
    const screen = render(DXBarChart, {
      props: {
        labels: ['Mon', 'Tue', 'Wed'],
        datasets: [{ label: 'Revenue', data: [10, 20, 15] }],
        valueFormat: 'currency',
      },
    });
    await flush();
    expect(screen.container.querySelector('canvas')).toBeTruthy();
  });

  it('DXLineChart renders a canvas', async () => {
    const screen = render(DXLineChart, {
      props: {
        labels: ['Mon', 'Tue', 'Wed'],
        datasets: [{ label: 'Sales', data: [1, 2, 3] }],
      },
    });
    await flush();
    expect(screen.container.querySelector('canvas')).toBeTruthy();
  });

  it('DXDoughnutChart renders a canvas from a data array', async () => {
    const screen = render(DXDoughnutChart, {
      props: {
        labels: ['A', 'B', 'C'],
        data: [5, 3, 2],
      },
    });
    await flush();
    expect(screen.container.querySelector('canvas')).toBeTruthy();
  });

  // Regression: Vue casts an absent Boolean prop to `false`, which broke the
  // `showLegend ?? …` default so the legend never showed. The default must fire.
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('shows the legend by default for a multi-series line chart', async () => {
    const screen = render(DXLineChart, {
      props: {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Visitors', data: [1, 2, 3] },
          { label: 'Orders', data: [3, 2, 1] },
        ],
      },
    });
    await wait(80);
    const chart = Chart.getChart(screen.container.querySelector('canvas') as HTMLCanvasElement);
    expect(chart?.options.plugins?.legend?.display).toBe(true);
    expect(chart?.legend?.legendItems?.length).toBe(2);
  });

  it('hides the legend by default for a single-series bar chart', async () => {
    const screen = render(DXBarChart, {
      props: { labels: ['A', 'B'], datasets: [{ label: 'Revenue', data: [1, 2] }] },
    });
    await wait(80);
    const chart = Chart.getChart(screen.container.querySelector('canvas') as HTMLCanvasElement);
    expect(chart?.options.plugins?.legend?.display).toBe(false);
  });

  it('shows the doughnut legend by default', async () => {
    const screen = render(DXDoughnutChart, {
      props: { labels: ['A', 'B', 'C'], data: [5, 3, 2] },
    });
    await wait(80);
    const chart = Chart.getChart(screen.container.querySelector('canvas') as HTMLCanvasElement);
    expect(chart?.options.plugins?.legend?.display).toBe(true);
  });

  it('respects an explicit showLegend=false', async () => {
    const screen = render(DXLineChart, {
      props: {
        labels: ['A', 'B'],
        datasets: [{ label: 'V', data: [1, 2] }, { label: 'O', data: [2, 1] }],
        showLegend: false,
      },
    });
    await wait(80);
    const chart = Chart.getChart(screen.container.querySelector('canvas') as HTMLCanvasElement);
    expect(chart?.options.plugins?.legend?.display).toBe(false);
  });
});
