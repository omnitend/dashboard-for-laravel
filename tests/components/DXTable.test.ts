import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import { api } from '../../resources/js/utils/api';
import { router } from '@inertiajs/vue3';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { customerData, customerFields, paginationData, largePaginationData } from '../fixtures/tableData';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('DXTable', () => {
  describe('Imperative API (defineExpose)', () => {
    it('exposes openCreate() and refresh()', async () => {
      const tableRef = ref<any>(null);
      render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              ref: tableRef,
              items: customerData,
              fields: customerFields,
              editFields: [{ key: 'name', type: 'text', label: 'Name' }],
              createUrl: '/api/customers',
            }),
          ),
      });
      await flush();

      expect(typeof tableRef.value.openCreate).toBe('function');
      expect(typeof tableRef.value.refresh).toBe('function');
    });
  });

  /**
   * DXTable creates `editForm` ONCE and reseeds it in place for each row, so
   * without a key on DXForm, Vue reuses the same DXField instances across
   * records and any per-field UI state rides along. A revealed password from
   * row A was still revealed when row B opened — and on the create form.
   */
  describe('Edit modal does not leak per-field UI state between records (#100)', () => {
    const passwordFields = [{ key: 'name', type: 'text', label: 'Name' }, { key: 'password', type: 'password', label: 'Password' }];

    const renderTable = () => {
      const tableRef = ref<any>(null);
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              ref: tableRef,
              items: [
                { id: 1, name: 'Row A', password: 'row-a-secret' },
                { id: 2, name: 'Row B', password: 'row-b-secret' },
              ],
              fields: [{ key: 'name', label: 'Name' }],
              itemName: 'customer',
              editFields: passwordFields,
              editUrl: '/api/customers/:id',
              createUrl: '/api/customers',
            }),
          ),
      });
      return { screen, tableRef };
    };

    // The modal teleports out of the table's container, so query the document.
    const revealToggle = () =>
      document.querySelector('button[aria-label="Show password"]') as HTMLElement | null;
    const maskedInput = () =>
      document.querySelector('input[type="password"]') as HTMLInputElement | null;

    const openRow = async (screen: any, index: number) => {
      const rows = screen.container.querySelectorAll('tbody tr');
      (rows[index] as HTMLElement).click();
      await wait(120);
    };

    it('re-masks the password when a different row is opened', async () => {
      const { screen } = renderTable();
      await flush();

      await openRow(screen, 0);
      expect(maskedInput()?.value).toBe('row-a-secret');

      revealToggle()!.click();
      await wait(120);
      // Row A is now in clear text.
      expect(maskedInput()).toBeNull();

      // Open row B on the same table — the modal reuses one form object.
      await openRow(screen, 1);

      const masked = maskedInput();
      expect(masked).not.toBeNull();
      expect(masked!.value).toBe('row-b-secret');
      expect(revealToggle()).not.toBeNull();
    });

    it('re-masks the password when the create form is opened after a reveal', async () => {
      const { screen, tableRef } = renderTable();
      await flush();

      await openRow(screen, 0);
      revealToggle()!.click();
      await wait(120);
      expect(maskedInput()).toBeNull();

      tableRef.value.openCreate();
      await wait(120);

      expect(maskedInput()).not.toBeNull();
      expect(revealToggle()).not.toBeNull();
    });
  });

  describe('showCreateButton (#96)', () => {
    const renderTable = (extraProps: Record<string, any> = {}) =>
      render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              items: customerData,
              fields: customerFields,
              itemName: 'customer',
              editFields: [{ key: 'name', type: 'text', label: 'Name' }],
              createUrl: '/api/customers',
              ...extraProps,
            }),
          ),
      });

    it('renders the built-in New button by default when createUrl is set', async () => {
      const screen = renderTable();
      await flush();

      expect(screen.container.textContent).toContain('New customer');
    });

    it('drops the New button when showCreateButton is false', async () => {
      const screen = renderTable({ showCreateButton: false });
      await flush();

      expect(screen.container.textContent).not.toContain('New customer');
    });

    // A consumer drives the modal from a navbar button and hides the header
    // with CSS today, which also nukes any header content. With no title and no
    // header slot, the header should simply not render.
    it('drops the card header entirely when it would be left empty', async () => {
      const screen = renderTable({ showCreateButton: false });
      await flush();

      expect(screen.container.querySelector('.card-header')).toBeNull();
    });

    it('keeps the header when a title is set, even with no New button', async () => {
      const screen = renderTable({ showCreateButton: false, title: 'Customers' });
      await flush();

      expect(screen.container.querySelector('.card-header')).not.toBeNull();
      expect(screen.container.textContent).toContain('Customers');
      expect(screen.container.textContent).not.toContain('New customer');
    });

    it('still opens the create modal via openCreate() with the button suppressed', async () => {
      const tableRef = ref<any>(null);
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              ref: tableRef,
              items: customerData,
              fields: customerFields,
              itemName: 'customer',
              editFields: [{ key: 'name', type: 'text', label: 'Name' }],
              createUrl: '/api/customers',
              showCreateButton: false,
            }),
          ),
      });
      await flush();

      tableRef.value.openCreate();
      await wait(50);

      expect(document.body.textContent).toContain('New customer');
    });
  });

  describe('Select filter (DAutocomplete typeahead)', () => {
    const statusFields = [
      { key: 'name', label: 'Name' },
      {
        key: 'status',
        label: 'Status',
        filter: 'select',
        filterOptions: [
          { value: 'active', text: 'active' },
          { value: 'inactive', text: 'inactive' },
        ],
      },
    ];

    it('renders the select filter as an autocomplete, not a native <select>', async () => {
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, { items: customerData, fields: statusFields, clientSide: true }),
          ),
      });
      await flush();

      const filterRow = screen.container.querySelector('.filter-row');
      expect(filterRow).toBeTruthy();
      // The typeahead is a text input (combobox), not a native select.
      expect(filterRow!.querySelector('select')).toBeNull();
      expect(filterRow!.querySelector('input')).toBeTruthy();
    });

    it('filters the table when an option is selected, and clears back to all', async () => {
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, { items: customerData, fields: statusFields, clientSide: true }),
          ),
      });
      await flush();

      const allRows = screen.container.querySelectorAll('tbody tr').length;
      const inactiveCount = customerData.filter((c) => c.status === 'inactive').length;
      expect(allRows).toBeGreaterThan(inactiveCount);

      // Open the typeahead (opens on focus) and pick "inactive".
      const input = screen.container.querySelector('.filter-row input') as HTMLInputElement;
      input.focus();
      await wait(50);
      const option = Array.from(document.querySelectorAll('[role="option"]')).find(
        (o) => o.textContent?.trim() === 'inactive',
      ) as HTMLElement | undefined;
      expect(option).toBeTruthy();
      option!.click();
      await wait(60);

      // Only inactive rows remain.
      const filtered = screen.container.querySelectorAll('tbody tr').length;
      expect(filtered).toBe(inactiveCount);
    });

    it('grows the dropdown popup so long options are not clipped (#59)', async () => {
      const longFields = [
        { key: 'name', label: 'Name' },
        {
          key: 'measure',
          label: 'Measure',
          filter: 'select',
          filterOptions: [
            { value: 'a', text: '11 Gallon (50.01 Litre) Keg' },
            { value: 'b', text: '4.5 Gallon Rough Cask' },
            { value: 'c', text: '10 Gallon (45.46 Litre)' },
          ],
        },
      ];
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              items: [{ name: 'x', measure: 'a' }],
              fields: longFields,
              clientSide: true,
            }),
          ),
      });
      await flush();

      // Open the typeahead popup (opens on focus).
      const input = screen.container.querySelector('.filter-row input') as HTMLInputElement;
      input.focus();
      await wait(80);

      const content = document.querySelector('.b-autocomplete-content') as HTMLElement | null;
      expect(content).toBeTruthy();

      // The popup sizes to `max-content` (grows to the longest option) instead
      // of inheriting the narrow input width and clipping. Asserting the applied
      // rule directly, rather than measured widths, keeps this independent of the
      // test viewport's column width.
      const styles = getComputedStyle(content!);
      expect(styles.minWidth).toBe('max-content');
      // And it's capped so a pathological label can't make it run away.
      expect(styles.maxWidth).not.toBe('none');
    });
  });

  describe('Card / plain variant (card prop)', () => {
    it('wraps the table in a card by default', async () => {
      const screen = render(DXTable, {
        props: { items: customerData, fields: customerFields, title: 'Customers' },
      });
      await flush();

      expect(screen.container.querySelector('.card')).toBeTruthy();
      expect(screen.container.querySelector('.dx-table-plain')).toBeNull();
      // Table still renders inside the card.
      expect(screen.container.querySelector('.card table')).toBeTruthy();
    });

    it('renders plainly (no card) when :card="false"', async () => {
      const screen = render(DXTable, {
        props: { items: customerData, fields: customerFields, title: 'Customers', card: false },
      });
      await flush();

      expect(screen.container.querySelector('.card')).toBeNull();
      const plain = screen.container.querySelector('.dx-table-plain');
      expect(plain).toBeTruthy();
      // Same content: header row and table are still present, just uncarded.
      expect(plain!.querySelector('.dx-table-plain__header')).toBeTruthy();
      expect(plain!.querySelector('table')).toBeTruthy();
    });
  });

  describe('Fetch full record on edit (showUrl)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('seeds the edit form from the fetched record, not just the list row', async () => {
      // Thin list row: no `notes`. The show endpoint returns the full record.
      const listRow = { id: 7, name: 'Acme' };
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
        data: { data: { id: 7, name: 'Acme', notes: 'Full record notes' } },
      });

      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              items: [listRow],
              fields: [{ key: 'name', label: 'Name' }],
              editFields: [
                { key: 'name', type: 'text', label: 'Name' },
                { key: 'notes', type: 'text', label: 'Notes' },
              ],
              showUrl: '/api/customers/:id',
              editUrl: '/api/customers/:id',
            }),
          ),
      });
      await flush();

      // Open the row's edit modal.
      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      // The show endpoint was called with the row id substituted.
      expect(getSpy).toHaveBeenCalledWith('/api/customers/7');

      // The Notes input (omitted by the list row) is populated from the fetch.
      const notesInput = Array.from(
        document.querySelectorAll('input'),
      ).find((i) => (i as HTMLInputElement).value === 'Full record notes');
      expect(notesInput).toBeTruthy();
    });

    it('disables Delete while the full record is still loading', async () => {
      // A never-resolving fetch keeps editLoading true so we can observe the
      // disabled state (guard could otherwise read the thin row's data).
      vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}) as any);

      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              items: [{ id: 3, name: 'Slow Co' }],
              fields: [{ key: 'name', label: 'Name' }],
              editFields: [{ key: 'name', type: 'text', label: 'Name' }],
              showUrl: '/api/customers/:id',
              deleteUrl: '/api/customers/:id',
            }),
          ),
      });
      await flush();

      (screen.container.querySelector('tbody tr') as HTMLElement).click();
      await wait(60);

      const deleteBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Delete',
      ) as HTMLButtonElement | undefined;
      expect(deleteBtn).toBeTruthy();
      expect(deleteBtn!.disabled).toBe(true);
    });
  });

  describe('Delete guard', () => {
    it('renders with a deleteGuard prop without error', async () => {
      // The guard runs inside the edit modal's delete flow (exercised live);
      // here we assert the prop is accepted and the table still renders.
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          editFields: [{ key: 'name', type: 'text', label: 'Name' }],
          deleteUrl: '/api/customers/:id',
          deleteGuard: (item: any) =>
            item.locked ? 'This customer is locked.' : null,
        },
      });
      await flush();

      expect(screen.container.querySelector('table')).toBeTruthy();
    });

    it('shows an immediate message and skips the confirm when the guard blocks a row', async () => {
      let confirmCalled = false;
      const originalConfirm = window.confirm;
      window.confirm = () => {
        confirmCalled = true;
        return true;
      };

      try {
        const lockedRow = { id: 1, name: 'Locked Co', locked: true };
        const tableRef = ref<any>(null);
        const screen = render({
          render: () =>
            h(BApp, {}, () =>
              h(DXTable, {
                ref: tableRef,
                items: [lockedRow],
                fields: [{ key: 'name', label: 'Name' }],
                editFields: [{ key: 'name', type: 'text', label: 'Name' }],
                deleteUrl: '/api/customers/:id',
                deleteGuard: (item: any) =>
                  item.locked ? 'This customer is locked.' : null,
              }),
            ),
        });
        await flush();

        // Open the edit modal for the locked row, then click Delete.
        (screen.container.querySelector('tbody tr') as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const deleteBtn = Array.from(
          document.querySelectorAll('button'),
        ).find((b) => b.textContent?.trim() === 'Delete') as HTMLElement | undefined;
        expect(deleteBtn).toBeTruthy();
        deleteBtn!.click();
        await new Promise((resolve) => setTimeout(resolve, 50));

        // The guard short-circuits before the confirm dialog.
        expect(confirmCalled).toBe(false);
        expect(document.body.textContent).toContain('This customer is locked.');
      } finally {
        window.confirm = originalConfirm;
      }
    });
  });

  describe('Basic Rendering', () => {
    it('renders table with data', async () => {
      const screen = render(DXTable, {
        props: {
          title: 'Customer List',
          items: customerData,
          fields: customerFields,
          pagination: paginationData,
        },
      });

      // Check title is displayed
      await expect.element(screen.getByText('Customer List')).toBeVisible();

      // Check first customer name is visible
      await expect.element(screen.getByText('John Smith')).toBeVisible();

      // Check all customer names are visible
      await expect.element(screen.getByText('Sarah Johnson')).toBeVisible();
      await expect.element(screen.getByText('Michael Brown')).toBeVisible();
    });

    it('displays loading state', async () => {
      const screen = render(DXTable, {
        props: {
          items: [],
          fields: customerFields,
          loading: true,
          loadingText: 'Loading customers...',
          pagination: paginationData,
        },
      });

      // Check spinner and loading text are displayed
      await expect.element(screen.getByText('Loading customers...')).toBeVisible();
    });

    it('displays error state', async () => {
      const screen = render(DXTable, {
        props: {
          items: [],
          fields: customerFields,
          error: 'Failed to load customers',
          pagination: paginationData,
        },
      });

      // Check error message is displayed
      await expect.element(screen.getByText('Failed to load customers')).toBeVisible();
    });
  });

  describe('Pagination', () => {
    it('shows pagination when total exceeds perPage', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          pagination: largePaginationData,
          showPagination: true,
        },
      });

      // Check pagination info text exists
      await expect.element(screen.getByText(/1 to 10 out of 25 items/)).toBeVisible();

      // Check pagination buttons are rendered
      const paginationButtons = screen.container.querySelectorAll('.dx-pager .btn');
      expect(paginationButtons.length).toBeGreaterThan(0);
    });

    it('hides pagination when total is less than perPage', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          pagination: paginationData, // total: 5, perPage: 10
          showPagination: true,
        },
      });

      // When total (5) < perPage (10), pagination should not render
      const paginationElements = screen.container.querySelectorAll('.dx-pager');
      expect(paginationElements.length).toBe(0);
    });

    it('renders multiple pagination pages when total exceeds perPage', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData.slice(0, 2), // Only show 2 items
          fields: customerFields,
          pagination: { ...largePaginationData, current_page: 1 }, // But total is 25
          showPagination: true,
        },
      });

      // Check multiple page buttons are rendered (for 25 total / 10 per page = 3 pages)
      const pageItems = screen.container.querySelectorAll('.dx-pager .btn');

      // Should have at least next/prev + page numbers
      expect(pageItems.length).toBeGreaterThan(2);

      // Verify we're on page 1 (showing 1-10 of 25)
      await expect.element(screen.getByText(/1 to 10 out of 25/)).toBeVisible();
    });

    it('emits pageChange event when pagination is clicked', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData.slice(0, 2), // First 2 customers
          fields: customerFields,
          pagination: {
            current_page: 1,
            per_page: 2,
            total: 5, // 5 total items, 2 per page = 3 pages
            from: 1,
            to: 2,
          },
          showPagination: true,
        },
      });

      // Find pagination buttons
      const paginationButtons = screen.container.querySelectorAll('.dx-pager .btn');

      console.log('Pagination buttons found:', paginationButtons.length);
      console.log('Button texts:', Array.from(paginationButtons).map(b => b.textContent?.trim()));

      // Try to find a page 2 button
      const page2Button = Array.from(paginationButtons).find(
        btn => btn.textContent?.trim() === '2'
      );

      expect(page2Button).toBeTruthy();

      // Click page 2
      (page2Button as HTMLElement).click();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify pageChange event was emitted with page number 2
      const pageChangeEvents = screen.emitted('pageChange');
      console.log('pageChange events:', pageChangeEvents);

      expect(pageChangeEvents).toBeTruthy();
      expect(pageChangeEvents![0][0]).toBe(2);
    });

    it('displays correct per-page value from pagination data', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData.slice(0, 2),
          fields: customerFields,
          pagination: {
            current_page: 1,
            per_page: 10, // Server says 10
            total: 25,
            from: 1,
            to: 10,
          },
          showPagination: true,
          showPerPageSelector: true,
          perPageOptions: [10, 25, 50, 100],
        },
      });

      // Find the per-page select
      const perPageSelect = screen.container.querySelector('#perPageSelect') as HTMLSelectElement;
      expect(perPageSelect).toBeTruthy();

      // Should show 10 (from pagination.per_page), not localStorage or default
      expect(perPageSelect?.value).toBe('10');
    });

    it('suppresses the per-page selector in client-side mode when showPerPageSelector is false', async () => {
      // Repro of #36: a fixed top-N client-side table should not render the
      // per-page control. Use >= the smallest page-size option so the only
      // reason to hide it is the prop.
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        email: `item${i + 1}@example.com`,
      }));

      const screen = render(DXTable, {
        props: {
          items: manyItems,
          fields: customerFields,
          clientSide: true,
          showPagination: false,
          showPerPageSelector: false,
        },
      });

      expect(screen.container.querySelector('#perPageSelect')).toBeNull();
      expect(screen.container.textContent).not.toContain('Per page');
    });

    it('shows the client-side per-page selector when showPerPageSelector is true', async () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        email: `item${i + 1}@example.com`,
      }));

      const screen = render(DXTable, {
        props: {
          items: manyItems,
          fields: customerFields,
          clientSide: true,
          showPerPageSelector: true,
        },
      });

      expect(screen.container.querySelector('#perPageSelect')).toBeTruthy();
    });

    it('updates table content when items prop changes', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData.slice(0, 2), // Page 1: First 2 customers
          fields: customerFields,
          pagination: {
            current_page: 1,
            per_page: 2,
            total: 5,
            from: 1,
            to: 2,
          },
          showPagination: true,
        },
      });

      // Verify page 1 data is visible
      await expect.element(screen.getByText('John Smith')).toBeVisible();
      await expect.element(screen.getByText('Sarah Johnson')).toBeVisible();

      // Simulate parent updating data for page 2
      await screen.rerender({
        items: customerData.slice(2, 4), // Page 2: Next 2 customers
        pagination: {
          current_page: 2,
          per_page: 2,
          total: 5,
          from: 3,
          to: 4,
        },
      });

      // Verify page 2 data is now visible
      await expect.element(screen.getByText('Michael Brown')).toBeVisible();
      await expect.element(screen.getByText('Emily Davis')).toBeVisible();

      // Verify page 1 data is gone (getByText will throw if not found, so use try/catch)
      const page1Names = Array.from(screen.container.querySelectorAll('tbody td')).filter(
        td => td.textContent?.includes('John Smith') || td.textContent?.includes('Sarah Johnson')
      );
      expect(page1Names.length).toBe(0);
    });

    it('displays correct filtered count when total_unfiltered is provided', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData.slice(0, 2), // 2 filtered results
          fields: [
            ...customerFields,
            { key: 'status', label: 'Status', sortable: true, filter: 'text' },
          ],
          filters: { status: 'active' }, // Active filter
          pagination: {
            current_page: 1,
            per_page: 10,
            total: 2, // 2 filtered results
            from: 1,
            to: 2,
            total_unfiltered: 5, // But 5 total without filters
          },
          showPagination: true,
        },
      });

      // Should show filtered count
      await expect.element(screen.getByText(/2 items/)).toBeVisible();

      // Should show unfiltered count (NOT the same as filtered)
      await expect.element(screen.getByText(/Filtered from 5 items/)).toBeVisible();

      // Verify the counts are different (this was the bug)
      const infoText = screen.container.querySelector('.small.text-muted');
      expect(infoText?.textContent).toContain('2 items');
      expect(infoText?.textContent).toContain('Filtered from 5 items');
      expect(infoText?.textContent).not.toContain('Filtered from 2 items');
    });
  });

  describe('Column Headers', () => {
    it('renders all column headers from fields', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          pagination: paginationData,
        },
      });

      // Check all headers are present using role-based queries to avoid ambiguity
      const headers = [
        { name: 'ID', role: 'columnheader' },
        { name: 'Customer Name', role: 'columnheader' },
        { name: 'Email', role: 'columnheader' },
        { name: 'Company', role: 'columnheader' },
        { name: 'Status', role: 'columnheader' },
        { name: 'Created', role: 'columnheader' },
      ];

      for (const header of headers) {
        const element = screen.getByRole(header.role, { name: header.name });
        await expect.element(element).toBeInTheDocument();
      }
    });
  });

  describe('Table Variants', () => {
    it('applies striped styling when striped prop is true', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          pagination: paginationData,
          striped: true,
        },
      });

      // Check table exists with striped class
      const table = screen.container.querySelector('table');
      expect(table?.classList.contains('table-striped')).toBe(true);
    });

    it('does not stripe rows by default', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          pagination: paginationData,
        },
      });

      const table = screen.container.querySelector('table');
      expect(table?.classList.contains('table-striped')).toBe(false);
    });

    it('applies hover styling when hover prop is true', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          pagination: paginationData,
          hover: true,
        },
      });

      // Check table exists with hover class
      const table = screen.container.querySelector('table');
      expect(table?.classList.contains('table-hover')).toBe(true);
    });

    it('applies responsive class when responsive prop is true', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          pagination: paginationData,
          responsive: true,
        },
      });

      // Bootstrap Vue Next's responsive prop creates a wrapper div, not a class on table
      // Check that the table exists and is rendered (responsive behavior is handled by BTable)
      const table = screen.container.querySelector('table');
      expect(table).toBeTruthy();
      expect(table?.classList.contains('table')).toBe(true);
    });
  });

  describe('Custom Cell Slots', () => {
    it('renders custom cell content via slots', async () => {
      const screen = render(DXTable, {
        props: {
          items: customerData,
          fields: customerFields,
          pagination: paginationData,
        },
        slots: {
          'cell(status)': '<span class="custom-status-badge">Custom Status</span>',
        },
      });

      // Check custom slot content is rendered
      const customBadges = screen.container.querySelectorAll('.custom-status-badge');
      expect(customBadges.length).toBeGreaterThan(0);

      // Should have one badge per customer row
      expect(customBadges.length).toBe(customerData.length);
    });
  });

  describe('api-url mode: refetch on api-url change (#82)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const respond = (rows: any[]) => ({
      data: {
        data: rows,
        pagination: {
          current_page: 1,
          per_page: 10,
          total: rows.length,
          from: 1,
          to: rows.length,
        },
      },
    });

    it('refetches with the new url when api-url changes (page-1 provider)', async () => {
      const rowsFor = (url: string) =>
        url.includes('archived')
          ? [{ id: 2, name: 'Archived Co' }]
          : [{ id: 1, name: 'Current Co' }];

      const getSpy = vi
        .spyOn(api, 'get')
        .mockImplementation((url: string) => Promise.resolve(respond(rowsFor(url))) as any);

      const apiUrl = ref('/api/things');
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              apiUrl: apiUrl.value,
              fields: [{ key: 'name', label: 'Name' }],
            }),
          ),
      });

      // Initial load fetches the first url.
      await flush();
      await wait(30);
      expect(getSpy).toHaveBeenCalledWith('/api/things', expect.anything());
      const callsAfterInitial = getSpy.mock.calls.length;

      // Change the bound api-url (a page-level filter outside the table).
      apiUrl.value = '/api/things?filter[archived]=1';
      await flush();
      await wait(30);

      // The table refetched from the new url exactly once, at page 1.
      const newUrlCalls = getSpy.mock.calls.filter(
        (c) => c[0] === '/api/things?filter[archived]=1',
      );
      expect(newUrlCalls.length).toBe(1);
      expect((newUrlCalls[0][1] as any).page).toBe(1);
      expect(getSpy.mock.calls.length).toBe(callsAfterInitial + 1);

      // The rendered rows reflect the new url, not the stale ones.
      await wait(10);
      expect(screen.container.textContent).toContain('Archived Co');
      expect(screen.container.textContent).not.toContain('Current Co');
    });

    it('resets to page 1 and refetches once when api-url changes while past page 1', async () => {
      // A multi-page dataset so the user can be on page 2 when the url changes.
      const getSpy = vi.spyOn(api, 'get').mockImplementation((url: string, params?: any) => {
        const page = params?.page ?? 1;
        return Promise.resolve({
          data: {
            data: [{ id: page, name: `${url.includes('archived') ? 'Archived' : 'Current'} p${page}` }],
            pagination: { current_page: page, per_page: 10, total: 25, from: 1, to: 10 },
          },
        }) as any;
      });

      const apiUrl = ref('/api/things');
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              apiUrl: apiUrl.value,
              fields: [{ key: 'name', label: 'Name' }],
            }),
          ),
      });
      await flush();
      await wait(30);

      // Navigate to page 2 via the pagination control.
      const pageTwo = Array.from(
        screen.container.querySelectorAll('.dx-pager .btn'),
      ).find((el) => el.textContent?.trim() === '2') as HTMLElement | undefined;
      expect(pageTwo).toBeTruthy();
      pageTwo!.click();
      await wait(30);
      expect(
        getSpy.mock.calls.some((c) => c[0] === '/api/things' && (c[1] as any).page === 2),
      ).toBe(true);

      const callsBeforeUrlChange = getSpy.mock.calls.length;

      // Change the url while on page 2.
      apiUrl.value = '/api/things?filter[archived]=1';
      await flush();
      await wait(30);

      // Exactly one refetch, at page 1, on the new url — the out-of-range page 2
      // must not linger (this is the branch that relies on resetting the page
      // re-invoking the provider).
      const newCalls = getSpy.mock.calls
        .slice(callsBeforeUrlChange)
        .filter((c) => c[0] === '/api/things?filter[archived]=1');
      expect(newCalls.length).toBe(1);
      expect((newCalls[0][1] as any).page).toBe(1);
    });
  });
});

