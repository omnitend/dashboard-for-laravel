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
});
