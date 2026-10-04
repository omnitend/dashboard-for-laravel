import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { customerFields } from '../fixtures/tableData';

/**
 * `busy` is the documented loading prop (`loading` is deprecated in its
 * favour), but with rows passed as `items` DXTable read only `loading`. A page
 * loading its rows itself and passing `:busy` showed the empty text ("No …
 * found") until the rows arrived, which reads as "there is no data".
 */
const modes = [
  { name: 'items', extraProps: {} },
  { name: 'client-side', extraProps: { clientSide: true } },
];

describe.each(modes)('DXTable busy with $name rows', ({ extraProps }) => {
  it('shows the loading state, not the empty text, while busy', async () => {
    const screen = render(DXTable, {
      props: {
        items: [],
        fields: customerFields,
        busy: true,
        loadingText: 'Loading customers...',
        emptyText: 'No customers here',
        ...extraProps,
      },
    });

    await expect.element(screen.getByText('Loading customers...')).toBeVisible();
    await expect.element(screen.getByText('No customers here')).not.toBeInTheDocument();
  });

  it('shows the empty text once no longer busy', async () => {
    // Positive control for the absence check above: the empty text does render
    // in this mode when the table is not busy.
    const screen = render(DXTable, {
      props: {
        items: [],
        fields: customerFields,
        busy: false,
        loadingText: 'Loading customers...',
        emptyText: 'No customers here',
        ...extraProps,
      },
    });

    await expect.element(screen.getByText('No customers here')).toBeVisible();
    await expect.element(screen.getByText('Loading customers...')).not.toBeInTheDocument();
  });

  it('still honours the deprecated loading prop', async () => {
    const screen = render(DXTable, {
      props: {
        items: [],
        fields: customerFields,
        loading: true,
        loadingText: 'Loading customers...',
        emptyText: 'No customers here',
        ...extraProps,
      },
    });

    await expect.element(screen.getByText('Loading customers...')).toBeVisible();
  });
});