/**
 * #109. Two bugs that compounded into a silent failure: the cleared-sort state
 * requested a magic `created_at` column the consumer never declared (a 400 on a
 * strict endpoint), and a failed fetch rendered as zero rows with no error — so
 * the page looked healthy in review and went blank for a user who clicked the
 * header one more time than the developer did.
 */
describe('DXTable sort params and failed fetches (#109)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const okResponse = (rows: any[]) => ({
    data: {
      data: rows,
      pagination: { current_page: 1, per_page: 10, total: rows.length, from: 1, to: rows.length },
    },
  });

  const renderApiTable = (extraProps: Record<string, any> = {}) =>
    render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            apiUrl: '/api/things',
            fields: [{ key: 'name', label: 'Name', sortable: true }],
            ...extraProps,
          }),
        ),
    });

  it('sends no sort at all when nothing is sorted, rather than a magic column', async () => {
    const params: any[] = [];
    vi.spyOn(api, 'get').mockImplementation((_url: string, requestParams: any) => {
      params.push(requestParams);
      return Promise.resolve(okResponse([{ id: 1, name: 'A' }])) as any;
    });

    renderApiTable();
    await wait(60);

    expect(params).toHaveLength(1);
    expect(params[0]).not.toHaveProperty('sortBy');
    expect(params[0]).not.toHaveProperty('sortOrder');
  });

  it('stops sending a sort when the header cycles back to unsorted', async () => {
    const params: any[] = [];
    vi.spyOn(api, 'get').mockImplementation((_url: string, requestParams: any) => {
      params.push(requestParams);
      return Promise.resolve(okResponse([{ id: 1, name: 'A' }])) as any;
    });

    const screen = renderApiTable();
    await wait(60);

    const header = screen.container.querySelector('thead th') as HTMLElement;
    header.click();
    await wait(60);
    header.click();
    await wait(60);
    header.click(); // asc -> desc -> unsorted
    await wait(60);

    const sorts = params.map((p) => (p.sortBy ? `${p.sortBy}:${p.sortOrder}` : 'none'));
    expect(sorts).toEqual(['none', 'name:asc', 'name:desc', 'none']);
    // Specifically: the third click must not resurrect an undeclared column.
    expect(params.some((p) => p.sortBy === 'created_at')).toBe(false);
  });

  it('surfaces a failed api-url fetch as an error instead of an empty table', async () => {
    // The shape utils/api throws (ApiError), not an axios error (#132).
    vi.spyOn(api, 'get').mockImplementation(
      () =>
        Promise.reject({
          message: 'Requested sort is not allowed', errors: {}, status: 400,
        }) as any,
    );

    const screen = renderApiTable();
    await wait(120);

    const alert = screen.container.querySelector('.alert-danger');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Requested sort is not allowed');
  });

  // The silent case: the error handling used to live INSIDE the built-in
  // apiUrl provider, so a consumer's own provider could fail with no trace.
  it('surfaces a failed CUSTOM provider too', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            provider: () => Promise.reject(new Error('provider exploded')),
            fields: [{ key: 'name', label: 'Name', sortable: true }],
          }),
        ),
    });
    await wait(150);

    const alert = screen.container.querySelector('.alert-danger');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('provider exploded');
  });

  it('keeps the table on screen when a fetch fails, so the user can undo the sort/filter', async () => {
    vi.spyOn(api, 'get').mockImplementation(
      () => Promise.reject({ message: 'nope', errors: {}, status: 500 }) as any,
    );

    const screen = renderApiTable();
    await wait(120);

    // Replacing the table with the alert would strip the headers and filter row,
    // leaving a page reload as the only way back.
    expect(screen.container.querySelector('.alert-danger')).not.toBeNull();
    expect(screen.container.querySelector('table')).not.toBeNull();
  });

  it('clears the error once a later request succeeds', async () => {
    let shouldFail = true;
    vi.spyOn(api, 'get').mockImplementation(() =>
      shouldFail
        ? (Promise.reject({ message: 'transient', errors: {}, status: 500 }) as any)
        : (Promise.resolve(okResponse([{ id: 1, name: 'A' }])) as any),
    );

    const screen = renderApiTable();
    await wait(120);
    expect(screen.container.querySelector('.alert-danger')).not.toBeNull();

    shouldFail = false;
    const header = screen.container.querySelector('thead th') as HTMLElement;
    header.click();
    await wait(120);

    expect(screen.container.querySelector('.alert-danger')).toBeNull();
  });
});

