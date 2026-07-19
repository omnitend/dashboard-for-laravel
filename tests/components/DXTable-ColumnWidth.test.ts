import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref, nextTick } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// A deliberately long value so that, under content-sizing (the pre-fix
// behaviour), the "name" column is stretched wide by this one row. Removing the
// row would then let the column shrink — the exact "columns jump when a filter
// narrows the rows" reflow this issue (#156) is about.
const LONG_NAME =
    'A really extremely very long customer business name that stretches the column';

/**
 * Two datasets that differ only in whether the wide row is present. Swapping
 * from the first to the second is the "a filter narrowed the rows" event: the
 * widest content in the "name" column disappears, so under content-sizing the
 * column would visibly resize.
 */
const rowsWithWideValue = () => [
    { id: 0, name: LONG_NAME, code: 'LONG-CODE-000', notes: 'first' },
    { id: 1, name: 'Al', code: 'X', notes: 'a' },
    { id: 2, name: 'Bo', code: 'Y', notes: 'b' },
    { id: 3, name: 'Cy', code: 'Z', notes: 'c' },
];

const rowsWithoutWideValue = () => [
    { id: 1, name: 'Al', code: 'X', notes: 'a' },
    { id: 2, name: 'Bo', code: 'Y', notes: 'b' },
    { id: 3, name: 'Cy', code: 'Z', notes: 'c' },
];

// Two sized columns + one auto column to absorb any table-width slack, so the
// sized columns render at exactly their declared width (the auto column takes
// the remainder) rather than being scaled up to fill the table.
const sizedFields = [
    { key: 'name', label: 'Name', width: 260 },
    { key: 'code', label: 'Code', width: 120 },
    { key: 'notes', label: 'Notes' },
];

const plainFields = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'notes', label: 'Notes' },
];

// The header <th> for the first (name) column — the element whose width we track
// across the row change. Any cell in the column would do; the header is always
// present regardless of how many body rows survive the "filter".
const nameHeaderWidth = (container: Element): number => {
    const headerCells = container.querySelectorAll('thead th');
    return headerCells[0]!.getBoundingClientRect().width;
};

describe('DXTable opt-in stable column widths (#156)', () => {
    beforeEach(() => {
        // A stored per-page preference would make width tests order-dependent by
        // changing how many rows render (a known DXTable wart, #124). These
        // tables are keyless (client-side, no url) so they never persist, but
        // clear defensively.
        try {
            Object.keys(localStorage)
                .filter((key) => key.startsWith('dxtable-perpage-'))
                .forEach((key) => localStorage.removeItem(key));
        } catch {
            /* no localStorage in this environment */
        }
    });

    it('keeps a column width fixed when the visible rows change (the reflow property)', async () => {
        const items = ref(rowsWithWideValue());
        const screen = render({
            render: () =>
                h(BApp, {}, () =>
                    h(DXTable, {
                        items: items.value,
                        fields: sizedFields,
                        clientSide: true,
                        fixedLayout: true,
                        perPage: 50,
                        showPagination: false,
                    }),
                ),
        });
        await flush();

        // The wide row is present. Record the name column's width.
        const widthWithWideRow = nameHeaderWidth(screen.container);

        // The declared 260px width is honoured (proves the width came from the
        // field def, not a coincidence of content). Tolerance covers cell
        // borders/rounding.
        expect(widthWithWideRow).toBeGreaterThan(252);
        expect(widthWithWideRow).toBeLessThan(268);

        // "Apply a filter" — the wide row disappears, changing the column's
        // content dramatically.
        items.value = rowsWithoutWideValue();
        await nextTick();
        await flush();

        const widthWithoutWideRow = nameHeaderWidth(screen.container);

        // The reflow property: the SAME column's width did not move when the
        // rows changed. Presence of a style attribute alone would not prove
        // this — the measured widths must actually match.
        expect(Math.abs(widthWithoutWideRow - widthWithWideRow)).toBeLessThan(1.5);
    });

    it('does NOT apply table-layout:fixed by default (existing tables unchanged)', async () => {
        const screen = render({
            render: () =>
                h(BApp, {}, () =>
                    h(DXTable, {
                        items: rowsWithWideValue(),
                        fields: plainFields,
                        clientSide: true,
                        perPage: 50,
                        showPagination: false,
                    }),
                ),
        });
        await flush();

        const table = screen.container.querySelector('table')!;
        expect(table).not.toBeNull();
        // No fixed-layout class, and the resolved layout is the browser default
        // (auto) — the content-sized behaviour every existing consumer relies on.
        expect(table.classList.contains('b-table-fixed')).toBe(false);
        expect(getComputedStyle(table).tableLayout).not.toBe('fixed');
        // With no field widths declared, no <colgroup> is injected either.
        expect(screen.container.querySelector('colgroup')).toBeNull();
    });

    it('default (content-sized) column DOES reflow when the rows change — proves the test is not vacuous', async () => {
        const items = ref(rowsWithWideValue());
        const screen = render({
            render: () =>
                h(BApp, {}, () =>
                    h(DXTable, {
                        items: items.value,
                        fields: plainFields,
                        clientSide: true,
                        perPage: 50,
                        showPagination: false,
                    }),
                ),
        });
        await flush();

        const widthWithWideRow = nameHeaderWidth(screen.container);

        items.value = rowsWithoutWideValue();
        await nextTick();
        await flush();

        const widthWithoutWideRow = nameHeaderWidth(screen.container);

        // Without fixedLayout the column is content-sized, so dropping the wide
        // value visibly shrinks it. This is the bug #156 fixes — asserting it
        // here confirms the first test's invariance is meaningful, not a fluke
        // of a column that never moves.
        expect(widthWithWideRow - widthWithoutWideRow).toBeGreaterThan(40);
    });
});
