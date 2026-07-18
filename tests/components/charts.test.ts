import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { Chart } from 'chart.js';
import {
  withAlpha,
  formatValue,
  mergeOptions,
  applyPalette,
  getPalette,
  PALETTE_VARS,
} from '../../resources/js/components/charts/chartTheme';
// The Sass SOURCE (not the built CSS) — vitest runs in a browser, so read it
// through Vite's ?raw import, never node:fs (see CLAUDE.md testing gotchas).
import themeScssSource from '../../resources/css/theme.scss?raw';
import DXBarChart from '../../resources/js/components/charts/DXBarChart.vue';
import DXLineChart from '../../resources/js/components/charts/DXLineChart.vue';
import DXDoughnutChart from '../../resources/js/components/charts/DXDoughnutChart.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('chartTheme helpers', () => {
  // The fixed, CVD-validated order from theme.scss's $dx-chart-palette (#141).
  const EXPECTED_PALETTE = [
    '#2563eb', // blue
    '#65a30d', // lime
    '#7c3aed', // violet
    '#0d9488', // teal
    '#ea580c', // orange
    '#0891b2', // cyan
    '#d97706', // amber
    '#db2777', // pink
  ];

  it('getPalette resolves the dedicated --dx-chart-* palette', () => {
    expect(getPalette()).toEqual(EXPECTED_PALETTE);
  });

  it('the built CSS publishes every --dx-chart-* variable', () => {
    // Deliberately NOT via getPalette(): its `value || fallback` means a
    // dropped :root variable silently falls back to the identical TS hex and
    // the assertion above still passes. Reading the raw custom property has no
    // fallback to hide behind — an absent variable resolves to '' and fails.
    const styles = getComputedStyle(document.documentElement);
    const published = EXPECTED_PALETTE.map(
      (_, i) => styles.getPropertyValue(`--dx-chart-${i + 1}`).trim(),
    );
    expect(published).toEqual(EXPECTED_PALETTE);
  });

  it('chartTheme fallbacks match theme.scss $dx-chart-palette', () => {
    // The TS fallbacks only ever run on the SSR/no-CSS path, which no browser
    // test exercises — so drift there is invisible to the two tests above.
    // Guard it by parsing the hexes straight out of the Sass source.
    const paletteLine = themeScssSource.match(/\$dx-chart-palette:\s*\(([^)]*)\)/);
    expect(paletteLine).not.toBeNull();
    const scssHexes = paletteLine![1].match(/#[0-9a-fA-F]{3,8}/g);
    expect(scssHexes).toEqual(PALETTE_VARS.map(([, fallback]) => fallback));
    expect(scssHexes).toEqual(EXPECTED_PALETTE);
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