/**
 * #99 / #111 / #112 share one root cause: DXTable forwarded only slots whose
 * name started with `cell`, so the footer, empty-state and row-expansion slots
 * BTable already supports never reached it. These cover the whole surface.
 */
describe('DXTable forwards the inner table\'s slots (#99, #111, #112)', () => {
  const rows = [
    { id: 1, name: 'Row A', amount: 10 },
    { id: 2, name: 'Row B', amount: 32 },
  ];
  const fields = [
    { key: 'name', label: 'Name' },
    { key: 'amount', label: 'Amount' },
  ];

  const renderTable = (props: Record<string, any> = {}, slots: Record<string, any> = {}) =>
    render({
      render: () =>
        h(
          BApp,
          {},
          () => h(DXTable, { items: rows, fields, clientSide: true, itemName: 'sale', ...props }, slots),
        ),
    });

  describe('footer / totals row (#99)', () => {
    it('renders a tfoot with footClone, and #foot(<key>) lands under its own column', async () => {
      const screen = renderTable(
        { footClone: true },
        { 'foot(amount)': () => h('strong', { class: 'total' }, '42') },
      );
      await flush();

      const tfoot = screen.container.querySelector('tfoot');
      expect(tfoot).not.toBeNull();

      const total = tfoot!.querySelector('.total');
      expect(total?.textContent).toBe('42');

      // The point of a footer over a summary bar: the number sits under its column.
      const headerCells = [...screen.container.querySelectorAll('thead tr:last-child th')];
      const footerCells = [...tfoot!.querySelectorAll('th, td')];
      const amountColumn = headerCells.findIndex((th) => th.textContent?.includes('Amount'));
      expect(amountColumn).toBeGreaterThanOrEqual(0);
      expect(footerCells[amountColumn]?.textContent).toContain('42');
    });

    it('renders no footer by default', async () => {
      const screen = renderTable();
      await flush();

      expect(screen.container.querySelector('tfoot')).toBeNull();
    });

    it('supports a fully custom footer via custom-foot', async () => {
      const screen = renderTable(
        {},
        { 'custom-foot': () => h('tr', {}, [h('td', { class: 'custom-total' }, 'Total: 42')]) },
      );
      await flush();

      expect(screen.container.querySelector('.custom-total')?.textContent).toBe('Total: 42');
    });
  });

  describe('empty state (#111)', () => {
    it('shows a default message instead of a bare header when there are no rows', async () => {
      const screen = renderTable({ items: [] });
      await flush();

      // Pluralised from itemName.
      expect(screen.container.textContent).toContain('No sales found');
    });

    it('tells the user the filters are why it is empty', async () => {
      const screen = renderTable({
        items: [],
        fields: [{ key: 'name', label: 'Name', filter: 'text' }],
        filters: { name: 'nothing-matches' },
      });
      await flush();

      expect(screen.container.textContent).toContain('No sales match your filters');
    });

    it('honours a custom emptyText', async () => {
      const screen = renderTable({ items: [], emptyText: 'There are no paid sales in this period.' });
      await flush();

      expect(screen.container.textContent).toContain('There are no paid sales in this period.');
    });

    it('forwards the empty slot for a fully custom empty state', async () => {
      const screen = renderTable(
        { items: [] },
        { empty: () => h('div', { class: 'my-empty' }, 'Nothing here yet') },
      );
      await flush();

      expect(screen.container.querySelector('.my-empty')?.textContent).toBe('Nothing here yet');
    });

    it('can be turned off with showEmpty: false', async () => {
      const screen = renderTable({ items: [], showEmpty: false });
      await flush();

      expect(screen.container.textContent).not.toContain('No sales found');
    });
  });

  describe('expandable rows (#112)', () => {
    it('renders row-expansion content for an expanded row', async () => {
      const screen = renderTable(
        { expandedItems: [rows[0]] },
        { 'row-expansion': ({ item }: any) => h('div', { class: 'detail' }, `Detail for ${item.name}`) },
      );
      await flush();

      const detail = screen.container.querySelector('.detail');
      expect(detail).not.toBeNull();
      expect(detail?.textContent).toBe('Detail for Row A');
      // Only the expanded row expands.
      expect(screen.container.querySelectorAll('.detail').length).toBe(1);
    });

    it('renders no expansion content when nothing is expanded', async () => {
      const screen = renderTable(
        { expandedItems: [] },
        { 'row-expansion': () => h('div', { class: 'detail' }, 'Detail') },
      );
      await flush();

      expect(screen.container.querySelector('.detail')).toBeNull();
    });
  });

  describe('the slots DXTable keeps for itself', () => {
    it('still draws its own column headers (sort indicators are not lost)', async () => {
      const screen = renderTable({
        fields: [{ key: 'name', label: 'Name', sortable: true }],
      });
      await flush();

      expect(screen.container.querySelector('.sort-indicator')).not.toBeNull();
    });

    it('does not leak DXTable\'s own header slot into the table', async () => {
      const screen = renderTable({ title: 'Sales' }, { header: () => h('h4', { class: 'card-title' }, 'Sales') });
      await flush();

      // The card header renders, and nothing lands inside the table element.
      expect(screen.container.querySelector('.card-title')?.textContent).toBe('Sales');
      expect(screen.container.querySelector('table .card-title')).toBeNull();
    });
  });
});

