import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
// The BUILT component and stylesheet (setup.ts loads dist/style.css): the
// value's size comes from a scoped rule, and scoped rules are only proven
// once they survive the production build (see scoped-deep-styles.test.ts).
// Rebuild (`npm run build:lib`) before running this after a style change.
import { DXStatCard } from '../../dist/dashboard-for-laravel.js';

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  while (mounted.length > 0) mounted.pop()!.unmount();
});

const mount = (renderFn: () => ReturnType<typeof h>) => {
  const screen = render({ render: renderFn });
  mounted.push(screen);
  return screen;
};

/** How many lines the value's text occupies (one rect per line box). */
const lineCount = (element: Element): number => {
  const range = document.createRange();
  range.selectNodeContents(element);
  const tops = new Set(
    Array.from(range.getClientRects())
      .filter((rect) => rect.width > 0)
      .map((rect) => Math.round(rect.top)),
  );
  return tops.size;
};

/** The text's own right edge against the card's inner (padding) edge. */
const overflowsCard = (value: Element): boolean => {
  const card = value.closest('.dx-stat-card')!;
  const cardRect = card.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(value);
  const textRect = range.getBoundingClientRect();
  const paddingRight = parseFloat(getComputedStyle(card.querySelector('.card-body')!).paddingRight);
  return textRect.right > cardRect.right - paddingRight + 0.5;
};

const values = (container: Element) =>
  Array.from(container.querySelectorAll('.dx-stat-card__value'));

