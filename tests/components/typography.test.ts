import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

/**
 * Heading scale and table text. Computed styles from the built dist/style.css
 * (tests/setup.ts), so a theme edit that fails to compile or loses the cascade
 * fails here.
 *
 * Headings are deliberately small and restrained (weight 500, legacy omnitend's
 * weight): before this the scale was 2rem/1.75/1.5/1.25 at weight 600, which
 * every expectation below rejects.
 */
const themeApplied = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--dx-chart-1').trim() !== '';

const waitForTheme = async () => {
  for (let i = 0; i < 150 && !themeApplied(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  expect(themeApplied(), 'theme stylesheet never applied').toBe(true);
};

const rootFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

describe('heading scale', () => {
  // [selector markup, rem, weight]
  const scale: Array<[string, string | null, number, string]> = [
    ['h1', null, 1.25, '500'],
    ['h2', null, 1.15, '500'],
    ['h3', null, 1.05, '500'],
    ['h4', null, 1.05, '500'],
    ['div', 'h1', 1.25, '500'],
    ['div', 'h4', 1.05, '500'],
  ];

  for (const [tag, className, rem, weight] of scale) {
    const label = className ? `.${className}` : `<${tag}>`;
    it(`${label} is ${rem}rem at weight ${weight}`, async () => {
      await waitForTheme();
      const screen = render({ render: () => h(tag, { class: className }, 'Heading') });
      const style = getComputedStyle(screen.container.querySelector(tag)!);
      expect(parseFloat(style.fontSize)).toBeCloseTo(rem * rootFontSize(), 1);
      expect(style.fontWeight).toBe(weight);
    });
  }

  it('keeps h5 and h6 no larger than h4, in the body face', async () => {
    await waitForTheme();
    const screen = render({
      render: () => h('div', [h('h4', 'four'), h('h5', 'five'), h('h6', 'six'), h('p', 'body')]),
    });
    const size = (selector: string) =>
      parseFloat(getComputedStyle(screen.container.querySelector(selector)!).fontSize);
    expect(size('h5')).toBeLessThanOrEqual(size('h4'));
    expect(size('h6')).toBeLessThanOrEqual(size('h5'));
    expect(getComputedStyle(screen.container.querySelector('h5')!).fontFamily).toBe(
      getComputedStyle(screen.container.querySelector('p')!).fontFamily,
    );
  });
});

describe('table text', () => {
  const renderTable = () =>
    render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [{ id: 1, name: 'Alpha' }],
            fields: [
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
            ],
          }),
        ),
    });

  const waitFor = async (read: () => Element | null) => {
    for (let i = 0; i < 150 && !read(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    return read() as HTMLElement;
  };

  it('paints body cells #212529, not pure black', async () => {
    await waitForTheme();
    const screen = renderTable();
    const cell = await waitFor(() => screen.container.querySelector('tbody td'));
    expect(getComputedStyle(cell).color).toBe('rgb(33, 37, 41)');
  });

  it('sets header cells at weight 500 in the header colour token', async () => {
    await waitForTheme();
    const screen = renderTable();
    const header = await waitFor(() => screen.container.querySelector('thead th'));
    const style = getComputedStyle(header);
    expect(style.fontWeight).toBe('500');
    // --dx-table-header-color, #7c8293
    expect(style.color).toBe('rgb(124, 130, 147)');
  });
});