/**
 * #110. `perPage` / `sortBy` / `filters` are dual-purpose: with a v-model they
 * are controlled state, without one they read as an initial value. DXTable used
 * to treat any passed value as controlled, so `:per-page="50"` rendered a
 * per-page selector that responded to clicks and changed nothing — two ported
 * pages shipped with a dead selector before it was caught.
 */
describe('DXTable initial-value vs controlled props (#110)', () => {
  const manyRows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
  const nameField = [{ key: 'name', label: 'Name', sortable: true }];

  const pickPerPage = async (screen: any, value: string) => {
    const select = screen.container.querySelector('select') as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(60);
  };

  it('treats a bare :per-page as an INITIAL value — the selector still works', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, { items: manyRows, fields: nameField, clientSide: true, perPage: 20 }),
        ),
    });
    await flush();

    expect(screen.container.querySelectorAll('tbody tr').length).toBe(20);

    await pickPerPage(screen, '10');

    // Before the fix: the select showed 10 and the table kept rendering 25.
    expect(screen.container.querySelectorAll('tbody tr').length).toBe(10);
  });

  it('keeps a v-model:per-page fully controlled — the parent decides', async () => {
    const perPage = ref(20);
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: manyRows,
            fields: nameField,
            clientSide: true,
            perPage: perPage.value,
            'onUpdate:perPage': (value: number) => {
              perPage.value = value;
            },
          }),
        ),
    });
    await flush();
    expect(screen.container.querySelectorAll('tbody tr').length).toBe(20);

    await pickPerPage(screen, '10');

    // The parent accepted the update, so it flows back down.
    expect(perPage.value).toBe(10);
    expect(screen.container.querySelectorAll('tbody tr').length).toBe(10);
  });

  it('a v-model parent that REFUSES the change keeps the table pinned', async () => {
    // The whole point of controlled state: the parent is the source of truth.
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: manyRows,
            fields: nameField,
            clientSide: true,
            perPage: 20,
            'onUpdate:perPage': () => {
              /* parent ignores it */
            },
          }),
        ),
    });
    await flush();

    await pickPerPage(screen, '10');

    expect(screen.container.querySelectorAll('tbody tr').length).toBe(20);
  });

  it('treats a bare :sort-by as an INITIAL sort — the header still sorts', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [
              { id: 1, name: 'Beta' },
              { id: 2, name: 'Alpha' },
            ],
            fields: nameField,
            clientSide: true,
            sortBy: [{ key: 'name', order: 'asc' }],
          }),
        ),
    });
    await flush();

    const firstCell = () =>
      screen.container.querySelector('tbody tr td')?.textContent?.trim();
    expect(firstCell()).toBe('Alpha');

    (screen.container.querySelector('thead th') as HTMLElement).click();
    await wait(60);

    // Before the fix, the prop won every time and this stayed 'Alpha'.
    expect(firstCell()).toBe('Beta');
  });

  it('treats a bare :filters as INITIAL filters — the filter row still works', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [
              { id: 1, name: 'Alpha' },
              { id: 2, name: 'Beta' },
            ],
            fields: [{ key: 'name', label: 'Name', filter: 'text' }],
            clientSide: true,
            filters: { name: 'Alpha' },
          }),
        ),
    });
    await flush();

    expect(screen.container.querySelectorAll('tbody tr').length).toBe(1);

    const input = screen.container.querySelector('.filter-row input') as HTMLInputElement;
    expect(input.value).toBe('Alpha');

    await userEvent.fill(input, 'Beta');
    await wait(80);

    expect(screen.container.querySelectorAll('tbody tr').length).toBe(1);
    expect(screen.container.querySelector('tbody tr td')?.textContent?.trim()).toBe('Beta');
  });
});