describe('DXStatCard value fits its card (#213)', () => {
  it('keeps the value on one line, inside the card, two cards to a 390px phone row', async () => {
    // A 390px viewport less the dashboard's 16px phone gutters: two
    // Bootstrap col-6 columns, as a dashboard's KPI row lays them out.
    const screen = mount(() =>
      h('div', { style: 'width: 358px' }, [
        h('div', { class: 'row g-3' }, [
          h('div', { class: 'col-6' }, [
            h(DXStatCard, { title: 'Revenue', value: 7997.55, format: 'currency' }),
          ]),
          h('div', { class: 'col-6' }, [
            h(DXStatCard, { title: 'Takings', value: 12345.67, format: 'currency' }),
          ]),
        ]),
      ]),
    );
    await document.fonts.ready;
    await settle();

    const [first, second] = values(screen.container);
    expect(first!.textContent?.trim()).toBe('£7,997.55');
    for (const value of [first!, second!]) {
      expect(lineCount(value)).toBe(1);
      expect(overflowsCard(value)).toBe(false);
      const fontSize = parseFloat(getComputedStyle(value).fontSize);
      // Shrunk below 28px, but still clearly the card's dominant number.
      expect(fontSize).toBeLessThan(28);
      expect(fontSize).toBeGreaterThanOrEqual(18);
    }
  });

  it('leaves a wide card at 1.75rem (28px)', async () => {
    const screen = mount(() =>
      h('div', { style: 'width: 600px' }, [
        h(DXStatCard, { title: 'Revenue', value: 7997.55, format: 'currency' }),
      ]),
    );
    await settle();
    const [value] = values(screen.container);
    expect(getComputedStyle(value!).fontSize).toBe('28px');
    // The lone card still fills its container, as before the container query.
    const card = screen.container.querySelector('.dx-stat-card')!;
    expect(card.getBoundingClientRect().width).toBeCloseTo(600, 0);
  });

  it('gives a content-sized card room for its value (inline-size containment fallback)', async () => {
    // Non-growing flex items size to their content. The value box's
    // containment drops the value from that measurement, so without an
    // intrinsic fallback the card would take its title's width.
    const screen = mount(() =>
      h('div', { style: 'display: flex; gap: 16px; width: 900px; align-items: flex-start' }, [
        h(DXStatCard, { title: 'Net', value: 7997.55, format: 'currency' }),
        h(DXStatCard, { title: 'Orders', value: 42 }),
      ]),
    );
    await document.fonts.ready;
    await settle();
    for (const value of values(screen.container)) {
      expect(lineCount(value)).toBe(1);
      expect(overflowsCard(value)).toBe(false);
    }
  });

  it('fits a 7-figure currency value in a content-sized card (flex item, inline-block)', async () => {
    // Measured on the 0.45 build: the value box fell back to 6rem (96px),
    // and "£1,234,567.89" at the 18px floor is 6.64em (119.6px), so it ran
    // 23.6px past the box into the padding.
    const screen = mount(() =>
      h('div', [
        h('div', { style: 'display: flex; gap: 16px; width: 900px; align-items: flex-start' }, [
          h(DXStatCard, { title: 'Net', value: 1234567.89, format: 'currency' }),
        ]),
        h('div', { style: 'display: inline-block' }, [
          h(DXStatCard, { title: 'Net', value: 1234567.89, format: 'currency' }),
        ]),
      ]),
    );
    await document.fonts.ready;
    await settle();
    const found = values(screen.container);
    expect(found.length).toBe(2);
    for (const value of found) {
      expect(value.textContent?.trim()).toBe('£1,234,567.89');
      expect(lineCount(value)).toBe(1);
      expect(overflowsCard(value)).toBe(false);
    }
  });

  it('fits a 7-figure currency value two cards to a 390px phone row', async () => {
    // 121px value boxes. Measured on the 0.45 build: 19.36px (16cqi), so
    // the 6.64em value was 128.6px and sat 7.6px in the padding.
    const screen = mount(() =>
      h('div', { style: 'width: 358px' }, [
        h('div', { class: 'row g-3' }, [
          h('div', { class: 'col-6' }, [
            h(DXStatCard, { title: 'Revenue', value: 1234567.89, format: 'currency' }),
          ]),
          h('div', { class: 'col-6' }, [
            h(DXStatCard, { title: 'Takings', value: 7654321.09, format: 'currency' }),
          ]),
        ]),
      ]),
    );
    await document.fonts.ready;
    await settle();
    for (const value of values(screen.container)) {
      expect(lineCount(value)).toBe(1);
      expect(overflowsCard(value)).toBe(false);
      expect(parseFloat(getComputedStyle(value).fontSize)).toBeGreaterThanOrEqual(18);
    }
  });

  it('keeps 1.75rem from a 175px value box up, and shrinks just below it', async () => {
    // The card's border and body padding take 50px, so a 225px card has a
    // 175px value box (asserted, so the boundary is really the one tested).
    const screen = mount(() =>
      h('div', [
        h('div', { style: 'width: 225px' }, [h(DXStatCard, { title: 'At', value: 42 })]),
        h('div', { style: 'width: 400px' }, [h(DXStatCard, { title: 'Wide', value: 42 })]),
        h('div', { style: 'width: 220px' }, [h(DXStatCard, { title: 'Below', value: 42 })]),
      ]),
    );
    await settle();
    const [at, wide, below] = values(screen.container);
    expect(at!.parentElement!.getBoundingClientRect().width).toBeCloseTo(175, 0);
    expect(getComputedStyle(at!).fontSize).toBe('28px');
    expect(getComputedStyle(wide!).fontSize).toBe('28px');
    expect(parseFloat(getComputedStyle(below!).fontSize)).toBeLessThan(28);
  });

  it('never splits a numeric value mid-figure, even when it overflows', async () => {
    // An 8-figure amount does not fit a 390px phone row's card (documented
    // limit): it must overflow on one line rather than break between digits,
    // whether passed as a number or as a preformatted string.
    const screen = mount(() =>
      h('div', { style: 'width: 358px' }, [
        h('div', { class: 'row g-3' }, [
          h('div', { class: 'col-6' }, [
            h(DXStatCard, { title: 'Revenue', value: 12345678.9, format: 'currency' }),
          ]),
          h('div', { class: 'col-6' }, [
            h(DXStatCard, { title: 'Preformatted', value: '£12,345,678.90' }),
          ]),
        ]),
      ]),
    );
    await document.fonts.ready;
    await settle();
    for (const value of values(screen.container)) expect(lineCount(value)).toBe(1);
  });

  it('breaks an unbreakable text value (a URL) rather than running out of the card', async () => {
    // The numeric no-split rule must not reach strings: before it was
    // scoped, a URL ran 219px out of a 170px card.
    const screen = mount(() =>
      h('div', { style: 'width: 170px' }, [
        h(DXStatCard, {
          title: 'Top page',
          value: 'https://example.com/reports/quarterly/summary',
        }),
      ]),
    );
    await document.fonts.ready;
    await settle();
    const [value] = values(screen.container);
    expect(lineCount(value!)).toBeGreaterThan(1);
    expect(overflowsCard(value!)).toBe(false);
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
