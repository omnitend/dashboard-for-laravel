/**
 * #161 — chart palette resolution must be theme-REACTIVE and scope-AWARE.
 *
 * Two bugs, both invisible to a "does it render" test:
 *
 *  1. The palette is copied into Chart.js data inside a `computed` whose only
 *     dependencies are component props. A `data-bs-theme` flip changes a DOM
 *     attribute and a computed CSS value — neither is a Vue dependency — so a
 *     MOUNTED chart kept the old palette until a prop changed or it remounted.
 *  2. `getPalette()` always read `document.documentElement`, but Bootstrap
 *     allows `data-bs-theme` on any container, so a dark card on a light page
 *     charted in the ROOT's palette.
 *
 * Every assertion below compares REAL resolved colours before and after, so it
 * cannot pass with either bug present (verified by reverting the fix — see the
 * per-test notes). Asserting "a canvas exists" or "getPalette returns 8 items"
 * would hold in both states and prove nothing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { Chart } from 'chart.js';
// The Sass SOURCE — vitest runs in a real browser, so read files through Vite's
// ?raw import, never node:fs (see CLAUDE.md testing gotchas).
import themeScssSource from '../../resources/css/theme.scss?raw';
import { defineComponent, h, type Component } from 'vue';
import DXBarChart from '../../resources/js/components/charts/DXBarChart.vue';
import DXLineChart from '../../resources/js/components/charts/DXLineChart.vue';
import DXDoughnutChart from '../../resources/js/components/charts/DXDoughnutChart.vue';

// Slot 1 of each shipped palette (theme.scss $dx-chart-palette /
// $dx-chart-palette-dark). Values, not just "different", so a fix that resolved
// *some* other colour would still fail.
const LIGHT_SLOT_1 = '#2563eb';
const DARK_SLOT_1 = '#60a5fa';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The live Chart.js instance for the single canvas inside `container`. */
const chartIn = (container: Element): Chart => {
  const canvas = container.querySelector('canvas');
  expect(canvas).toBeTruthy();
  const chart = Chart.getChart(canvas as HTMLCanvasElement);
  expect(chart).toBeTruthy();
  return chart as Chart;
};

/** Wrap a chart in a plain div carrying arbitrary attributes/styles. */
const wrappedIn = (wrapperProps: Record<string, unknown>, chart: Component, chartProps: Record<string, unknown>) =>
  defineComponent({
    render: () => h('div', wrapperProps, [h(chart, chartProps)]),
  });

const lineProps = { labels: ['A', 'B', 'C'], datasets: [{ label: 'Sales', data: [1, 2, 3] }] };
const barProps = { labels: ['A', 'B'], datasets: [{ label: 'Revenue', data: [1, 2] }] };

afterEach(() => {
  document.documentElement.removeAttribute('data-bs-theme');
});

describe('charts follow a colour-mode change while mounted (#161)', () => {
  // Fail-first: with the palette resolved once inside a props-only computed,
  // the dataset stays on the LIGHT colour after the flip and this rejects.
  it('DXLineChart repaints its stroke when data-bs-theme flips on the root', async () => {
    const screen = render(DXLineChart, { props: lineProps });
    await wait(80);

    expect(chartIn(screen.container).data.datasets[0].borderColor).toBe(LIGHT_SLOT_1);

    document.documentElement.setAttribute('data-bs-theme', 'dark');
    await wait(120);

    expect(chartIn(screen.container).data.datasets[0].borderColor).toBe(DARK_SLOT_1);
  });

  it('DXBarChart repaints its bars when data-bs-theme flips on the root', async () => {
    const screen = render(DXBarChart, { props: barProps });
    await wait(80);

    // A single dataset over several labels gets one colour PER BAR.
    expect(chartIn(screen.container).data.datasets[0].backgroundColor).toEqual([
      LIGHT_SLOT_1,
      LIGHT_SLOT_1,
    ]);

    document.documentElement.setAttribute('data-bs-theme', 'dark');
    await wait(120);

    expect(chartIn(screen.container).data.datasets[0].backgroundColor).toEqual([
      DARK_SLOT_1,
      DARK_SLOT_1,
    ]);
  });

  // DXDoughnutChart does NOT share useThemedChart, so it needs its own cover —
  // the fix could easily land on the shared seam only and leave this red.
  it('DXDoughnutChart repaints its slices when data-bs-theme flips on the root', async () => {
    const screen = render(DXDoughnutChart, { props: { labels: ['A', 'B'], data: [5, 3] } });
    await wait(80);

    expect((chartIn(screen.container).data.datasets[0].backgroundColor as string[])[0]).toBe(
      LIGHT_SLOT_1,
    );

    document.documentElement.setAttribute('data-bs-theme', 'dark');
    await wait(120);

    expect((chartIn(screen.container).data.datasets[0].backgroundColor as string[])[0]).toBe(
      DARK_SLOT_1,
    );
  });
});