/**
 * #110, second half. DXTable seeds the edit form from every `editFields` key,
 * so a presentational field smuggled in as a `span` (a header, an alert) was
 * POSTed alongside the real data — a consumer saw `bookings: []` and
 * `no_places_left: ""` in the payload purely because they were declared.
 */
describe('DXTable presentational edit fields (#110)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const openModalAndSave = async (editFields: any[]) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: {} }),
        }) as any,
    );

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [{ id: 1, name: 'Row A', notice: '' }],
            fields: [{ key: 'name', label: 'Name' }],
            editFields,
            editUrl: '/api/things/:id',
          }),
        ),
    });
    await flush();

    (screen.container.querySelector('tbody tr') as HTMLElement).click();
    await wait(150);

    const saveButton = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.match(/save changes/i),
    ) as HTMLElement;
    expect(saveButton).toBeTruthy();
    saveButton.click();
    await wait(150);

    expect(fetchSpy).toHaveBeenCalled();
    const request = fetchSpy.mock.calls[0][1] as RequestInit;
    return JSON.parse(request.body as string);
  };

  it('does not submit a field marked submit: false', async () => {
    const payload = await openModalAndSave([
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'notice', type: 'text', span: true, submit: false },
    ]);

    expect(payload).toHaveProperty('name');
    expect(payload).not.toHaveProperty('notice');
  });

  it('submits every field by default', async () => {
    const payload = await openModalAndSave([
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'notice', type: 'text', span: true },
    ]);

    expect(payload).toHaveProperty('name');
    expect(payload).toHaveProperty('notice');
  });
});

/**
 * #107. Rows that do something on click must look like it. DXTable already
 * knows whether they're interactive, so a consumer shouldn't have to reach into
 * `:deep(tbody tr)`. The `editFields` case already worked; a bare `@row-clicked`
 * listener (a page opening its own detail modal) was the gap.
 */
describe('DXTable clickable-row affordance (#107)', () => {
  const rows = [{ id: 1, name: 'A' }];
  const fields = [{ key: 'name', label: 'Name' }];

  const cursorOf = async (props: Record<string, any>) => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DXTable, { items: rows, fields, ...props })),
    });
    await wait(80);
    const row = screen.container.querySelector('tbody tr') as HTMLElement;
    return getComputedStyle(row).cursor;
  };

  it('gives rows a pointer when a row-clicked listener is bound', async () => {
    expect(await cursorOf({ onRowClicked: () => {} })).toBe('pointer');
  });

  it('gives rows a pointer when the built-in edit modal is enabled', async () => {
    expect(
      await cursorOf({ editFields: [{ key: 'name', type: 'text', label: 'Name' }] }),
    ).toBe('pointer');
  });

  it('leaves a plain, non-interactive table alone', async () => {
    // The affordance now hangs off a marker class rather than a blanket
    // `tbody tr` rule, so an unstyled row simply has no cursor rule ('auto').
    // What matters is that it doesn't look clickable.
    expect(await cursorOf({})).not.toBe('pointer');
  });
});

/** #106. Four filter/provider gaps found rebuilding a list board. */
describe('DXTable filter and provider gaps (#106)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('a column can filter on a different key (#106.1)', () => {
    it('sends the filter under filterKey, not the column key', async () => {
      const params: any[] = [];
      vi.spyOn(api, 'get').mockImplementation((_url: string, requestParams: any) => {
        params.push(requestParams);
        return Promise.resolve({
          data: { data: [], pagination: { current_page: 1, per_page: 10, total: 0, from: 0, to: 0 } },
        }) as any;
      });

      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              apiUrl: '/api/orders',
              // A display column showing a name, filtering on the server's id param.
              fields: [
                { key: 'customer_name', label: 'Customer', filter: 'text', filterKey: 'customer_id' },
              ],
            }),
          ),
      });
      await wait(80);

      await userEvent.fill(
        screen.container.querySelector('.filter-row input') as HTMLElement,
        '42',
      );
      await wait(400);

      const withFilter = params.filter((p) => Object.keys(p.filters ?? {}).length > 0);
      expect(withFilter.length).toBeGreaterThan(0);
      expect(withFilter.at(-1).filters).toEqual({ customer_id: '42' });
      expect(withFilter.at(-1).filters).not.toHaveProperty('customer_name');
    });

    it('filters client-side on the filterKey too', async () => {
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, {
              items: [
                { id: 1, customer_name: 'Alpha Ltd', customer_id: '10' },
                { id: 2, customer_name: 'Beta Ltd', customer_id: '20' },
              ],
              clientSide: true,
              fields: [
                { key: 'customer_name', label: 'Customer', filter: 'text', filterKey: 'customer_id' },
              ],
            }),
          ),
      });
      await flush();

      await userEvent.fill(
        screen.container.querySelector('.filter-row input') as HTMLElement,
        '20',
      );
      await wait(80);

      const rows = screen.container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Beta Ltd');
    });
  });

  describe('a select filter can express "no value" (#106.2)', () => {
    const fields = [
      {
        key: 'assignee',
        label: 'Assignee',
        filter: 'select',
        filterOptions: [{ value: 'sam', text: 'Sam' }],
        filterNullText: 'Unassigned',
      },
    ];
    const items = [
      { id: 1, assignee: 'sam' },
      { id: 2, assignee: null },
      { id: 3, assignee: '' },
    ];

    it('offers the null option in the filter', async () => {
      const screen = render({
        render: () => h(BApp, {}, () => h(DXTable, { items, clientSide: true, fields })),
      });
      await flush();

      const input = screen.container.querySelector('.filter-row input') as HTMLElement;
      await userEvent.click(input);
      await wait(80);

      expect(document.body.textContent).toContain('Unassigned');
    });

    it('matches rows with no value when it is chosen', async () => {
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXTable, { items, clientSide: true, fields, filters: { assignee: 'null' } }),
          ),
      });
      await flush();

      // Both the null and the empty-string row count as "no value".
      expect(screen.container.querySelectorAll('tbody tr').length).toBe(2);
    });
  });

  it('gives a custom provider a pager from the pagination prop (#106.3)', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            provider: () => Promise.resolve([{ id: 1, name: 'A' }]),
            fields: [{ key: 'name', label: 'Name' }],
            pagination: { current_page: 1, per_page: 10, total: 45, from: 1, to: 10 },
          }),
        ),
    });
    await wait(150);

    // Before: apiPaginationMeta was only populated by the built-in provider, so
    // a custom one rendered a table with no pager and no warning.
    expect(screen.container.querySelector('.dx-pager')).not.toBeNull();
    expect(screen.container.textContent).toContain('out of 45');
  });

  it('renders an empty header for an explicitly empty label (#106.4)', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [{ id: 1, name: 'A' }],
            clientSide: true,
            fields: [
              { key: 'name', label: 'Name' },
              { key: 'actions', label: '' },
            ],
          }),
        ),
    });
    await flush();

    const headers = [...screen.container.querySelectorAll('thead th')];
    const actionsHeader = headers[headers.length - 1];
    // The key used to leak through as the header text.
    expect(actionsHeader.textContent?.trim()).toBe('');
    expect(actionsHeader.textContent).not.toContain('actions');
  });
});

