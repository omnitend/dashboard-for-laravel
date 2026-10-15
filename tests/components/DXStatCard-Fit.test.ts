import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-vue';
import { createSSRApp, h, nextTick, ref, type App } from 'vue';
import { renderToString } from 'vue/server-renderer';
// A face no other test loads, so its load (and the refit it must trigger)
// happens inside the font test.
import lateFaceUrl from '../../resources/fonts/poppins/Poppins-SemiBold.woff2?url';
// The BUILT component and stylesheet (setup.ts loads dist/style.css): the
// value's size comes from a scoped rule plus the component's fit script,
// and both are only proven once they survive the production build (see
// scoped-deep-styles.test.ts). Rebuild (`npm run build:lib`) before running
// this after a change.
import { DXStatCard } from '../../dist/dashboard-for-laravel.js';

const MAX_PX = 28;
const FLOOR_PX = 18;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Fonts settled, then two frames (a resize refits in the next frame). */
const settle = async () => {
  await document.fonts.ready;
  await nextFrame();
  await nextFrame();
  await new Promise((resolve) => setTimeout(resolve, 30));
};

const mounted: Array<{ unmount: () => void }> = [];

// A fit inside a ResizeObserver delivery would change the box's height and
// raise "ResizeObserver loop completed with undelivered notifications".
// Every test fails on one, and on any console error.
let windowErrors: string[] = [];
const recordError = (event: ErrorEvent) => windowErrors.push(String(event.message));
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  windowErrors = [];
  window.addEventListener('error', recordError);
  consoleError = vi.spyOn(console, 'error');
});

afterEach(() => {
  while (mounted.length > 0) mounted.pop()!.unmount();
  window.removeEventListener('error', recordError);
  const consoleMessages = consoleError.mock.calls.map((call) => String(call[0]));
  consoleError.mockRestore();
  expect(windowErrors).toEqual([]);
  expect(consoleMessages).toEqual([]);
});

const mount = (renderFn: () => ReturnType<typeof h>) => {
  const screen = render({ render: renderFn });
  mounted.push(screen);
  return screen;
};

/**
 * How many lines the value's content occupies. Rects are grouped by their
 * vertical middle, so an inline element (a badge in the `value` slot) on
 * the same line as the text, with its own top, counts once.
 */
const lineCount = (element: Element): number => {
  const range = document.createRange();
  range.selectNodeContents(element);
  const halfLine = parseFloat(getComputedStyle(element).fontSize) * 0.5;
  const middles = Array.from(range.getClientRects())
    .filter((rect) => rect.width > 0)
    .map((rect) => rect.top + rect.height / 2)
    .sort((a, b) => a - b);
  let lines = 0;
  let lineMiddle = -Infinity;
  for (const middle of middles) {
    if (middle - lineMiddle > halfLine) {
      lines += 1;
      lineMiddle = middle;
    }
  }
  return lines;
};

/** The rendered content's own box (text and any slot elements). */
const contentRect = (value: Element): DOMRect => {
  const range = document.createRange();
  range.selectNodeContents(value);
  return range.getBoundingClientRect();
};

/** How far (px) the value's content runs past its box's right edge. */
const overflowPx = (value: Element): number =>
  contentRect(value).right - value.parentElement!.getBoundingClientRect().right;

const boxWidth = (value: Element): number => value.parentElement!.getBoundingClientRect().width;

const fontSize = (element: Element): number => parseFloat(getComputedStyle(element).fontSize);

/**
 * The fit's contract, independent of glyph metrics (CI rasterises on
 * Linux): a value above the floor never overflows its box, and one that
 * was shrunk below 1.75rem fills it, within a pixel.
 */
const expectFitted = (value: Element) => {
  const size = fontSize(value);
  expect(size).toBeGreaterThanOrEqual(FLOOR_PX);
  expect(size).toBeLessThanOrEqual(MAX_PX);
  expect(lineCount(value)).toBe(1);
  if (size > FLOOR_PX + 0.01) expect(overflowPx(value)).toBeLessThanOrEqual(0.5);
  if (size < MAX_PX && size > FLOOR_PX + 0.01) {
    expect(contentRect(value).width).toBeGreaterThan(boxWidth(value) - 1);
  }
};

const values = (container: Element) =>
  Array.from(container.querySelectorAll('.dx-stat-card__value'));

/**
 * A 1024px window with a 280px sidebar and the dashboard's 20px gutters
 * leaves 704px; four Bootstrap col-3 columns (g-3) make 164px cards, whose
 * value boxes are 114px (the card's border and padding take 50px).
 */
const fourUpAt1024 = (cards: Array<Record<string, unknown>>) =>
  h('div', { style: 'width: 704px' }, [
    h(
      'div',
      { class: 'row g-3' },
      cards.map((props) => h('div', { class: 'col-3' }, [h(DXStatCard, props)])),
    ),
  ]);

