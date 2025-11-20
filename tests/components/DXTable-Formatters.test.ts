import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const productData = [
  { id: 1, name: 'Widget', price: '19.99', quantity: 5 },
  { id: 2, name: 'Gadget', price: '49.5', quantity: 10 },
  { id: 3, name: 'Tool', price: '99', quantity: 3 },
];

describe('DXTable Formatters', () => {
  it('applies formatter function to field values', async () => {
    const fields = [
      { key: 'name', label: 'Product' },
      {
        key: 'price',
        label: 'Price',
        formatter: (value: string) => `$${parseFloat(value).toFixed(2)}`
      },
      { key: 'quantity', label: 'Quantity' },
    ];

    const screen = render(DXTable, {
      props: {
        items: productData,
        fields: fields,
      },
    });

    // Check that formatted values appear in table
    const table = screen.container.querySelector('table');
    expect(table).toBeTruthy();

    // Check first product price is formatted
    const tableHtml = table?.innerHTML || '';
    expect(tableHtml).toContain('$19.99');
    expect(tableHtml).toContain('$49.50');
    expect(tableHtml).toContain('$99.00');

    // Ensure raw values are NOT displayed
    expect(tableHtml).not.toContain('>19.99<');
    expect(tableHtml).not.toContain('>49.5<');
  });

  it('formatters work alongside custom cell slots', async () => {
    const fields = [
      { key: 'name', label: 'Product' },
      {
        key: 'price',
        label: 'Price',
        formatter: (value: string) => `$${parseFloat(value).toFixed(2)}`
      },
      { key: 'quantity', label: 'Quantity' },
    ];

    const screen = render(DXTable, {
      props: {
        items: productData,
        fields: fields,
      },
      slots: {
        'cell(quantity)': '<span class="custom-quantity">{{ item.quantity }} units</span>',
      },
    });

    const tableHtml = screen.container.querySelector('table')?.innerHTML || '';

    // Formatter still works
    expect(tableHtml).toContain('$19.99');

    // Custom slot also works
    const customQuantity = screen.container.querySelectorAll('.custom-quantity');
    expect(customQuantity.length).toBeGreaterThan(0);
  });

  it('formatters apply to all rows in table', async () => {
    const fields = [
      {
        key: 'price',
        label: 'Price',
        formatter: (value: string) => `$${parseFloat(value).toFixed(2)}`
      },
    ];

    const screen = render(DXTable, {
      props: {
        items: productData,
        fields: fields,
      },
    });

    // All three products should have formatted prices
    const rows = screen.container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);

    const tableText = screen.container.querySelector('tbody')?.textContent || '';
    expect(tableText).toContain('$19.99');
    expect(tableText).toContain('$49.50');
    expect(tableText).toContain('$99.00');
  });
});