/**
 * Codex review of the #105/#106/#107/#110 batch. Three real defects, all of the
 * same shape: a fix wired at ONE of the places that needed it.
 */
describe('DXTable review fixes (#106, #110)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the per-page selector for a custom provider, not just the page buttons', async () => {
    // The pager read `providerPagination` but the selector still read
    // `apiPaginationMeta`, which only the built-in provider populates — so a
    // custom provider got page buttons and no per-page selector.
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            provider: () => Promise.resolve([{ id: 1, name: 'A' }]),
            fields: [{ key: 'name', label: 'Name' }],
            pagination: { current_page: 1, per_page: 10, total: 45, from: 1, to: 10 },
          }),
        ),
    });
    await wait(150);

    expect(screen.container.querySelector('.dx-pager')).not.toBeNull();
    expect(screen.container.textContent).toContain('Per page');
  });

  it('filters client-side on the column a row actually has, when it lacks the filterKey', async () => {
    // `filterKey` names the param the SERVER filters on. A local row may not
    // carry it at all, and matching only on it made every row fail.
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [{ id: 1, customer_name: 'Alpha Ltd' }, { id: 2, customer_name: 'Beta Ltd' }],
            clientSide: true,
            fields: [
              { key: 'customer_name', label: 'Customer', filter: 'text', filterKey: 'customer_id' },
            ],
          }),
        ),
    });
    await flush();

    await userEvent.fill(
      screen.container.querySelector('.filter-row input') as HTMLElement,
      'Beta',
    );
    await wait(80);

    const rows = screen.container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Beta Ltd');
  });

  it('strips a submit:false field from the payload even after the form writes it back', async () => {
    // submit:false only skipped SEEDING. The modal still renders the field, so
    // a control (or a span slot calling `update`) wrote the key straight back
    // into form.data, and the whole of form.data was submitted.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: {} }),
        }) as any,
    );

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [{ id: 1, name: 'Row A', notice: '' }],
            fields: [{ key: 'name', label: 'Name' }],
            // A plain (non-span) field marked submit:false — it renders a real
            // control, so the user can type into it.
            editFields: [
              { key: 'name', type: 'text', label: 'Name' },
              { key: 'notice', type: 'text', label: 'Notice', submit: false },
            ],
            editUrl: '/api/things/:id',
          }),
        ),
    });
    await flush();

    (screen.container.querySelector('tbody tr') as HTMLElement).click();
    await wait(150);

    // Type into the presentational field, so it definitely lands in form.data.
    const inputs = [...document.querySelectorAll('.modal input[type="text"]')] as HTMLInputElement[];
    await userEvent.fill(inputs[inputs.length - 1], 'typed into it');
    await wait(60);

    const saveButton = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.match(/save changes/i),
    ) as HTMLElement;
    saveButton.click();
    await wait(150);

    const payload = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(payload).toHaveProperty('name');
    expect(payload).not.toHaveProperty('notice');
  });
});

/**
 * A select filter's dropdown listed only the values, so once a filter was
 * picked the only way back to *unfiltered* was the ✕ — which isn't discoverable
 * from inside the open list. Reported live: "All statuses is not actually shown
 * in this dropdown".
 */
describe('DXTable select filter offers a way back to unfiltered', () => {
  const items = [
    { id: 1, status: 'pending' },
    { id: 2, status: 'printed' },
  ];
  const fields = [
    {
      key: 'status',
      label: 'statuses',
      filter: 'select',
      filterOptions: [
        { value: 'pending', text: 'pending' },
        { value: 'printed', text: 'printed' },
      ],
    },
  ];

  // bvn only mounts the option list once the user types into the control, so
  // that's how the options are surfaced here.
  const optionsMatching = async (screen: any, typed: string) => {
    const input = screen.container.querySelector('.filter-row input') as HTMLElement;
    await userEvent.click(input);
    await userEvent.fill(input, typed);
    await wait(150);
    return [...document.querySelectorAll('[role="option"]')] as HTMLElement[];
  };

  it('offers an "All statuses" option, so the list has a way back to unfiltered', async () => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DXTable, { items, fields, clientSide: true })),
    });
    await flush();

    const options = await optionsMatching(screen, 'All');
    expect(options.map((o) => o.textContent)).toContain('All statuses');
  });

  it('picking it clears the filter and shows every row again', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, { items, fields, clientSide: true, filters: { status: 'pending' } }),
        ),
    });
    await flush();
    expect(screen.container.querySelectorAll('tbody tr').length).toBe(1);

    const options = await optionsMatching(screen, 'All');
    const all = options.find((o) => o.textContent === 'All statuses') as HTMLElement;
    expect(all).toBeTruthy();
    all.click();
    await wait(150);

    expect(screen.container.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('uses the filter placeholder wording, so the option and the resting state match', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items,
            fields: [{ ...fields[0], filterPlaceholder: 'Any status' }],
            clientSide: true,
          }),
        ),
    });
    await flush();

    const input = screen.container.querySelector('.filter-row input') as HTMLInputElement;
    expect(input.placeholder).toBe('Any status');

    const options = await optionsMatching(screen, 'Any');
    expect(options.map((o) => o.textContent)).toContain('Any status');
  });

  it('offers no lone "All x" when the column has no values to filter by', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items,
            fields: [{ key: 'status', label: 'statuses', filter: 'select' }],
            clientSide: true,
          }),
        ),
    });
    await flush();

    const options = await optionsMatching(screen, 'All');
    expect(options.map((o) => o.textContent)).not.toContain('All statuses');
  });
});

/**
 * #117. The edit modal seeded every field with `row[key] ?? default ?? ''` and
 * submitted the lot — including fields whose `when:` predicate currently hides
 * them. Editing an amount-type discount whose hidden `discount_percentage` was
 * null silently wrote the field's default (10): the user changed the name, and
 * an invisible column gained a value they never chose.
 */
describe('DXTable edit modal does not write hidden fields (#117)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // An amount-type discount: the percentage field is hidden, and null in the row.
  const discountFields = [
    { key: 'name', type: 'text', label: 'Name' },
    { key: 'kind', type: 'text', label: 'Kind' },
    {
      key: 'discount_percentage',
      type: 'number',
      label: 'Percentage',
      default: 10,
      when: (model: any) => model.kind === 'percentage',
    },
  ];

  const editAndSave = async (row: Record<string, any>, editFields: any[] = discountFields) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: {} }),
        }) as any,
    );

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [row],
            fields: [{ key: 'name', label: 'Name' }],
            editFields,
            editUrl: '/api/discounts/:id',
          }),
        ),
    });
    await flush();
    (screen.container.querySelector('tbody tr') as HTMLElement).click();
    await wait(150);

    const save = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.match(/save changes/i),
    ) as HTMLElement;
    save.click();
    await wait(150);

    return JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
  };

  it('omits a field hidden by `when` from the payload', async () => {
    const payload = await editAndSave({
      id: 1,
      name: 'Ten pounds off',
      kind: 'amount',
      discount_percentage: null,
    });

    expect(payload).toHaveProperty('name');
    // The whole bug: this used to arrive as 10, from the field's `default`.
    expect(payload).not.toHaveProperty('discount_percentage');
  });

  it('submits the field once its `when` makes it visible', async () => {
    const payload = await editAndSave({
      id: 1,
      name: 'Ten percent off',
      kind: 'percentage',
      discount_percentage: 15,
    });

    expect(payload.discount_percentage).toBe(15);
  });

  it('never seeds a default over an explicitly null row value', async () => {
    // Presence, not nullishness, decides: `row[key] ?? default` can't tell "no
    // such key" from "the value IS null", so a null column got the default.
    const visibleWhenNull = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'rounding', type: 'number', label: 'Rounding', default: 10 },
    ];

    const payload = await editAndSave({ id: 1, name: 'A', rounding: null }, visibleWhenNull);

    expect(payload.rounding).toBeNull();
  });

  it('still applies the default when the row genuinely lacks the key', async () => {
    const fields = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'rounding', type: 'number', label: 'Rounding', default: 10 },
    ];

    const payload = await editAndSave({ id: 1, name: 'A' }, fields);

    expect(payload.rounding).toBe(10);
  });
});

