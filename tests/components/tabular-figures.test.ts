import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import DXCurrencyInput from '../../resources/js/components/extended/DXCurrencyInput.vue';
// The BUILT stat card: its value's figures face is a scoped rule.
import { DXStatCard } from '../../dist/dashboard-for-laravel.js';

// Tabular figures (#215). The styles under test are global (dist/style.css,
// loaded by setup.ts): rebuild before running this after a theme change.

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const numeric = (element: Element) => getComputedStyle(element).fontVariantNumeric;

/** Width of an element's text itself (not its box). */
const textWidth = (element: Element): number => {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect().width;
};

const spanWidth = (parent: Element, text: string, style: string, className = ''): number => {
  const span = document.createElement('span');
  span.className = className;
  span.setAttribute('style', `${style}; white-space: nowrap`);
  span.textContent = text;
  parent.appendChild(span);
  const width = span.getBoundingClientRect().width;
  span.remove();
  return width;
};

const measurePair = (parent: Element, style: string, className = '') => ({
  ones: spanWidth(parent, '1111', style, className),
  zeros: spanWidth(parent, '0000', style, className),
});

/**
 * Load the figures and body faces before measuring. A face whose
 * unicode-range excludes the text is not loaded by `fonts.load`, so pass
 * digits; the check afterwards proves the load happened.
 */
