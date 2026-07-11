import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import axios from 'axios';
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

    // greendragon drives the modal from a navbar button and hides the header
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
      const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
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
      vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}) as any);

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
      const paginationButtons = screen.container.querySelectorAll('.pagination .page-item');
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
      const paginationElements = screen.container.querySelectorAll('.pagination');
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
      const pageItems = screen.container.querySelectorAll('.pagination .page-item');

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
      const paginationButtons = screen.container.querySelectorAll('.pagination .page-link');

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

      expect(screen.container.querySelector('#perPageSelectClientSide')).toBeNull();
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

      expect(screen.container.querySelector('#perPageSelectClientSide')).toBeTruthy();
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
        .spyOn(axios, 'get')
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
      expect((newUrlCalls[0][1] as any).params.page).toBe(1);
      expect(getSpy.mock.calls.length).toBe(callsAfterInitial + 1);

      // The rendered rows reflect the new url, not the stale ones.
      await wait(10);
      expect(screen.container.textContent).toContain('Archived Co');
      expect(screen.container.textContent).not.toContain('Current Co');
    });

    it('resets to page 1 and refetches once when api-url changes while past page 1', async () => {
      // A multi-page dataset so the user can be on page 2 when the url changes.
      const getSpy = vi.spyOn(axios, 'get').mockImplementation((url: string, config?: any) => {
        const page = config?.params?.page ?? 1;
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
        screen.container.querySelectorAll('.pagination button, .pagination a'),
      ).find((el) => el.textContent?.trim() === '2') as HTMLElement | undefined;
      expect(pageTwo).toBeTruthy();
      pageTwo!.click();
      await wait(30);
      expect(
        getSpy.mock.calls.some((c) => c[0] === '/api/things' && (c[1] as any).params.page === 2),
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
      expect((newCalls[0][1] as any).params.page).toBe(1);
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
    vi.spyOn(axios, 'get').mockImplementation((_url: string, config: any) => {
      params.push(config?.params);
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
    vi.spyOn(axios, 'get').mockImplementation((_url: string, config: any) => {
      params.push(config?.params);
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
    vi.spyOn(axios, 'get').mockImplementation(
      () =>
        Promise.reject({
          response: { status: 400, data: { message: 'Requested sort is not allowed' } },
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
    vi.spyOn(axios, 'get').mockImplementation(
      () => Promise.reject({ response: { data: { message: 'nope' } } }) as any,
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
    vi.spyOn(axios, 'get').mockImplementation(() =>
      shouldFail
        ? (Promise.reject({ response: { data: { message: 'transient' } } }) as any)
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