/**
 * #122. The #117 presence rule reached the EDIT paths but not CREATE, so the
 * two disagreed about the same field: `field.default ?? ''` cannot express a
 * null default, and a select whose "none" option is `value: null` (which is
 * what the column stores) rendered blank on create and matched no option.
 */
describe('DXTable create modal seeds a null default as null (#122)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const roundingFields = [
    { key: 'name', type: 'text', label: 'Name' },
    {
      key: 'rounding',
      type: 'select',
      label: 'Rounding',
      default: null,
      options: [
        { value: null, text: 'No rounding' },
        { value: 5, text: 'Nearest 5p' },
      ],
    },
  ];

  const createAndSave = async (editFields: any[] = roundingFields, openTwice = false) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: {} }),
        }) as any,
    );

    const tableRef = ref<any>(null);
    render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            ref: tableRef,
            items: [{ id: 1, name: 'A', rounding: 5 }],
            fields: [{ key: 'name', label: 'Name' }],
            editFields,
            editUrl: '/api/discounts/:id',
            createUrl: '/api/discounts',
          }),
        ),
    });
    await flush();

    if (openTwice) {
      // The reseed-in-place branch: the form object already exists, so a second
      // openCreate() takes the `else` arm of handleCreateNew.
      tableRef.value.openCreate();
      await wait(100);
      const cancel = [...document.querySelectorAll('button')].find((button) =>
        button.textContent?.match(/cancel/i),
      ) as HTMLElement;
      cancel.click();
      await wait(100);
    }

    tableRef.value.openCreate();
    await wait(150);

    const create = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.trim().match(/^create$/i),
    ) as HTMLElement;
    create.click();
    await wait(150);

    return {
      payload: JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string),
    };
  };

  it('seeds a null default as null, not an empty string', async () => {
    const { payload } = await createAndSave();

    // The whole bug: `field.default ?? ''` sent '' here, which matches no option.
    expect(payload.rounding).toBeNull();
  });

  it('seeds a null default as null when the form is reopened, too', async () => {
    const { payload } = await createAndSave(roundingFields, true);

    expect(payload.rounding).toBeNull();
  });

  it('still falls back to an empty string for a field with no default at all', async () => {
    const { payload } = await createAndSave([
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'note', type: 'text', label: 'Note' },
    ]);

    expect(payload.note).toBe('');
  });

  it('still applies a non-null default', async () => {
    const { payload } = await createAndSave([
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'rounding', type: 'number', label: 'Rounding', default: 10 },
    ]);

    expect(payload.rounding).toBe(10);
  });
});

/**
 * #118. `clientSideCurrentPage` was only reset on filter/per-page changes, so a
 * shrinking `items` prop (a report refetching a narrower date range) left it
 * pointing past the end. The pagination metadata clamped for display, but the
 * SLICE used the raw value — the pager said "page 2 of 2" while the table
 * sliced page 6 and rendered zero rows.
 */
describe('DXTable client-side page is clamped when items shrink (#118)', () => {
  // A per-page preference persisted by an earlier test would win over the
  // `perPage` prop (getInitialPerPage prefers localStorage), making these
  // order-dependent.
  beforeEach(() => localStorage.removeItem('dxtable-perpage-table'));
  afterEach(() => localStorage.removeItem('dxtable-perpage-table'));

  const rowsOf = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));

  const renderTable = (items: any[]) => {
    const data = ref(items);
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: data.value,
            fields: [{ key: 'name', label: 'Name' }],
            clientSide: true,
            perPage: 20,
          }),
        ),
    });
    return { screen, data };
  };

  const goToPage = async (screen: any, page: number) => {
    const link = [...screen.container.querySelectorAll('.dx-pager .btn')].find(
      (element) => element.textContent?.trim() === String(page),
    ) as HTMLElement;
    expect(link, `no page-${page} link in the pager`).toBeTruthy();
    link.click();
    await wait(100);
  };

  const activePage = (screen: any) =>
    screen.container.querySelector('.dx-pager .btn[aria-current="page"]')?.textContent?.trim();

  it('renders rows instead of a blank table when the data shrinks under the current page', async () => {
    // 60 rows @ 20 = 3 pages.
    const { screen, data } = renderTable(rowsOf(60));
    await flush();

    await goToPage(screen, 3);
    expect(screen.container.querySelectorAll('tbody tr').length).toBe(20);

    // The consumer refetches a narrower dataset — page 3 no longer exists.
    data.value = rowsOf(40);
    await wait(150);

    // Before: the pager clamped for DISPLAY while the slice used the raw page,
    // so the table rendered zero rows on data that plainly has rows.
    const rows = screen.container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(20);

    // Clamped to the LAST valid page, not reset to the first — keeps the user
    // near where they were.
    expect(activePage(screen)).toBe('2');
    expect(rows[0].textContent).toContain('Row 21');
  });

  it('leaves an in-range page alone', async () => {
    const { screen, data } = renderTable(rowsOf(60));
    await flush();
    await goToPage(screen, 2);

    data.value = rowsOf(40); // still 2 pages
    await wait(150);

    expect(activePage(screen)).toBe('2');
    expect(screen.container.querySelectorAll('tbody tr').length).toBe(20);
  });

  it('recovers when the data shrinks to a single page', async () => {
    const { screen, data } = renderTable(rowsOf(60));
    await flush();
    await goToPage(screen, 3);

    data.value = rowsOf(5);
    await wait(150);

    expect(screen.container.querySelectorAll('tbody tr').length).toBe(5);
  });
});

/**
 * #114. bootstrap-vue-next's BTable captures its slot set at mount, so a
 * `cell(...)` slot that comes into existence later — data-driven columns, known
 * only once a fetch resolves — never reaches the cells and the column renders
 * raw values. Verified against raw BTable, so it isn't our forwarding dropping
 * it; the inner table is keyed on the slot-name set instead.
 */
describe('DXTable forwards cell slots created after the first render (#114)', () => {
  const renderWithLateColumns = () => {
    const columns = ref<string[]>([]);
    const screen = render({
      render: () => {
        const slots: Record<string, any> = {};
        for (const column of columns.value) {
          slots[`cell(${column})`] = ({ value }: any) =>
            h('strong', { class: 'slotted' }, `£${value}`);
        }
        return h(BApp, {}, () =>
          h(
            DXTable,
            {
              items: [{ id: 1, food: 10, drink: 20 }],
              clientSide: true,
              fields: [
                { key: 'id', label: 'ID' },
                ...columns.value.map((column) => ({ key: column, label: column })),
              ],
            },
            slots,
          ),
        );
      },
    });
    return { screen, columns };
  };

  it('renders through a cell slot that only exists after the columns arrive', async () => {
    const { screen, columns } = renderWithLateColumns();
    await flush();
    expect(screen.container.querySelectorAll('.slotted').length).toBe(0);

    // The report fetch resolves and the column set appears.
    columns.value = ['food', 'drink'];
    await wait(200);

    // Before: the columns appeared but rendered raw values, as if no cell slot
    // existed — and the only fix was remounting the whole table.
    expect(screen.container.querySelectorAll('.slotted').length).toBe(2);
    expect(screen.container.querySelector('tbody tr')?.textContent).toContain('£10');
  });

  it('keeps table state across a column-set change (that is the point)', async () => {
    // Consumers were remounting DXTable itself, which threw away per-page,
    // filters, sort and page. Only the inner table remounts now.
    const columns = ref<string[]>([]);
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(
            DXTable,
            {
              items: Array.from({ length: 40 }, (_, i) => ({ id: i + 1, food: i })),
              clientSide: true,
              perPage: 20,
              fields: [
                { key: 'id', label: 'ID' },
                ...columns.value.map((column) => ({ key: column, label: column })),
              ],
            },
            Object.fromEntries(
              columns.value.map((column) => [
                `cell(${column})`,
                ({ value }: any) => h('strong', { class: 'slotted' }, String(value)),
              ]),
            ),
          ),
        ),
    });
    await flush();

    const page2 = [...screen.container.querySelectorAll('.dx-pager .btn')].find(
      (element) => element.textContent?.trim() === '2',
    ) as HTMLElement;
    page2.click();
    await wait(100);

    columns.value = ['food'];
    await wait(200);

    // Still on page 2, and the late slot rendered.
    expect(
      screen.container.querySelector('.dx-pager .btn[aria-current="page"]')?.textContent?.trim(),
    ).toBe('2');
    expect(screen.container.querySelectorAll('.slotted').length).toBeGreaterThan(0);
  });
});

/**
 * #115. A row-clicked table can have rows that aren't navigable. With no hook,
 * the consumer resorted to a global `tbody tr:has(.marker) { cursor: default }`
 * that coupled to DXTable's internal DOM and could collide across pages.
 */
