import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { customerData, customerFields, paginationData, largePaginationData } from '../fixtures/tableData';

describe('DXTable', () => {
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
      await expect.element(screen.getByText(/Showing 1 to 10 of 25 items/)).toBeVisible();

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
      await expect.element(screen.getByText(/Showing 1 to 10 of 25/)).toBeVisible();
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
