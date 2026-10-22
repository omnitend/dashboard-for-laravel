/**
 * Input groups on a narrow screen (below md, 768px).
 *
 * The theme makes every `.input-group` `flex-wrap: nowrap`, so an affix and its
 * input never come apart. Below md, a group with two or more controls (a filter
 * bar's "Date range [date] [date]") wraps instead: the label takes its own row
 * and the controls sit beneath it as separate controls. Without that, a
 * shrink-to-fit group in a filter bar ran off a phone screen, and an app shell
 * that clips sideways overflow left the last control unreachable.
 *
 * A one-control group (search + button, "£" + amount) stays one joined control
 * at every width, and nothing changes from md up. Both are asserted here so the
 * phone rule cannot quietly spread.
 *
 * NOTE: the rules live in theme.scss and reach the tests through the BUILT
 * dist/style.css (tests/setup.ts): `npm run build:lib` first.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DInputGroup from '../../resources/js/components/base/DInputGroup.vue';
import DFormInput from '../../resources/js/components/base/DFormInput.vue';
import DButton from '../../resources/js/components/base/DButton.vue';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const settled = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/**
 * A filter bar like greendragon's: a wrapping flex row whose `w-auto` group
 * sizes to its content, inside a shell that clips sideways overflow.
 */
const mountShape = async (shape: 'date-range' | 'search' | 'currency') => {
  const group = () => {
    if (shape === 'date-range') {
      return h(DInputGroup, { prepend: 'Date range', class: 'w-auto' }, () => [
        h(DFormInput, { type: 'date' }),
        h(DFormInput, { type: 'date' }),
      ]);
    }
    if (shape === 'search') {
      return h(
        DInputGroup,
        {},
        {
          default: () => h(DFormInput, { placeholder: 'Search products' }),
          append: () => h(DButton, { variant: 'primary' }, () => 'Search'),
        },
      );
    }
    return h(DInputGroup, { prepend: '£' }, () => h(DFormInput, { modelValue: '12.50' }));
  };
  const screen = render({
    render: () =>
      h('div', { class: 'shell', style: 'overflow-x: hidden; padding: 16px' }, [
        h('div', { class: 'd-flex flex-wrap gap-2' }, [group()]),
      ]),
  });
  await settled();
  const shell = screen.container.querySelector('.shell') as HTMLElement;
  const groupEl = screen.container.querySelector('.input-group') as HTMLElement;
  const children = Array.from(groupEl.children) as HTMLElement[];
  return { shell, groupEl, children };
};

const rowsOf = (elements: HTMLElement[]) =>
  new Set(elements.map((element) => Math.round(element.getBoundingClientRect().top))).size;

const style = (element: Element) => getComputedStyle(element);

describe('DInputGroup below md', () => {
  afterEach(async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height);
  });

  it('wraps a label + two date inputs so every control is on screen', async () => {
    await page.viewport(PHONE.width, PHONE.height);
    const { shell, groupEl, children } = await mountShape('date-range');
    const [label, start, end] = children;

    expect(children).toHaveLength(3);
    expect(label.classList.contains('input-group-text')).toBe(true);
    expect(style(groupEl).flexWrap).toBe('wrap');

    // Reachable: nothing ends past the shell's content edge.
    const shellRight = shell.getBoundingClientRect().right - parseFloat(style(shell).paddingRight);
    for (const child of children) {
      expect(child.getBoundingClientRect().right).toBeLessThanOrEqual(shellRight + 0.5);
    }

    // The label has its own row; both dates share the row beneath it.
    expect(rowsOf([label, start])).toBe(2);
    expect(rowsOf([start, end])).toBe(1);

    // Separate controls: no -1px overlap, every corner rounded again.
    for (const control of [start, end]) {
      expect(style(control).marginLeft).toBe('0px');
      expect(parseFloat(style(control).borderTopLeftRadius)).toBeGreaterThan(0);
      expect(parseFloat(style(control).borderTopRightRadius)).toBeGreaterThan(0);
    }
    expect(parseFloat(style(label).borderTopRightRadius)).toBeGreaterThan(0);
  });

  it('keeps a search box and its button joined on one row', async () => {
    await page.viewport(PHONE.width, PHONE.height);
    const { groupEl, children } = await mountShape('search');
    const [input, button] = children;

    expect(style(groupEl).flexWrap).toBe('nowrap');
    expect(rowsOf(children)).toBe(1);
    expect(style(button).marginLeft).toBe('-1px');
    expect(style(input).borderTopRightRadius).toBe('0px');
    expect(style(button).borderTopLeftRadius).toBe('0px');
  });

  it('keeps a "£" prefix joined to its amount', async () => {
    await page.viewport(PHONE.width, PHONE.height);
    const { groupEl, children } = await mountShape('currency');
    const [prefix, amount] = children;

    expect(style(groupEl).flexWrap).toBe('nowrap');
    expect(rowsOf(children)).toBe(1);
    expect(style(amount).marginLeft).toBe('-1px');
    expect(style(prefix).borderTopRightRadius).toBe('0px');
  });
});

describe('DInputGroup from md up', () => {
  it('keeps a label + two date inputs as one joined control', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height);
    const { groupEl, children } = await mountShape('date-range');
    const [label, start, end] = children;

    expect(style(groupEl).flexWrap).toBe('nowrap');
    expect(rowsOf(children)).toBe(1);
    expect(style(start).marginLeft).toBe('-1px');
    expect(style(end).marginLeft).toBe('-1px');
    expect(style(label).borderTopRightRadius).toBe('0px');
    expect(style(start).borderTopRightRadius).toBe('0px');
  });
});