describe('charts resolve the palette from their own colour-mode scope (#161)', () => {
  // Fail-first: reading document.documentElement gives the LIGHT palette here,
  // because the root has no data-bs-theme — only the wrapper does.
  it('a chart inside a nested data-bs-theme=dark container uses the DARK palette', async () => {
    const Nested = wrappedIn({ 'data-bs-theme': 'dark' }, DXLineChart, lineProps);
    const screen = render(Nested);
    await wait(120);

    expect(document.documentElement.hasAttribute('data-bs-theme')).toBe(false); // root is light
    expect(chartIn(screen.container).data.datasets[0].borderColor).toBe(DARK_SLOT_1);
  });

  it('DXDoughnutChart inside a nested dark container uses the DARK palette', async () => {
    const Nested = wrappedIn({ 'data-bs-theme': 'dark' }, DXDoughnutChart, {
      labels: ['A', 'B'],
      data: [5, 3],
    });
    const screen = render(Nested);
    await wait(120);

    expect((chartIn(screen.container).data.datasets[0].backgroundColor as string[])[0]).toBe(
      DARK_SLOT_1,
    );
  });

  // The general property behind fix (2), independent of any stylesheet: the
  // variables are read from the CONTAINER's computed style, so a per-container
  // override (a documented retheming hook) wins over the root's value. This is
  // also the light-scope-under-a-dark-root direction, expressed without
  // depending on the prebuilt dist/style.css carrying the new
  // `[data-bs-theme=light]` rule (the CSS side is guarded from source below).
  it('a per-container --dx-chart-* override beats the document root', async () => {
    const SENTINEL = 'rgb(1, 2, 3)';
    document.documentElement.setAttribute('data-bs-theme', 'dark');

    const Overridden = wrappedIn({ style: { '--dx-chart-1': SENTINEL } }, DXLineChart, lineProps);
    const screen = render(Overridden);
    await wait(120);

    const resolved = chartIn(screen.container).data.datasets[0].borderColor;
    expect(resolved).toBe(SENTINEL);
    expect(resolved).not.toBe(DARK_SLOT_1); // i.e. not the root's palette
  });
});

describe('a LIGHT scope nested under a dark root resolves the light palette (#161)', () => {
  /*
   * The end-to-end half of the light-scope rule below. It needs BOTH sides of
   * the fix at once: the runtime resolving from the container, AND the built
   * stylesheet carrying `[data-bs-theme="light"]`. Custom properties inherit,
   * so without that CSS block a light container under a dark root keeps the
   * DARK values however correctly the JS reads its scope.
   *
   * That dependency on the BUILT `dist/style.css` (loaded by tests/setup.ts) is
   * why this assertion is separate from the ones above: it can only pass once
   * `dist` has been rebuilt from the current Sass. If this goes red with the
   * source-level guard below still green, suspect a stale `dist` before
   * suspecting the code — rebuild with `npm run build:lib` and re-run. (Local
   * runs skip the pretest build entirely, see CLAUDE.md on `ignore-scripts`.)
   */
  it('a chart in a nested data-bs-theme=light container ignores the dark root', async () => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');

    const Nested = wrappedIn({ 'data-bs-theme': 'light' }, DXLineChart, lineProps);
    const screen = render(Nested);
    await wait(120);

    const resolved = chartIn(screen.container).data.datasets[0].borderColor;
    expect(resolved).toBe(LIGHT_SLOT_1);
    // Named explicitly: inheriting the root's dark value is the exact bug.
    expect(resolved).not.toBe(DARK_SLOT_1);
  });
});

describe('theme.scss publishes the palette in a light scope too (#161)', () => {
  // The runtime fix alone isn't enough for a LIGHT container nested under a
  // dark root: custom properties inherit, so the `[data-bs-theme=dark]` block
  // would still supply the values. Only `:root` declared the light set, so the
  // stylesheet needs a matching light-scope block. Asserted against the Sass
  // SOURCE because the test environment loads the prebuilt dist/style.css,
  // which may predate this change.
  it('declares --dx-chart-* under [data-bs-theme="light"] from the LIGHT list', () => {
    const lightBlock = themeScssSource.match(/\[data-bs-theme="light"\]\s*\{([\s\S]*?)\n\}/);
    expect(lightBlock).not.toBeNull();

    const body = lightBlock![1];
    expect(body).toContain('--dx-chart-#{$i}');
    // The light list, NOT the dark one — a copy-paste slip here would ship the
    // dark palette to every light-scoped container.
    expect(body).toContain('list.nth($dx-chart-palette, $i)');
    expect(body).not.toContain('$dx-chart-palette-dark');
  });
});
