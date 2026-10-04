import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DBadge from '../../resources/js/components/base/DBadge.vue';
import DButton from '../../resources/js/components/base/DButton.vue';

/**
 * The `pending` variant: waiting, and the next move is not yours ("awaiting
 * payment", "sent to printer, not yet confirmed"). A violet from the chart
 * lavender, distinct from info's slate blue. It has to work everywhere the
 * $dx-variants loop and Bootstrap's own variant maps paint, so each surface is
 * checked by its painted colour. Before the variant existed every class below
 * matched no rule and painted transparent or the inherited text colour.
 */
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const SOFT_BG = '#e3d3fb';
const SOFT_TEXT = '#3b1a80';
const EMPHASIS = '#6a43c4';
// color.mix(#fff, soft-bg, 70%) and color.scale(soft-bg, $lightness: -10%)
const SUBTLE_BG: [number, number, number] = [246.6, 241.8, 253.8];
const SUBTLE_BORDER: [number, number, number] = [200.05, 168.65, 247.15];

const themeApplied = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--dx-chart-1').trim() !== '';

const TRANSPARENT = new Set(['rgba(0, 0, 0, 0)', 'transparent', '']);

const painted = async (markup: () => any, selector: string, needsBackground = true) => {
  const screen = render({ render: () => h(BApp, {}, markup) });
  let element: HTMLElement | null = null;
  for (let i = 0; i < 150; i++) {
    element = screen.container.querySelector(selector) as HTMLElement | null;
    if (
      element &&
      themeApplied() &&
      (!needsBackground || !TRANSPARENT.has(getComputedStyle(element).backgroundColor))
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  expect(element, `nothing matched ${selector}`).not.toBeNull();
  return getComputedStyle(element!);
};

const expectColourNear = (actual: string, expected: [number, number, number]) => {
  const parsed = (actual.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  expect(parsed.length, `could not parse "${actual}"`).toBe(3);
  parsed.forEach((value, index) => {
    expect(Math.abs(value - expected[index]), `${actual} vs rgb(${expected})`).toBeLessThanOrEqual(0.5);
  });
};

describe('the pending variant', () => {
  it('paints a pending badge in the soft violet pair', async () => {
    const style = await painted(() => h(DBadge, { variant: 'pending' }, () => 'Awaiting payment'), '.badge');
    expect(style.backgroundColor).toBe(rgb(SOFT_BG));
    expect(style.color).toBe(rgb(SOFT_TEXT));
  });

  it('paints a pending button soft, not solid', async () => {
    const style = await painted(() => h(DButton, { variant: 'pending' }, () => 'Pending'), '.btn');
    expect(style.backgroundColor).toBe(rgb(SOFT_BG));
    expect(style.color).toBe(rgb(SOFT_TEXT));
  });

  it('paints an outline pending button in the emphasis shade', async () => {
    const style = await painted(
      () => h(DButton, { variant: 'outline-pending' }, () => 'Pending'),
      '.btn',
      false,
    );
    expect(style.color).toBe(rgb(EMPHASIS));
    expect(style.borderTopColor).toBe(rgb(EMPHASIS));
  });

  it('paints a pending alert with the subtle tint, subtle border and soft text', async () => {
    const style = await painted(() => h('div', { class: 'alert alert-pending' }, 'x'), '.alert');
    expectColourNear(style.backgroundColor, SUBTLE_BG);
    expectColourNear(style.borderTopColor, SUBTLE_BORDER);
    expect(style.color).toBe(rgb(SOFT_TEXT));
  });

  it('gives .text-pending the emphasis shade and .text-pending-emphasis the soft text', async () => {
    const text = await painted(() => h('span', { class: 'text-pending' }, 'x'), 'span', false);
    expect(text.color).toBe(rgb(EMPHASIS));
    const emphasis = await painted(
      () => h('span', { class: 'text-pending-emphasis' }, 'x'),
      'span',
      false,
    );
    expect(emphasis.color).toBe(rgb(SOFT_TEXT));
  });

  it('generates the subtle utilities, table row and list-group item', async () => {
    expectColourNear(
      (await painted(() => h('span', { class: 'bg-pending-subtle' }, 'x'), 'span')).backgroundColor,
      SUBTLE_BG,
    );
    const bordered = await painted(
      () => h('div', { class: 'border border-pending-subtle bg-white' }, 'x'),
      'div.border',
    );
    expectColourNear(bordered.borderTopColor, SUBTLE_BORDER);
    expectColourNear(
      (
        await painted(
          () =>
            h('table', { class: 'table' }, [
              h('tbody', [h('tr', { class: 'table-pending' }, [h('td', 'x')])]),
            ]),
          'td',
        )
      ).backgroundColor,
      SUBTLE_BG,
    );
    expectColourNear(
      (
        await painted(
          () => h('ul', { class: 'list-group' }, [h('li', { class: 'list-group-item list-group-item-pending' }, 'x')]),
          'li',
        )
      ).backgroundColor,
      SUBTLE_BG,
    );
  });

  it('gives a themed pending toast the same 50% mix as the other toasts', async () => {
    const style = await painted(
      () => h('div', { class: 'toast toast-pending show' }, [h('div', { class: 'toast-body' }, 'x')]),
      '.toast',
    );
    // color.mix(#e3d3fb, #fff, 50%)
    expectColourNear(style.backgroundColor, [241, 233, 253]);
  });
});
