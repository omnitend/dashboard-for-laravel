import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import DXCurrencyInput from '../../resources/js/components/extended/DXCurrencyInput.vue';

// Tabular figures (#215). The styles under test are global (dist/style.css,
// loaded by setup.ts): rebuild before running this after a theme change.

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const numeric = (element: Element) => getComputedStyle(element).fontVariantNumeric;

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

  it('measures the bundled Maven Pro: it has no `tnum` feature, so tabular-nums changes nothing in it', async () => {
    // Recorded so the limitation is visible, not assumed: with a `tnum`
    // feature "1111" and "0000" set to the same width under tabular-nums.
    // Maven Pro's figures are proportional and stay so. If this goes red,
    // the bundled face gained `tnum` and tabular figures now take effect in
    // the default theme: update the docs that say they do not.
    const box = document.createElement('div');
    box.innerHTML = ['1111', '0000']
      .map(
        (digits) =>
          `<span class="dx-tabular" style="font-family: 'Maven Pro'; font-weight: 700; font-size: 28px">${digits}</span>`,
      )
      .join('<br>');
    document.body.appendChild(box);
    try {
      await document.fonts.load("700 28px 'Maven Pro'");
      await document.fonts.ready;
      expect(document.fonts.check("700 28px 'Maven Pro'")).toBe(true);
      const [ones, zeros] = Array.from(box.querySelectorAll('span')).map(
        (span) => span.getBoundingClientRect().width,
      );
      expect(numeric(box.querySelector('span')!)).toContain('tabular-nums');
      expect(Math.abs(ones! - zeros!)).toBeGreaterThan(5);
    } finally {
      box.remove();
    }
  });
});
