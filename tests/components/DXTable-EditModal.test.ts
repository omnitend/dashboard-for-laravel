import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const renderWithBApp = (props: any) =>
  render({ render: () => h(BApp, {}, () => h(DXTable, props)) });

const rows = [
  { id: 1, name: 'Electronics', slug: 'electronics' },
  { id: 2, name: 'Clothing', slug: 'clothing' },
];
const fields = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
];
const editFields = [
  { key: 'name', type: 'text', label: 'Name', required: true },
  { key: 'slug', type: 'text', label: 'Slug' },
];

// The edit modal teleports to document.body, so its content is queried on
// `document`, not the render container.
const modalButtons = () =>
  Array.from(document.querySelectorAll('.modal button')).map((b) =>
    b.textContent?.trim(),
  );

const baseProps = (extra: any = {}) => ({
  items: rows,
  fields,
  editFields,
  itemName: 'category',
  editUrl: '/api/categories/:id',
  deleteUrl: '/api/categories/:id',
  createUrl: '/api/categories',
  ...extra,
});

const openEdit = async (extra: any = {}) => {
  const screen = renderWithBApp(baseProps(extra));
  await flush();
  (screen.container.querySelector('tbody tr') as HTMLElement).click();
  await wait(60);
  return screen;
};

/*
 * DXTable edit/create modal props (B10 card / B11 layout / B12 buttons).
 * All three thread a DXForm capability (or itemName) from DXTable through
 * DXTableEditorModal to the modal's DXForm / footer.
 */
describe('DXTable edit modal — item-named buttons (B12)', () => {
  it('labels Save + Delete with the item name by default', async () => {
    await openEdit();
    const labels = modalButtons();
    expect(labels).toContain('Save Category');
    expect(labels).toContain('Delete Category');
  });

  it('labels the create button with the item name', async () => {
    const screen = renderWithBApp(baseProps());
    await flush();
    // The header "New {item}" button opens the create modal.
    const newBtn = Array.from(screen.container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'New category',
    ) as HTMLElement;
    newBtn.click();
    await wait(60);
    expect(modalButtons()).toContain('Create Category');
  });

  it('honours save-text / delete-text overrides', async () => {
    await openEdit({ saveText: 'Persist it', deleteText: 'Remove it' });
    const labels = modalButtons();
    expect(labels).toContain('Persist it');
    expect(labels).toContain('Remove it');
    expect(labels).not.toContain('Save Category');
  });

  it('title-cases a multi-word itemName ("sales order" → "Save Sales Order")', async () => {
    await openEdit({ itemName: 'sales order' });
    expect(modalButtons()).toContain('Save Sales Order');
  });

  it('falls back to "Save Item" when no itemName is set', async () => {
    const screen = renderWithBApp({
      items: rows,
      fields,
      editFields,
      editUrl: '/api/x/:id',
    });
    await flush();
    (screen.container.querySelector('tbody tr') as HTMLElement).click();
    await wait(60);
    expect(modalButtons()).toContain('Save Item');
  });
});

describe('DXTable edit modal — form layout (B11)', () => {
  const hasHorizontalGroup = () =>
    // bvn's horizontal BFormGroup renders the label as a grid column
    // (`col-form-label` + a `col-*`); vertical does not.
    !!document.querySelector('.modal label.col-form-label');

  it('defaults the modal form to horizontal layout', async () => {
    await openEdit();
    expect(hasHorizontalGroup()).toBe(true);
  });

  it('respects edit-layout="vertical"', async () => {
    await openEdit({ editLayout: 'vertical' });
    expect(hasHorizontalGroup()).toBe(false);
  });
});

describe('DXTable edit modal — opt-in card (B10)', () => {
  const modalHasCard = () => !!document.querySelector('.modal .card');

  it('does not card the modal form by default', async () => {
    await openEdit();
    expect(modalHasCard()).toBe(false);
  });

  it('cards the modal form when edit-card is set', async () => {
    await openEdit({ editCard: true });
    expect(modalHasCard()).toBe(true);
  });
});
