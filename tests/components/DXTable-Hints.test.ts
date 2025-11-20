import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const productData = [
  { id: 1, name: 'Widget', price: '19.99', category: 'Tools' },
  { id: 2, name: 'Gadget', price: '49.50', category: 'Electronics' },
];

describe('DXTable Field Hints', () => {
  it('renders hints below column headers', async () => {
    const fields = [
      { key: 'name', label: 'Product Name', hint: 'Search by name' },
      { key: 'price', label: 'Price', hint: 'USD' },
    ];

    const screen = render(DXTable, {
      props: {
        items: productData,
        fields: fields,
      },
    });

    // Check hints are rendered
    const hints = screen.container.querySelectorAll('small.text-muted');
    expect(hints.length).toBeGreaterThanOrEqual(2);

    // Check hint text content
    const hintTexts = Array.from(hints).map(h => h.textContent);
    expect(hintTexts).toContain('Search by name');
    expect(hintTexts).toContain('USD');
  });

  it('headers without hints do not show hint elements', async () => {
    const fields = [
      { key: 'name', label: 'Product Name', hint: 'Search by name' },
      { key: 'price', label: 'Price' }, // No hint
    ];

    const screen = render(DXTable, {
      props: {
        items: productData,
        fields: fields,
      },
    });

    // Should have exactly one hint (for name field only)
    const hints = screen.container.querySelectorAll('thead small.text-muted');
    expect(hints.length).toBe(1);
    expect(hints[0].textContent).toBe('Search by name');
  });

  it('hints work with sortable fields', async () => {
    const fields = [
      { key: 'name', label: 'Product Name', sortable: true, hint: 'Click to sort' },
      { key: 'price', label: 'Price', sortable: true, hint: 'USD' },
    ];

    const screen = render(DXTable, {
      props: {
        items: productData,
        fields: fields,
      },
    });

    // Headers should have both hints and sort indicators
    const thead = screen.container.querySelector('thead');
    const theadHtml = thead?.innerHTML || '';

    // Check hints are present
    expect(theadHtml).toContain('Click to sort');
    expect(theadHtml).toContain('USD');

    // Check sort indicators are present
    expect(theadHtml).toContain('↕'); // Unsorted indicator
  });

  it('hints work with formatters', async () => {
    const fields = [
      {
        key: 'price',
        label: 'Price',
        hint: 'USD',
        formatter: (value: string) => `$${value}`
      },
    ];

    const screen = render(DXTable, {
      props: {
        items: productData,
        fields: fields,
      },
    });

    // Header should show hint
    const hints = screen.container.querySelectorAll('small.text-muted');
    expect(hints.length).toBeGreaterThanOrEqual(1);

    // Cell should show formatted value
    const tbody = screen.container.querySelector('tbody');
    expect(tbody?.textContent).toContain('$19.99');
  });
});
