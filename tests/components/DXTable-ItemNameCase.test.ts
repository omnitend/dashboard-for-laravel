/**
 * How DXTable cases its `itemName` where it shows it. Titles and buttons
 * take Title Case, as the footer buttons already did ("Create Booking
 * Period"); a toast that starts with the name gets a capital first letter;
 * mid-sentence text keeps the name as written. The create title was "New
 * booking period" beside a "Create Booking Period" button.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { titleCaseItemName, capitaliseFirst } from '../../resources/js/utils/itemNameCase';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rows = [{ id: 1, name: 'Lunch', minutes: 90 }];
const fields = [{ key: 'name', label: 'Name' }];
const editFields = [{ key: 'name', type: 'text', label: 'Name' }];

const renderTable = (extra: Record<string, unknown> = {}) =>
  render({
    render: () =>
      h(BApp, {}, () =>
        h(DXTable, {
          items: rows,
          fields,
          editFields,
          itemName: 'booking period',
          editUrl: '/api/periods/:id',
          createUrl: '/api/periods',
          ...extra,
        }),
      ),
  });

const headerNewButton = (container: Element) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.trim().startsWith('New '),
  );

const modalTitle = () => document.querySelector('.modal .modal-title')?.textContent?.trim();

describe('DXTable item-name casing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('.modal, .toast').forEach((element) => element.remove());
  });

  it('title-cases the header button and the create modal title', async () => {
    const screen = renderTable();
    await flush();
    const button = headerNewButton(screen.container);

    expect(button?.textContent?.trim()).toBe('New Booking Period');

    button!.click();
    await wait(80);
    expect(modalTitle()).toBe('New Booking Period');
  });

  it('title-cases the default edit modal title', async () => {
    const screen = renderTable();
    await flush();
    (screen.container.querySelector('tbody tr') as HTMLElement).click();
    await wait(80);

    expect(modalTitle()).toBe('Edit Booking Period');
  });

  it('starts the success toast with a capital, keeping the rest as written', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 2, name: 'Dinner' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const screen = renderTable();
    await flush();
    headerNewButton(screen.container)!.click();
    await wait(80);
    const create = Array.from(document.querySelectorAll<HTMLButtonElement>('.modal button')).find(
      (button) => button.textContent?.trim() === 'Create Booking Period',
    );
    create!.click();

    await expect
      .poll(() => Array.from(document.querySelectorAll('.toast')).map((toast) => toast.textContent ?? '').join('|'), {
        timeout: 4000,
      })
      .toContain('Booking period created successfully');
  });

  it('keeps the name as written mid-sentence (empty state)', async () => {
    const screen = renderTable({ items: [] });
    await flush();

    expect(screen.container.textContent).toContain('No booking periods found');
  });
});

describe('titleCaseItemName / capitaliseFirst', () => {
  it('upper-cases the first letter of each word only', () => {
    expect(titleCaseItemName('booking period')).toBe('Booking Period');
    expect(titleCaseItemName("customer's table")).toBe("Customer's Table");
    expect(titleCaseItemName('SKU group')).toBe('SKU Group');
    expect(titleCaseItemName('  ')).toBe('Item');
    expect(titleCaseItemName(undefined)).toBe('Item');
  });

  it('capitalises only the first character', () => {
    expect(capitaliseFirst('booking period created')).toBe('Booking period created');
    expect(capitaliseFirst('')).toBe('');
  });
});
