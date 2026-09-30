import { expect, it } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, nextTick, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

it('renders all client-side rows when pagination is hidden, including rows loaded later', async () => {
  const items = ref(Array.from({ length: 5 }, (_, index) => ({ id: index + 1, name: `Product ${index + 1}` })));
  const screen = render({
    render: () => h(BApp, {}, () => h(DXTable, {
      items: items.value,
      clientSide: true,
      fields: [{ key: 'name', label: 'Product' }],
      showPagination: false,
      showPerPageSelector: false,
    })),
  });

  await nextTick();
  expect(screen.container.querySelectorAll('tbody tr')).toHaveLength(5);

  items.value = Array.from({ length: 15 }, (_, index) => ({ id: index + 1, name: `Product ${index + 1}` }));
  await nextTick();
  expect(screen.container.querySelectorAll('tbody tr')).toHaveLength(15);

  items.value = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, name: `Product ${index + 1}` }));
  await nextTick();
  expect(screen.container.querySelectorAll('tbody tr')).toHaveLength(25);
  expect(screen.container.textContent).toContain('Product 25');
  expect(screen.container.textContent).toContain('25 items.');
});
