import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Wrapper to provide BApp context for useToast
const renderWithBApp = (component: any, options: any) => {
  return render({
    render: () => h(BApp, {}, () => h(component, options.props, options.slots))
  });
};

const categoryData = [
  { id: 1, name: 'Electronics', slug: 'electronics', description: 'Electronic items', is_active: true, product_count: 42 },
  { id: 2, name: 'Clothing', slug: 'clothing', description: 'Apparel and accessories', is_active: true, product_count: 28 },
];

const tableFields = [
  { key: 'name', label: 'Category Name', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
  { key: 'product_count', label: 'Products', sortable: true },
];

const editFields = [
  { key: 'name', type: 'text', label: 'Category Name', required: true },
  { key: 'slug', type: 'text', label: 'Slug', required: true },
  { key: 'description', type: 'textarea', label: 'Description' },
  { key: 'products', span: true },
];

const editTabs = [
  {
    key: 'details',
    label: 'Category Details',
    fieldKeys: ['name', 'slug', 'description'],
  },
  {
    key: 'products',
    label: 'Products',
    fieldKeys: ['products'],
  },
];

// `useForm` is statically imported by DXTable (see #42), so opening the edit
// modal seeds the form synchronously — these tests no longer race an async
// dynamic import. The modal teleports to `document.body`, so its content is
// queried on `document`, not the render container.
describe('DXTable Edit Tabs', () => {
  describe('Tab Rendering', () => {
    it('renders edit modal with tabs when editTabs provided', async () => {
      const screen = renderWithBApp(DXTable, {
        props: {
          items: categoryData,
          fields: tableFields,
          editFields: editFields,
          editTabs: editTabs,
          editUrl: '/api/categories/:id',
        },
      });
      await flush();

      // Click first row to open edit modal
      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      // Check tabs are rendered (modal is teleported to body)
      const tabs = document.querySelectorAll('.nav-link');
      expect(tabs.length).toBeGreaterThanOrEqual(2);

      // Check tab labels
      const tabLabels = Array.from(tabs).map(t => t.textContent?.trim());
      expect(tabLabels).toContain('Category Details');
      expect(tabLabels).toContain('Products');

      // Check first tab is active
      expect(tabs[0].classList.contains('active')).toBe(true);
    });

    it('renders flat form when no editTabs provided', async () => {
      const screen = renderWithBApp(DXTable, {
        props: {
          items: categoryData,
          fields: tableFields,
          editFields: editFields,
          editUrl: '/api/categories/:id',
        },
      });
      await flush();

      // Click first row
      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      // Should not have tabs (backwards compatibility)
      const tabs = document.querySelectorAll('.nav-link');
      expect(tabs.length).toBe(0);
    });

    it('uses dynamic modal title function', async () => {
      const screen = renderWithBApp(DXTable, {
        props: {
          items: categoryData,
          fields: tableFields,
          editFields: editFields,
          editTabs: editTabs,
          editModalTitle: (item: any) => `Edit: ${item.name}`,
        },
      });
      await flush();

      // Click first row (Electronics)
      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      // Check modal title is dynamic
      const modalTitle = document.querySelector('.modal-title');
      expect(modalTitle?.textContent).toBe('Edit: Electronics');
    });
  });

  describe('Tab Content', () => {
    it('renders fields in correct tabs', async () => {
      const screen = renderWithBApp(DXTable, {
        props: {
          items: categoryData,
          fields: tableFields,
          editFields: editFields,
          editTabs: editTabs,
        },
      });
      await flush();

      // Click first row
      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      // First tab should have name, slug, description fields
      const nameInput = document.querySelector('input[type="text"]');
      expect(nameInput).toBeTruthy();
    });
  });

  describe('Custom Slots', () => {
    it('renders custom span field content via slot', async () => {
      const screen = renderWithBApp(DXTable, {
        props: {
          items: categoryData,
          fields: tableFields,
          editFields: editFields,
          editTabs: editTabs,
        },
        slots: {
          // Also exercises the `close` callback across both hops (#129).
          'edit-span(products)': (sp: any) =>
            h('div', { class: 'custom-products-content' }, [
              'Products go here',
              h('button', { class: 'slot-close-btn', onClick: () => sp.close() }, 'Close'),
            ]),
        },
      });
      await flush();

      // Click first row
      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      // Switch to Products tab (second tab)
      const tabs = document.querySelectorAll('.nav-link');
      if (tabs[1]) {
        (tabs[1] as HTMLElement).click();
        await wait(50);
      }

      // Check custom content is rendered and visible
      const customContent = document.querySelector('.custom-products-content') as HTMLElement;
      expect(customContent).toBeTruthy();
      expect(customContent.textContent).toContain('Products go here');
      expect(customContent.checkVisibility()).toBe(true);

      // The `close` binding must reach the consumer across both hops: clicking
      // it closes the modal (editor.cancel). A mis-forwarded close would render
      // the button but do nothing. BModal keeps the hidden content in the DOM,
      // so assert it is no longer *visible* (an ancestor gets display:none), not
      // that it was removed.
      (document.querySelector('.slot-close-btn') as HTMLElement).click();
      await wait(100);
      expect(customContent.checkVisibility()).toBe(false);
    });

    // The edit-modal slots reach the form forwarded across TWO component hops
    // (consumer → DXTable → DXTableEditorModal → DXForm, #129). Presence isn't
    // enough — assert the scoped BINDINGS survive both hops, since a mis-threaded
    // forward would render the slot but with the wrong (or undefined) value/field.
    it('forwards a custom edit-value slot AND its bindings across both hops', async () => {
      const screen = renderWithBApp(DXTable, {
        props: {
          items: categoryData,
          fields: tableFields,
          editFields: editFields,
          editTabs: editTabs,
        },
        slots: {
          'edit-value(name)': (sp: any) =>
            h('div', { class: 'custom-name-editor' }, [
              h('span', { class: 'bound-value' }, String(sp.value)),
              h('span', { class: 'bound-field-key' }, String(sp.field?.key)),
              h('span', { class: 'bound-item-id' }, String(sp.item?.id)),
              // Exercises the `update` callback across both hops (#129).
              h('button', { class: 'slot-update-btn', onClick: () => sp.update('Changed') }, 'Set'),
            ]),
        },
      });
      await flush();

      // Open the edit modal for row 1 (Electronics). `name` is on the first
      // (active) tab, so its edit-value slot renders immediately.
      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      expect(document.querySelector('.custom-name-editor')).toBeTruthy();
      // value seeded from the row, field def, and the row itself all threaded through.
      expect(document.querySelector('.bound-value')?.textContent).toBe('Electronics');
      expect(document.querySelector('.bound-field-key')?.textContent).toBe('name');
      expect(document.querySelector('.bound-item-id')?.textContent).toBe('1');

      // The `update` binding must reach the consumer across both hops: calling it
      // writes the form field, which re-renders the slot with the new value.
      (document.querySelector('.slot-update-btn') as HTMLElement).click();
      await wait(60);
      expect(document.querySelector('.bound-value')?.textContent).toBe('Changed');
    });

    it('forwards a custom tab-content slot with its tab binding across both hops', async () => {
      const screen = renderWithBApp(DXTable, {
        props: {
          items: categoryData,
          fields: tableFields,
          editFields: editFields,
          editTabs: editTabs,
        },
        slots: {
          'tab-content(details)': (sp: any) =>
            h('div', { class: 'custom-details-tab' }, `tab:${sp.tab?.key}`),
        },
      });
      await flush();

      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      const tabBody = document.querySelector('.custom-details-tab');
      expect(tabBody).toBeTruthy();
      expect(tabBody?.textContent).toContain('tab:details');
    });
  });
});