const phoneRow = (cards: Array<Record<string, unknown>>) =>
  // A 390px viewport less the dashboard's 16px phone gutters: two col-6
  // columns, as a dashboard's KPI row lays them out (121px value boxes).
  h('div', { style: 'width: 358px' }, [
    h(
      'div',
      { class: 'row g-3' },
      cards.map((props) => h('div', { class: 'col-6' }, [h(DXStatCard, props)])),
    ),
  ]);

describe('DXStatCard value fits its content (#213)', () => {
  it('keeps short values at 1.75rem four to a row at 1024px with the sidebar open', async () => {
    // The width-driven clamp set these at 18px in a 114px box.
    const screen = mount(() =>
      fourUpAt1024([
        { title: 'Orders', value: 42 },
        { title: 'Visits', value: 1000 },
        { title: 'Net', value: 7997.55, format: 'currency' },
        { title: 'Rate', value: 12.5, format: 'percent', precision: 1 },
      ]),
    );
    await settle();
    const [orders, visits, net, rate] = values(screen.container);
    expect(boxWidth(orders!)).toBeCloseTo(114, 0);
    expect(visits!.textContent?.trim()).toBe('1,000');
    for (const short of [orders!, visits!, rate!]) {
      expect(fontSize(short)).toBe(MAX_PX);
      expect(overflowPx(short)).toBeLessThanOrEqual(0.5);
    }
    // The long one shrinks, just enough.
    expect(fontSize(net!)).toBeLessThan(MAX_PX);
    expectFitted(net!);
  });

  it('is fitted before the first frame after a client-side mount (no jump)', async () => {
    const screen = mount(() =>
      fourUpAt1024([
        { title: 'Orders', value: 42 },
        { title: 'Net', value: 7997.55, format: 'currency' },
      ]),
    );
    // rAF callbacks run before the frame's paint.
    const [orders, net] = await new Promise<Element[]>((resolve) =>
      requestAnimationFrame(() => {
        const found = values(screen.container);
        resolve(found);
      }),
    );
    expect(fontSize(orders!)).toBe(MAX_PX);
    expect(overflowPx(net!)).toBeLessThanOrEqual(0.5);
  });

  it('leaves a wide card at 1.75rem (28px), filling its container', async () => {
    const screen = mount(() =>
      h('div', { style: 'width: 600px' }, [
        h(DXStatCard, { title: 'Revenue', value: 7997.55, format: 'currency' }),
      ]),
    );
    await settle();
    const [value] = values(screen.container);
    expect(fontSize(value!)).toBe(MAX_PX);
    const card = screen.container.querySelector('.dx-stat-card')!;
    expect(card.getBoundingClientRect().width).toBeCloseTo(600, 0);
  });

  it('keeps a short value at 1.75rem in every box, and shrinks a long one only when it overflows', async () => {
    // 225px cards have 175px value boxes; 170px cards 120px ones.
    const screen = mount(() =>
      h('div', [
        h('div', { style: 'width: 225px' }, [h(DXStatCard, { title: 'At', value: 42 })]),
        h('div', { style: 'width: 400px' }, [h(DXStatCard, { title: 'Wide', value: 42 })]),
        h('div', { style: 'width: 170px' }, [h(DXStatCard, { title: 'Narrow', value: 42 })]),
        h('div', { style: 'width: 225px' }, [
          h(DXStatCard, { title: 'Long', value: 1234567.89, format: 'currency' }),
        ]),
        h('div', { style: 'width: 400px' }, [
          h(DXStatCard, { title: 'Long wide', value: 1234567.89, format: 'currency' }),
        ]),
      ]),
    );
    await settle();
    const [at, wide, narrow, long, longWide] = values(screen.container);
    expect(boxWidth(at!)).toBeCloseTo(175, 0);
    expect(boxWidth(narrow!)).toBeCloseTo(120, 0);
    for (const short of [at!, wide!, narrow!]) expect(fontSize(short)).toBe(MAX_PX);
    // "£1,234,567.89" is about 186px at 28px: over a 175px box, under 350px.
    expect(fontSize(long!)).toBeLessThan(MAX_PX);
    expectFitted(long!);
    expect(fontSize(longWide!)).toBe(MAX_PX);
  });

  it('keeps 4- and 5-figure money on one line, inside the card, two cards to a 390px phone row', async () => {
    const screen = mount(() =>
      phoneRow([
        { title: 'Revenue', value: 7997.55, format: 'currency' },
        { title: 'Takings', value: 12345.67, format: 'currency' },
      ]),
    );
    await settle();
    const [first, second] = values(screen.container);
    expect(first!.textContent?.trim()).toBe('£7,997.55');
    for (const value of [first!, second!]) {
      expect(fontSize(value)).toBeLessThan(MAX_PX);
      expectFitted(value);
    }
  });

  it('fits a 7-figure currency value two cards to a 390px phone row', async () => {
    const screen = mount(() =>
      phoneRow([
        { title: 'Revenue', value: 1234567.89, format: 'currency' },
        { title: 'Takings', value: 7654321.09, format: 'currency' },
      ]),
    );
    await settle();
    for (const value of values(screen.container)) {
      expect(boxWidth(value)).toBeCloseTo(121, 0);
      expectFitted(value);
      // "£1,234,567.89" is 6.64em: 119.6px at the floor, so it fits above it.
      expect(overflowPx(value)).toBeLessThanOrEqual(0.5);
    }
  });

  it('fits values in a content-sized card (flex item, inline-block), and keeps a short one at 1.75rem', async () => {
    // Inline-size containment drops the value from the card's content size;
    // the box's intrinsic fallback (8rem, 128px) gives it room instead.
    const screen = mount(() =>
      h('div', [
        h('div', { style: 'display: flex; gap: 16px; width: 900px; align-items: flex-start' }, [
          h(DXStatCard, { title: 'Net', value: 1234567.89, format: 'currency' }),
          h(DXStatCard, { title: 'Orders', value: 42 }),
        ]),
        h('div', { style: 'display: inline-block' }, [
          h(DXStatCard, { title: 'Net', value: 1234567.89, format: 'currency' }),
        ]),
      ]),
    );
    await settle();
    const [flexLong, flexShort, inlineLong] = values(screen.container);
    expect(boxWidth(flexLong!)).toBeCloseTo(128, 0);
    for (const value of [flexLong!, inlineLong!]) {
      expect(value.textContent?.trim()).toBe('£1,234,567.89');
      expectFitted(value);
      expect(overflowPx(value)).toBeLessThanOrEqual(0.5);
    }
    expect(fontSize(flexShort!)).toBe(MAX_PX);
  });

  it('refits when the value changes and when the card is resized, both ways', async () => {
    const amount = ref<number>(42);
    const format = ref<'number' | 'currency'>('number');
    const width = ref(164);
    const screen = mount(() =>
      h('div', { style: `width: ${width.value}px` }, [
        h(DXStatCard, { title: 'Net', value: amount.value, format: format.value }),
      ]),
    );
    await settle();
    const [value] = values(screen.container);
    expect(fontSize(value!)).toBe(MAX_PX);

    amount.value = 1234567.89;
    format.value = 'currency';
    await nextTick();
    await settle();
    expect(fontSize(value!)).toBeLessThan(MAX_PX);
    expectFitted(value!);

    width.value = 400;
    await nextTick();
    await settle();
    expect(fontSize(value!)).toBe(MAX_PX);

    width.value = 180;
    await nextTick();
    await settle();
    expect(fontSize(value!)).toBeLessThan(MAX_PX);
    expectFitted(value!);

    amount.value = 3;
    await nextTick();
    await settle();
    expect(fontSize(value!)).toBe(MAX_PX);
  });

  it('survives a burst of resizes without a ResizeObserver loop error', async () => {
    const width = ref(164);
    mount(() =>
      h('div', { style: `width: ${width.value}px` }, [
        h(DXStatCard, { title: 'Net', value: 1234567.89, format: 'currency' }),
      ]),
    );
    for (let step = 0; step < 20; step += 1) {
      width.value = 150 + ((step * 37) % 250);
      await nextTick();
      await nextFrame();
    }
    await settle();
    // The afterEach hook asserts no window or console errors.
  });

  it('fits whatever the value slot renders', async () => {
    // A badge after the amount: about 180px at 28px, in a 150px value box,
    // so it has to shrink but fits above the floor.
    const slotted = mount(() =>
      h('div', { style: 'width: 200px' }, [
        h(
          DXStatCard,
          { title: 'Net', value: 7997.55, format: 'currency' },
          {
            value: ({ formatted }: { formatted: string }) => [
              formatted,
              h('span', { class: 'badge text-bg-secondary ms-1' }, 'est'),
            ],
          },
        ),
      ]),
    );
    await settle();
    const [value] = values(slotted.container);
    expect(value!.querySelector('.badge')).not.toBeNull();
    expect(fontSize(value!)).toBeLessThan(MAX_PX);
    expectFitted(value!);
  });

  it('fits slot content that does not scale with the font (fixed px parts)', async () => {
    // A 40px-wide marker beside the amount: the natural width is not
    // proportional to the font size, so one proportional step overshoots
    // and the verify pass has to shrink again.
    const slotted = mount(() =>
      h('div', { style: 'width: 200px' }, [
        h(
          DXStatCard,
          { title: 'Net', value: 7997.55, format: 'currency' },
          {
            value: ({ formatted }: { formatted: string }) => [
              formatted,
              h('span', { class: 'fit-test-marker', style: 'display: inline-block; width: 40px; height: 4px' }),
            ],
          },
        ),
      ]),
    );
    await settle();
    const [value] = values(slotted.container);
    expect(fontSize(value!)).toBeLessThan(MAX_PX);
    expectFitted(value!);
  });

  it('refits once a web font finishes loading', async () => {
    // Figures in a face that is not loaded yet: the first fit measures the
    // fallback face, and only the font-load refit can make the final size
    // match the face that ends up on screen.
    const face = new FontFace('DX Fit Test Late', `url(${lateFaceUrl})`);
    document.fonts.add(face);
    try {
      expect(face.status).toBe('unloaded');
      const screen = mount(() =>
        h('div', { style: 'width: 180px; --dx-font-family-figures: "DX Fit Test Late"' }, [
          h(DXStatCard, { title: 'Net', value: 1234567.89, format: 'currency' }),
        ]),
      );
      await face.loaded;
      await settle();
      expect(face.status).toBe('loaded');
      const [value] = values(screen.container);
      expect(fontSize(value!)).toBeLessThan(MAX_PX);
      expectFitted(value!);
    } finally {
      document.fonts.delete(face);
    }
  });

  it('measures the bundled faces, not their fallbacks', async () => {
    const screen = mount(() =>
      h('div', { style: 'width: 170px' }, [
        h(DXStatCard, { title: 'Net', value: 1234567.89, format: 'currency' }),
      ]),
    );
    await settle();
    const figures = [...document.fonts].filter(
      (font) => font.family.replace(/"/g, '') === 'DX Figures' && font.weight === '700',
    );
    expect(figures.length).toBeGreaterThan(0);
    expect(figures.some((font) => font.status === 'loaded')).toBe(true);
    expectFitted(values(screen.container)[0]!);
  });

  it('never splits a numeric value mid-figure, even when it overflows at the floor', async () => {
    // 8 figures do not fit a phone row's card (documented limit): they
    // overflow on one line rather than break between digits, whether passed
    // as a number or as a preformatted (letter-free) string.
    const screen = mount(() =>
      phoneRow([
        { title: 'Revenue', value: 12345678.9, format: 'currency' },
        { title: 'Preformatted', value: '£12,345,678.90' },
      ]),
    );
    await settle();
    for (const value of values(screen.container)) {
      expect(lineCount(value)).toBe(1);
      expect(fontSize(value)).toBe(FLOOR_PX);
    }
  });

  it('never shrinks a text value; an unbreakable one (a URL) wraps inside the card', async () => {
    const screen = mount(() =>
      h('div', [
        h('div', { style: 'width: 164px' }, [h(DXStatCard, { title: 'Status', value: 'Healthy' })]),
        h('div', { style: 'width: 170px' }, [
          h(DXStatCard, {
            title: 'Top page',
            value: 'https://example.com/reports/quarterly/summary',
          }),
        ]),
      ]),
    );
    await settle();
    const [status, url] = values(screen.container);
    expect(fontSize(status!)).toBe(MAX_PX);
    expect(fontSize(url!)).toBe(MAX_PX);
    expect(lineCount(url!)).toBeGreaterThan(1);
    expect(overflowPx(url!)).toBeLessThanOrEqual(0.5);
  });

  it('uses tabular figures for the value (#215)', async () => {
    const screen = mount(() =>
      h(DXStatCard, { title: 'Revenue', value: 7997.55, format: 'currency' }),
    );
    await settle();
    const [value] = values(screen.container);
    expect(getComputedStyle(value!).fontVariantNumeric).toContain('tabular-nums');
  });
});

describe('DXStatCard server rendering', () => {
  let app: App | null = null;
  let host: HTMLElement | null = null;

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
  });

  it('renders on the server, then hydrates and fits without a mismatch', async () => {
    const props = { title: 'Orders', value: 42 };
    const serverHtml = await renderToString(createSSRApp(() => h(DXStatCard, props)));
    expect(serverHtml).toContain('dx-stat-card__value--numeric');
    expect(serverHtml).not.toContain('--dx-stat-card-fit-size');

    host = document.createElement('div');
    host.style.width = '164px';
    host.innerHTML = serverHtml;
    document.body.appendChild(host);
    // Server markup before hydration: the CSS baseline (narrow box, 18px).
    expect(fontSize(host.querySelector('.dx-stat-card__value')!)).toBeLessThan(MAX_PX);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    app = createSSRApp(() => h(DXStatCard, props));
    app.mount(host);
    await settle();
    const hydrationWarnings = warn.mock.calls.filter((call) => String(call[0]).includes('Hydration'));
    warn.mockRestore();
    expect(hydrationWarnings).toEqual([]);
    expect(fontSize(host.querySelector('.dx-stat-card__value')!)).toBe(MAX_PX);
  });
});
