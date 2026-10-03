import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { Chart } from 'chart.js';
import {
  withAlpha,
  formatValue,
  mergeOptions,
  applyPalette,
  getPalette,
  getLinePalette,
  getEdgeColor,
  PALETTE_VARS,
  LINE_PALETTE_VARS,
  EDGE_VAR,
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
    '#7fd7fd', // sky
    '#7bf25a', // lime
    '#e46ab9', // magenta
    '#d6e86a', // lime-yellow
    '#b9a3f0', // lavender
    '#efd574', // butter
    '#9fb4ff', // periwinkle
    '#f7a072', // peach
  ];
  // Each fill darkened to 3.5:1 on white ($dx-chart-line-palette), same order.
  const EXPECTED_LINES = [
    '#5590aa',
    '#4d9839',
    '#d161a9',
    '#848f41',
    '#907fbb',
    '#99884a',
    '#7686be',
    '#ba7956',
  ];
  const EXPECTED_EDGE = '#121419';
  const DARK_BODY_BG = '#212529';

  const sassList = (name: string) => {
    const line = themeScssSource.match(new RegExp(`\\$${name}:\\s*\\(([^)]*)\\)`));
    expect(line).not.toBeNull();
    return line![1].match(/#[0-9a-fA-F]{3,8}/g);
  };

  it('getPalette resolves the dedicated --dx-chart-* palette', () => {
    expect(getPalette()).toEqual(EXPECTED_PALETTE);
  });

  it('getLinePalette and getEdgeColor resolve the line shades and the edge', () => {
    expect(getLinePalette()).toEqual(EXPECTED_LINES);
    expect(getEdgeColor()).toBe(EXPECTED_EDGE);
  });

  it('the built CSS publishes every --dx-chart-line-* variable and --dx-chart-edge', () => {
    // Raw custom properties, no TS fallback to hide a missing variable.
    const styles = getComputedStyle(document.documentElement);
    const lines = EXPECTED_LINES.map(
      (_, i) => styles.getPropertyValue(`--dx-chart-line-${i + 1}`).trim(),
    );
    expect(lines).toEqual(EXPECTED_LINES);
    expect(styles.getPropertyValue('--dx-chart-edge').trim()).toBe(EXPECTED_EDGE);
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

  // Dark-surface remap (#145): same hue slots (the CVD-derived ORDER is
  // load-bearing), lightness lifted so every step clears 3:1 on Bootstrap's
  // dark body #212529. Validated with the same method as the light set —
  // min adjacent CVD ΔE 15.1, min normal 25.3, contrast 5.67–10.23:1.
  const EXPECTED_DARK_PALETTE = [
    '#60a5fa', // blue
    '#a3e635', // lime
    '#a78bfa', // violet
    '#2dd4bf', // teal
    '#fb923c', // orange
    '#22d3ee', // cyan
    '#fbbf24', // amber
    '#f472b6', // pink
  ];

  it('under data-bs-theme=dark the CSS remaps --dx-chart-* and getPalette follows', () => {
    // Would this pass if the remap were missing? No — the vars would resolve
    // to the light hexes and both assertions reject the light set.
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    try {
      const styles = getComputedStyle(document.documentElement);
      const published = EXPECTED_DARK_PALETTE.map(
        (_, i) => styles.getPropertyValue(`--dx-chart-${i + 1}`).trim(),
      );
      expect(published).toEqual(EXPECTED_DARK_PALETTE);
      expect(getPalette()).toEqual(EXPECTED_DARK_PALETTE);
      // Dark lines ARE the dark fills, and the edge is the dark body colour,
      // so dark charts look as they did before the light edge existed.
      expect(getLinePalette()).toEqual(EXPECTED_DARK_PALETTE);
      expect(styles.getPropertyValue('--dx-chart-edge').trim()).toBe(DARK_BODY_BG);
    } finally {
      document.documentElement.removeAttribute('data-bs-theme');
    }
  });

  it('the dark Sass list keeps the hue-slot order of the light list', () => {
    const darkLine = themeScssSource.match(/\$dx-chart-palette-dark:\s*\(([^)]*)\)/);
    expect(darkLine).not.toBeNull();
    const scssHexes = darkLine![1].match(/#[0-9a-fA-F]{3,8}/g);
    expect(scssHexes).toEqual(EXPECTED_DARK_PALETTE);
  });

  it('chartTheme fallbacks match theme.scss $dx-chart-palette', () => {
    // The TS fallbacks only ever run on the SSR/no-CSS path, which no browser
    // test exercises — so drift there is invisible to the two tests above.
    // Guard it by parsing the hexes straight out of the Sass source.
    const scssHexes = sassList('dx-chart-palette');
    expect(scssHexes).toEqual(PALETTE_VARS.map(([, fallback]) => fallback));
    expect(scssHexes).toEqual(EXPECTED_PALETTE);
  });

  it('chartTheme line and edge fallbacks match theme.scss', () => {
    const scssLines = sassList('dx-chart-line-palette');
    expect(scssLines).toEqual(LINE_PALETTE_VARS.map(([, fallback]) => fallback));
    expect(scssLines).toEqual(EXPECTED_LINES);

    const edgeLine = themeScssSource.match(/\$dx-chart-edge:\s*(#[0-9a-fA-F]{3,8})/);
    expect(edgeLine).not.toBeNull();
    expect(edgeLine![1]).toBe(EDGE_VAR[1]);
    expect(EDGE_VAR).toEqual(['--dx-chart-edge', EXPECTED_EDGE]);
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

  it('applyPalette gives a line the darker line shade, fill-coloured points and a 35% wash', () => {
    const [first, second] = applyPalette([{ data: [1] }, { data: [2] }], 'line', 1);
    expect(first.borderColor).toBe(EXPECTED_LINES[0]);
    expect(first.pointBorderColor).toBe(EXPECTED_LINES[0]);
    expect(first.pointBackgroundColor).toBe(EXPECTED_PALETTE[0]);
    expect(first.backgroundColor).toBe(withAlpha(EXPECTED_PALETTE[0], 0.35));
    // Slot order holds for the second series too.
    expect(second.borderColor).toBe(EXPECTED_LINES[1]);
    expect(second.pointBackgroundColor).toBe(EXPECTED_PALETTE[1]);
  });

  it('applyPalette outlines bars and doughnut segments with the 1px edge', () => {
    const [bar] = applyPalette([{ data: [1, 2] }], 'bar', 2);
    expect(bar.backgroundColor).toEqual([EXPECTED_PALETTE[0], EXPECTED_PALETTE[0]]);
    expect(bar.borderColor).toBe(EXPECTED_EDGE);
    expect(bar.borderWidth).toBe(1);

    const [doughnut] = applyPalette([{ data: [1, 2] }], 'doughnut', 2);
    expect(doughnut.backgroundColor).toEqual([EXPECTED_PALETTE[0], EXPECTED_PALETTE[1]]);
    expect(doughnut.borderColor).toBe(EXPECTED_EDGE);
    expect(doughnut.borderWidth).toBe(1);
  });

  it('applyPalette leaves every caller-set colour and width alone', () => {
    const [line] = applyPalette(
      [
        {
          data: [1],
          borderColor: '#010101',
          backgroundColor: '#020202',
          pointBackgroundColor: '#030303',
          pointBorderColor: '#040404',
        },
      ],
      'line',
      1,
    );
    expect(line.borderColor).toBe('#010101');
    expect(line.backgroundColor).toBe('#020202');
    expect(line.pointBackgroundColor).toBe('#030303');
    expect(line.pointBorderColor).toBe('#040404');

    const [bar] = applyPalette([{ data: [1], borderColor: '#050505', borderWidth: 0 }], 'bar', 1);
    expect(bar.borderColor).toBe('#050505');
    expect(bar.borderWidth).toBe(0);

    const [doughnut] = applyPalette(
      [{ data: [1, 2], borderColor: '#060606', borderWidth: 3 }],
      'doughnut',
      2,
    );
    expect(doughnut.borderColor).toBe('#060606');
    expect(doughnut.borderWidth).toBe(3);
    // And the colours it did not set are still themed.
    expect(doughnut.backgroundColor).toEqual([EXPECTED_PALETTE[0], EXPECTED_PALETTE[1]]);
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
