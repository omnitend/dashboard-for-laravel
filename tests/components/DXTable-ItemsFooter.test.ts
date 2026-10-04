import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

/**
 * A plain `:items` table (no clientSide, pagination, apiUrl or provider) is
 * "inertia mode", and its footer read the `pagination` prop's withDefaults
 * placeholder (`total: 0`): two rows rendered above "0 items.". With no
 * `pagination` passed, the rows given are the whole set and the footer must
 * describe them. A passed `pagination` keeps driving the footer as before.
 */
const nameField = [{ key: 'name', label: 'Name' }];
const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `Row ${index + 1}` }));

const footerOf = (container: Element) =>
    container.querySelector('.dx-table-pagination') as HTMLElement | null;
const pagerOf = (container: Element) =>
    container.querySelector('.dx-table-pagination nav[aria-label="Pagination"]');
const renderedRowCount = (container: Element) =>
    container.querySelectorAll('tbody tr:not(.b-table-empty-row)').length;

describe('DXTable footer for a plain items table', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('counts the rows it was given when no pagination is passed', async () => {
        const screen = render(DXTable, { props: { items: rows(2), fields: nameField } });

        await expect.element(screen.getByText('Row 2')).toBeVisible();
        // Positive control: the rows really rendered, so the footer has
        // something to describe.
        expect(renderedRowCount(screen.container)).toBe(2);
        expect(footerOf(screen.container)?.textContent).toContain('2 items.');
        expect(footerOf(screen.container)?.textContent).not.toContain('0 items.');
        expect(pagerOf(screen.container)).toBeNull();
    });

    it('treats more rows than the default page size as one page, with no pager', async () => {
        const screen = render(DXTable, { props: { items: rows(20), fields: nameField } });

        await expect.element(screen.getByText('Row 20')).toBeVisible();
        expect(renderedRowCount(screen.container)).toBe(20);
        expect(footerOf(screen.container)?.textContent).toContain('20 items.');
        expect(pagerOf(screen.container)).toBeNull();
    });

    it('counts the rows of a source inertia table too', async () => {
        const screen = render(DXTable, {
            props: { source: { mode: 'inertia', items: rows(3) }, fields: nameField },
        });

        await expect.element(screen.getByText('Row 3')).toBeVisible();
        expect(footerOf(screen.container)?.textContent).toContain('3 items.');
    });

    it('keeps "0 items." and the empty text when there are no rows', async () => {
        const screen = render(DXTable, {
            props: { items: [], fields: nameField, emptyText: 'Nothing here' },
        });

        await expect.element(screen.getByText('Nothing here')).toBeVisible();
        expect(footerOf(screen.container)?.textContent).toContain('0 items.');
    });

    it('shows the loading state, not the empty text, while busy with no rows', async () => {
        const screen = render(DXTable, {
            props: {
                items: [],
                fields: nameField,
                busy: true,
                loadingText: 'Loading rows...',
                emptyText: 'Nothing here',
            },
        });

        await expect.element(screen.getByText('Loading rows...')).toBeVisible();
        await expect.element(screen.getByText('Nothing here')).not.toBeInTheDocument();
        expect(footerOf(screen.container)?.textContent).toContain('0 items.');
    });

    it('still drives the footer and pager from a passed pagination', async () => {
        const screen = render(DXTable, {
            props: {
                items: rows(15),
                fields: nameField,
                pagination: { current_page: 1, per_page: 15, total: 40, from: 1, to: 15 },
            },
        });

        await expect.element(screen.getByText('Row 15')).toBeVisible();
        expect(footerOf(screen.container)?.textContent).toContain('1 to 15 out of 40 items.');
        expect(pagerOf(screen.container)).not.toBeNull();
    });
});