describe('DXTable row class and non-actionable rows (#115)', () => {
  const items = [
    { id: 1, name: 'Has rota', rota: true },
    { id: 2, name: 'No rota', rota: false },
  ];

  const renderTable = (props: Record<string, any> = {}) => {
    const clicked: any[] = [];
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items,
            fields: [{ key: 'name', label: 'Name' }],
            clientSide: true,
            onRowClicked: (item: any) => clicked.push(item),
            ...props,
          }),
        ),
    });
    return { screen, clicked };
  };

  const rows = (screen: any) => [...screen.container.querySelectorAll('tbody tr')] as HTMLElement[];

  it('applies a rowClass function to the <tr>', async () => {
    const { screen } = renderTable({
      rowClass: (item: any) => (item.rota ? 'has-rota' : 'no-rota'),
    });
    await flush();

    expect(rows(screen)[0].classList.contains('has-rota')).toBe(true);
    expect(rows(screen)[1].classList.contains('no-rota')).toBe(true);
  });

  it('applies a plain string rowClass to every row', async () => {
    const { screen } = renderTable({ rowClass: 'compact' });
    await flush();

    expect(rows(screen).every((row) => row.classList.contains('compact'))).toBe(true);
  });

  it('does not make a non-actionable row look clickable', async () => {
    const { screen } = renderTable({ rowClickable: (item: any) => item.rota });
    await flush();

    expect(getComputedStyle(rows(screen)[0]).cursor).toBe('pointer');
    // The whole point: no pointer on the row that goes nowhere.
    expect(getComputedStyle(rows(screen)[1]).cursor).not.toBe('pointer');
  });

  it('does not fire row-clicked for a non-actionable row', async () => {
    // A row that doesn't look clickable must not BE clickable, or a click that
    // looks dead quietly navigates.
    const { screen, clicked } = renderTable({ rowClickable: (item: any) => item.rota });
    await flush();

    rows(screen)[1].click();
    await wait(80);
    expect(clicked).toHaveLength(0);

    rows(screen)[0].click();
    await wait(80);
    expect(clicked).toHaveLength(1);
  });
});

/**
 * #120. DXTable reserves the above-header position for its filter row, so a
 * consumer's `thead-top` was dropped: a grouped "Payment method" banner spanning
 * three columns had nowhere to go, and a pinned totals row had to settle for
 * `top-row` (the first BODY row, below the header) — a visible downgrade. The
 * two are now composed rather than one excluding the other.
 */
describe('DXTable composes a consumer thead-top above its filter row (#120)', () => {
  const items = [{ id: 1, card: 10, cash: 20 }];
  const fields = [
    { key: 'id', label: 'ID' },
    { key: 'card', label: 'Card' },
    { key: 'cash', label: 'Cash' },
  ];

  const banner = () => h('tr', { class: 'banner' }, [h('th', { colspan: 3 }, 'Payment method')]);

  const renderTable = (extraFields: any[] = []) =>
    render({
      render: () =>
        h(
          BApp,
          {},
          () =>
            h(
              DXTable,
              { items, clientSide: true, fields: [...fields, ...extraFields] },
              { 'thead-top': banner },
            ),
        ),
    });

  it('renders the consumer banner above the column headers', async () => {
    const screen = renderTable();
    await flush();

    const bannerRow = screen.container.querySelector('thead .banner');
    expect(bannerRow).not.toBeNull();
    expect(bannerRow?.textContent).toContain('Payment method');
    // Spanning its columns, which is the whole point of a grouped banner.
    expect(bannerRow?.querySelector('th')?.getAttribute('colspan')).toBe('3');
  });

  it('puts it above the filter row, not instead of it', async () => {
    const screen = renderTable([{ key: 'note', label: 'Note', filter: 'text' }]);
    await flush();

    const headRows = [...screen.container.querySelectorAll('thead tr')];
    const bannerIndex = headRows.findIndex((row) => row.classList.contains('banner'));
    const filterIndex = headRows.findIndex((row) => row.classList.contains('filter-row'));

    expect(bannerIndex).toBeGreaterThanOrEqual(0);
    expect(filterIndex).toBeGreaterThanOrEqual(0);
    // Both present, banner first — DXTable's filter row used to exclude it entirely.
    expect(bannerIndex).toBeLessThan(filterIndex);
  });

  it('still renders the filter row when there is no thead-top slot', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items,
            clientSide: true,
            fields: [...fields, { key: 'note', label: 'Note', filter: 'text' }],
          }),
        ),
    });
    await flush();

    expect(screen.container.querySelector('thead .filter-row')).not.toBeNull();
    expect(screen.container.querySelector('thead .banner')).toBeNull();
  });
});

/**
 * A confirmed drift found in the whole-repo review: Inertia navigations are
 * assembled in five places, and the debounced filter-change handler was the one
 * that omitted `perPage`. So a user who picked a non-default page size, then
 * changed a filter, silently lost their page size — the request dropped `perPage`
 * and Laravel fell back to its default. Same "quietly does nothing" family as
 * #110/#124. The controlled-`filters` watch already sent `perPage`; only the
 * local handler disagreed.
 */
describe('DXTable Inertia filter-change keeps the selected perPage', () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
  const fields = [{ key: 'name', label: 'Name', filter: 'text' as const }];

  // Inertia mode reads perPage from pagination.per_page, not localStorage, so a
  // stored preference can't affect this test today — but the dxtable-perpage-*
  // key is a documented source of order-dependent flakiness (see CLAUDE.md), so
  // clear it defensively in case that precedence ever changes.
  beforeEach(() => localStorage.removeItem('dxtable-perpage--customers'));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('dxtable-perpage--customers');
  });

  it('sends perPage on the debounced filter navigation, not just page/filters/sort', async () => {
    const getSpy = vi.spyOn(router, 'get').mockImplementation(() => {});

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: rows,
            fields,
            inertiaUrl: '/customers',
            // In Inertia mode effectivePerPage prefers the server's per_page.
            pagination: { current_page: 1, per_page: 50, total: 100, from: 1, to: 50 },
          }),
        ),
    });
    await flush();

    const filterInput = screen.container.querySelector(
      '.filter-row input',
    ) as HTMLInputElement;
    expect(filterInput).toBeTruthy();

    filterInput.value = 'ro';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Past the 300ms filter debounce.
    await wait(400);

    expect(getSpy).toHaveBeenCalled();
    const [url, data] = getSpy.mock.calls[getSpy.mock.calls.length - 1];
    expect(url).toBe('/customers');
    // The whole bug: this navigation dropped perPage, so Laravel re-defaulted it.
    expect((data as Record<string, unknown>).perPage).toBe(50);
    expect(data).toHaveProperty('filters');
  });
});

/**
 * #124. `getInitialPerPage()` read a persisted per-page from localStorage and
 * preferred it over the `perPage` prop, so `:per-page="20"` (which since #110
 * means "start at 20") was silently overridden by whatever the user last picked
 * on some OTHER table. Compounded by the fallback storage key being the literal
 * `table` — shared by every keyless client-side table, so they clobbered each
 * other's preference. Fix: an explicitly-passed `perPage` wins over the stored
 * value, and keyless tables don't persist at all.
 */
describe('DXTable explicit perPage wins over a stored preference (#124)', () => {
  const KEYLESS_KEY = 'dxtable-perpage-table';
  beforeEach(() => localStorage.removeItem(KEYLESS_KEY));
  afterEach(() => localStorage.removeItem(KEYLESS_KEY));

  const manyRows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
  const nameField = [{ key: 'name', label: 'Name', sortable: true }];

  const pickPerPage = async (screen: any, value: string) => {
    const select = screen.container.querySelector('select') as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(60);
  };

  it('starts at the explicitly-passed :per-page, not a conflicting stored value', async () => {
    // A value this user once picked on a DIFFERENT table.
    localStorage.setItem(KEYLESS_KEY, '10');

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: manyRows,
            fields: nameField,
            clientSide: true,
            perPage: 20,
            perPageOptions: [10, 20, 50, 100],
          }),
        ),
    });
    await flush();

    // Before the fix: the stored 10 won and the table rendered 10 rows.
    expect(screen.container.querySelectorAll('tbody tr').length).toBe(20);
  });

  it('does not persist a keyless client-side table (no shared `table` key collision)', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, { items: manyRows, fields: nameField, clientSide: true }),
        ),
    });
    await flush();

    await pickPerPage(screen, '50');

    // Before the fix: this wrote `dxtable-perpage-table`, which every other
    // keyless table then read back as its starting size — a cross-table leak.
    expect(localStorage.getItem(KEYLESS_KEY)).toBeNull();
  });
});

/**
 * #127. On a client-side table, `show-pagination: false` hides the pager but the
 * footer's "N items." caption still rendered, so a page ported from a plain
 * `<b-table>` gained a caption it never had. `show-count` (default true)
 * suppresses just that caption, independent of the pager.
 */
describe('DXTable show-count suppresses the item-count caption (#127)', () => {
  const fiveRows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
  const nameField = [{ key: 'name', label: 'Name' }];

  const paginationFooter = (screen: any) =>
    screen.container.querySelector('.dx-table-pagination') as HTMLElement | null;

  it('shows the count caption by default', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, { items: fiveRows, fields: nameField, clientSide: true }),
        ),
    });
    await flush();

    const footer = paginationFooter(screen);
    expect(footer).toBeTruthy();
    expect(footer!.textContent).toContain('5 items.');
  });

  it('suppresses the count caption when show-count is false', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: fiveRows,
            fields: nameField,
            clientSide: true,
            showCount: false,
          }),
        ),
    });
    await flush();

    const footer = paginationFooter(screen);
    // Only the caption goes; the pager itself is still governed by show-pagination.
    expect(footer?.textContent ?? '').not.toContain('items.');
  });
});
