import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Map every rendered row to `{ rid, input }` where `rid` is the id the cell slot
 * printed for that row and `input` is the stateful <input> in the same <tr>.
 * The mis-association bug shows up as an input's typed value ending up in a row
 * whose `rid` is NOT the record it was typed on.
 */
const rowsOf = (container: Element) =>
  Array.from(container.querySelectorAll('tbody tr')).map((tr) => ({
    tr,
    rid: (tr.querySelector('.rid')?.textContent ?? '').trim(),
    input: tr.querySelector('input.mark') as HTMLInputElement | null,
  }));

/**
 * Render a client-side DXTable whose `marker` column hosts a STATEFUL,
 * uncontrolled <input> (real DOM state, not prop-driven) plus a `.rid` span
 * printing the row's id. `items` is a ref so the test can splice rows mid-
 * interaction and re-render.
 */
const renderTable = (primaryKey?: string) => {
  const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  const screen = render({
    setup() {
      return () =>
        h(BApp, {}, () =>
          h(
            DXTable,
            {
              items: items.value,
              clientSide: true,
              primaryKey,
              fields: [
                { key: 'id', label: 'ID' },
                { key: 'marker', label: 'Marker' },
              ],
            },
            {
              'cell(marker)': (scope: any) =>
                h('div', [
                  h('input', { class: 'mark' }),
                  h('span', { class: 'rid' }, String(scope.item.id)),
                ]),
            },
          ),
        );
    },
  });
  return { screen, items };
};

describe('DXTable primary-key row identity (B16)', () => {
  beforeEach(() => {
    // Per-page preference persists in localStorage → order-dependence (CLAUDE.md).
    Object.keys(localStorage)
      .filter((key) => key.startsWith('dxtable-perpage-'))
      .forEach((key) => localStorage.removeItem(key));
  });

  it('keys each <tr> by the primary-key VALUE (not index)', async () => {
    const { screen } = renderTable('id');
    await flush();

    // bvn stamps a row id of `…__row_<pkValue>` only when primaryKey is set; the
    // presence + value of that id is a direct proof the prop reached BTable and
    // it keyed rows by value. (Without the fix, forwarding is absent and the
    // <tr> carries no such id — see the fail-first sibling test.)
    const ids = rowsOf(screen.container).map(({ tr }) => tr.id);
    expect(ids).toEqual([
      expect.stringMatching(/__row_1$/),
      expect.stringMatching(/__row_2$/),
      expect.stringMatching(/__row_3$/),
      expect.stringMatching(/__row_4$/),
    ]);
  });

  it('keeps a stateful cell bound to its record when a row above is removed', async () => {
    const { screen, items } = renderTable('id');
    await flush();

    // Type into the input belonging to record id=3.
    const targetInput = rowsOf(screen.container).find((row) => row.rid === '3')!
      .input!;
    await userEvent.fill(targetInput, 'MARK');

    // A concurrent delete of the row ABOVE (id=1) — the websocket-delete case.
    items.value = items.value.filter((row) => row.id !== 1);
    await flush();

    // The input still carrying "MARK" must sit in the row whose id is STILL 3.
    // With index keys it would shift onto id=4 (the row that took index 2).
    const marked = rowsOf(screen.container).find(
      (row) => row.input?.value === 'MARK',
    );
    expect(marked).toBeTruthy();
    expect(marked!.rid).toBe('3');
  });

  it('mis-associates without primary-key (documents the bug the prop fixes)', async () => {
    // The SAME scenario with no primary-key: bvn falls back to index keys, so the
    // "MARK" input re-associates to the record that takes its old index. This is
    // the red the fixed test above turns green — kept as an executable record of
    // exactly what `primary-key` changes.
    const { screen, items } = renderTable(undefined);
    await flush();

    const targetInput = rowsOf(screen.container).find((row) => row.rid === '3')!
      .input!;
    await userEvent.fill(targetInput, 'MARK');

    items.value = items.value.filter((row) => row.id !== 1);
    await flush();

    const marked = rowsOf(screen.container).find(
      (row) => row.input?.value === 'MARK',
    );
    expect(marked).toBeTruthy();
    // Index keys → the typed value lands on the WRONG record (id 4, not 3).
    expect(marked!.rid).toBe('4');
  });
});