const loadFigures = async () => {
  for (const weight of [400, 500, 700]) {
    await document.fonts.load(`${weight} 28px 'DX Figures'`, '0123456789');
    await document.fonts.load(`${weight} 28px 'Maven Pro'`, 'abc');
  }
  await document.fonts.ready;
  // `fonts.check` is true when NO face matches, so read the faces instead.
  const loaded = [...document.fonts]
    .filter((face) => face.family.replace(/["']/g, '') === 'DX Figures')
    .filter((face) => face.status === 'loaded')
    .map((face) => face.weight);
  expect(loaded.sort(), 'DX Figures faces loaded').toEqual(['400', '500', '700']);
};

const items = [
  { id: 1, name: 'Ale', price: '£1,111.11' },
  { id: 2, name: 'Stout', price: '£8,000.00' },
];

const columnCells = (container: Element, columnIndex: number) =>
  Array.from(container.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`));

const headerCell = (container: Element, columnIndex: number) =>
  container.querySelectorAll('thead th')[columnIndex]!;

const renderTable = (fields: Record<string, unknown>[]) =>
  render({
    render: () => h(BApp, {}, () => h(DXTable, { items, fields, card: false })),
  });

describe('tabular figures (#215)', () => {
  beforeEach(() => {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('dxtable-perpage-'))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      /* no localStorage in this environment */
    }
  });

  it('ships a global .dx-tabular utility', async () => {
    const element = document.createElement('span');
    element.className = 'dx-tabular';
    element.textContent = '1,234.56';
    document.body.appendChild(element);
    try {
      expect(numeric(element)).toContain('tabular-nums');
    } finally {
      element.remove();
    }
  });

  it('DXCurrencyInput uses tabular figures for the amount', async () => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DXCurrencyInput, { modelValue: 1234.5 })),
    });
    await flush();
    const input = screen.container.querySelector('input')!;
    expect(numeric(input)).toContain('tabular-nums');
  });

  it('a `tabular: true` column gets tabular figures on its cells and header; others do not', async () => {
    const screen = renderTable([
      { key: 'name', label: 'Name' },
      { key: 'price', label: 'Price', tabular: true },
    ]);
    await flush();

    const priceCells = columnCells(screen.container, 1);
    expect(priceCells.length).toBe(2);
    for (const cell of priceCells) expect(numeric(cell)).toContain('tabular-nums');
    expect(numeric(headerCell(screen.container, 1))).toContain('tabular-nums');

    const nameCells = columnCells(screen.container, 0);
    expect(nameCells.length).toBe(2);
    for (const cell of nameCells) expect(numeric(cell)).not.toContain('tabular-nums');
    expect(numeric(headerCell(screen.container, 0))).not.toContain('tabular-nums');
  });

  it('keeps the consumer tdClass/thClass alongside the tabular class (string and array forms)', async () => {
    const screen = renderTable([
      { key: 'name', label: 'Name', tdClass: ['fw-semibold', 'consumer-name'] },
      {
        key: 'price',
        label: 'Price',
        tabular: true,
        tdClass: 'text-end consumer-price',
        thClass: 'text-end',
      },
    ]);
    await flush();

    for (const cell of columnCells(screen.container, 1)) {
      expect(cell.classList.contains('text-end')).toBe(true);
      expect(cell.classList.contains('consumer-price')).toBe(true);
      expect(cell.classList.contains('dx-tabular')).toBe(true);
    }
    const priceHeader = headerCell(screen.container, 1);
    expect(priceHeader.classList.contains('text-end')).toBe(true);
    expect(priceHeader.classList.contains('dx-tabular')).toBe(true);

    for (const cell of columnCells(screen.container, 0)) {
      expect(cell.classList.contains('consumer-name')).toBe(true);
      expect(cell.classList.contains('dx-tabular')).toBe(false);
    }
  });

  it('keeps a function tdClass, called with the cell value, alongside the tabular class', async () => {
    const screen = renderTable([
      { key: 'name', label: 'Name' },
      {
        key: 'price',
        label: 'Price',
        tabular: true,
        tdClass: (value: unknown) => (String(value).startsWith('£8') ? 'is-large' : 'is-small'),
      },
    ]);
    await flush();

    const [first, second] = columnCells(screen.container, 1);
    expect(first!.classList.contains('is-small')).toBe(true);
    expect(second!.classList.contains('is-large')).toBe(true);
    for (const cell of [first!, second!]) expect(cell.classList.contains('dx-tabular')).toBe(true);
  });

  it('lines digits up in the default theme: "1111" and "0000" set to the same width', async () => {
    // The bundled Maven Pro has no `tnum` feature, so the theme takes the
    // digits from DX Figures (IBM Plex Sans, unicode-range 0-9). Measured on
    // the build before it: 52.64px vs 74.59px at 28px/700 in `.dx-tabular`.
    const box = document.createElement('div');
    document.body.appendChild(box);
    const stat = render({
      render: () =>
        h('div', { style: 'display: flex; gap: 1rem; width: 600px' }, [
          h('div', { style: 'flex: 1' }, [h(DXStatCard, { title: 'Ones', value: '1111' })]),
          h('div', { style: 'flex: 1' }, [h(DXStatCard, { title: 'Zeros', value: '0000' })]),
        ]),
    });
    const currency = render({
      render: () => h(BApp, {}, () => h(DXCurrencyInput, { modelValue: 1111 })),
    });
    try {
      await flush();
      await loadFigures();

      // Positive control: the same measurement DOES see Maven Pro's
      // proportional figures, so an equal pair below is not a blind ruler.
      const maven = measurePair(box, 'font-family: "Maven Pro"; font-weight: 700; font-size: 28px');
      expect(maven.zeros - maven.ones).toBeGreaterThan(5);

      for (const weight of [400, 500, 700]) {
        const pair = measurePair(box, `font-weight: ${weight}; font-size: 28px`, 'dx-tabular');
        expect(Math.abs(pair.ones - pair.zeros), `.dx-tabular at ${weight}`).toBeLessThan(0.05);
      }

      // DXStatCard's value (scoped rule, built component): 700 at 28px.
      const [onesValue, zerosValue] = Array.from(
        stat.container.querySelectorAll('.dx-stat-card__value'),
      );
      expect(getComputedStyle(onesValue!).fontSize).toBe(getComputedStyle(zerosValue!).fontSize);
      expect(getComputedStyle(onesValue!).fontWeight).toBe('700');
      const statOnes = textWidth(onesValue!);
      const statZeros = textWidth(zerosValue!);
      expect(statOnes).toBeGreaterThan(20);
      expect(Math.abs(statOnes - statZeros), 'DXStatCard value').toBeLessThan(0.05);

      // DXCurrencyInput: an input's text has no rect, so set the same strings
      // in the input's own resolved font.
      const input = currency.container.querySelector('input')!;
      const style = getComputedStyle(input);
      const inputPair = measurePair(
        box,
        `font-family: ${style.fontFamily}; font-weight: ${style.fontWeight}; ` +
          `font-size: ${style.fontSize}; font-variant-numeric: ${style.fontVariantNumeric}`,
      );
      expect(Math.abs(inputPair.ones - inputPair.zeros), 'DXCurrencyInput').toBeLessThan(0.05);
    } finally {
      box.remove();
      stat.unmount();
      currency.unmount();
    }
  });

  it('takes only the digits from the figures face: £, punctuation and letters stay in Maven Pro', async () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    try {
      await loadFigures();
      for (const text of ['£', 'abc', ',.', 'Total']) {
        const inside = spanWidth(box, text, 'font-size: 28px', 'dx-tabular');
        const outside = spanWidth(box, text, 'font-size: 28px; font-family: "Maven Pro"');
        expect(Math.abs(inside - outside), `"${text}"`).toBeLessThan(0.05);
      }
      // And the digits do NOT come from Maven Pro (else the test above is vacuous).
      const digitsInside = spanWidth(box, '1111', 'font-size: 28px', 'dx-tabular');
      const digitsMaven = spanWidth(box, '1111', 'font-size: 28px; font-family: "Maven Pro"');
      expect(Math.abs(digitsInside - digitsMaven)).toBeGreaterThan(5);
    } finally {
      box.remove();
    }
  });

  it('keeps the display face for letters in or on h1–h4, and the body face in h5', async () => {
    const box = document.createElement('div');
    box.innerHTML = `
      <h2 id="plain">Total</h2>
      <h2 id="nested"><span class="dx-tabular">Total</span></h2>
      <h2 id="on" class="dx-tabular">Total</h2>
      <div class="h3" id="class-plain">Total</div>
      <div class="h3" id="class-nested"><span class="dx-tabular">Total</span></div>
      <h5 id="h5-plain">Total</h5>
      <h5 id="h5-nested"><span class="dx-tabular">Total</span></h5>`;
    document.body.appendChild(box);
    try {
      await loadFigures();
      await document.fonts.load("500 20px 'Poppins'");
      await document.fonts.ready;
      const width = (id: string) => textWidth(box.querySelector(`#${id}`)!);
      // Poppins and Maven Pro set "Total" at clearly different widths.
      const maven = spanWidth(box, 'Total', `font-size: ${getComputedStyle(box.querySelector('#plain')!).fontSize}; font-weight: 500; font-family: "Maven Pro"`);
      expect(Math.abs(width('plain') - maven)).toBeGreaterThan(2);

      expect(Math.abs(width('nested') - width('plain'))).toBeLessThan(0.05);
      expect(Math.abs(width('on') - width('plain'))).toBeLessThan(0.05);
      expect(Math.abs(width('class-nested') - width('class-plain'))).toBeLessThan(0.05);
      expect(Math.abs(width('h5-nested') - width('h5-plain'))).toBeLessThan(0.05);
    } finally {
      box.remove();
    }
  });

  it('turns the figures face off when the token is set to `initial`', async () => {
    const box = document.createElement('div');
    box.style.setProperty('--dx-font-family-figures', 'initial');
    document.body.appendChild(box);
    try {
      await loadFigures();
      const off = measurePair(box, 'font-size: 28px', 'dx-tabular');
      const maven = measurePair(box, 'font-size: 28px; font-family: "Maven Pro"');
      expect(Math.abs(off.ones - maven.ones)).toBeLessThan(0.05);
      expect(Math.abs(off.zeros - maven.zeros)).toBeLessThan(0.05);
    } finally {
      box.remove();
    }
  });
});
