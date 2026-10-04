import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const renderFilters = async () => {
  const screen = render({
    render: () => h(BApp, {}, () => h(DXTable, {
      clientSide: true,
      items: [{ id: 1, name: 'Sample', account: 'Example', tags: 'One', count: 5, date: '2026-09-01', status: 'Open' }],
      fields: [
        { key: 'name', label: 'Name', filter: 'text' },
        { key: 'account', filter: 'select' },
        { key: 'tags', filter: 'select', filterMultiple: true },
        { key: 'count', filter: 'number' },
        { key: 'date', filter: 'date' },
        { key: 'status', filter: 'select-native' },
      ],
    })),
  });
  await expect.poll(() => screen.container.querySelectorAll('.dx-table-filter-cell').length).toBe(6);
  return [...screen.container.querySelectorAll('.dx-table-filter-cell')];
};

describe('table filter search affordances', () => {
  it('reserves search icons for text and number filters, keeping selects compact', async () => {
    const cells = await renderFilters();
    const text = getComputedStyle(cells[0].querySelector('input')!);
    expect(text.backgroundImage).not.toBe('none');
    for (const index of [1, 2]) {
      const input = cells[index].querySelector('input');
      expect(input).toBeTruthy();
      const style = getComputedStyle(input!);
      expect(style.backgroundImage).toBe('none');
      expect(parseFloat(style.paddingLeft)).toBeLessThan(parseFloat(text.paddingLeft));
      expect(input!.getBoundingClientRect().height).toBe(cells[0].querySelector('input')!.getBoundingClientRect().height);
    }
    expect(getComputedStyle(cells[3].querySelector('input')!).backgroundImage).toBe(text.backgroundImage);
  });

  it('preserves date and native-select affordances without a search icon', async () => {
    const cells = await renderFilters();
    const searchIcon = getComputedStyle(cells[0].querySelector('input')!).backgroundImage;
    const date = cells[4].querySelector('input[type="date"]');
    const nativeSelect = cells[5].querySelector('select');
    expect(date).toBeTruthy();
    expect(nativeSelect).toBeTruthy();
    expect(getComputedStyle(date!).backgroundImage).not.toBe(searchIcon);
    expect(getComputedStyle(nativeSelect!).backgroundImage).not.toBe(searchIcon);
  });
});


it('places column headers before their filters', async () => {
  const cells = await renderFilters();
  const header = cells[0].closest('thead')!;
  const rows = [...header.querySelectorAll('tr')];
  expect(rows.length).toBe(2);
  expect(rows[0].textContent).toContain('Name');
  expect(rows[0].querySelector('input')).toBeNull();
  expect(rows[1].querySelector('input')).not.toBeNull();
});


it('matches the autocomplete arrow border to the input border', async () => {
  const cells = await renderFilters();
  const input = cells[1].querySelector('input')!;
  const trigger = cells[1].querySelector('.b-autocomplete-trigger')!;
  expect(trigger).not.toBeNull();
  expect(getComputedStyle(trigger).borderTopColor).toBe(getComputedStyle(input).borderTopColor);
});

it('preserves consumer subheader content alongside filters', async () => {
  const screen = render({
    render: () => h(BApp, {}, () => h(DXTable, {
      clientSide: true,
      items: [{ name: 'Sample' }],
      fields: [{ key: 'name', label: 'Name', filter: 'text' }],
    }, { 'thead-sub': ({ field }: any) => h('span', { class: 'consumer-sub' }, field.key) })),
  });
  await expect.poll(() => screen.container.querySelector('.consumer-sub')?.textContent).toBe('name');
  const rows = screen.container.querySelectorAll('thead tr');
  expect(rows[0].textContent).toContain('Name');
  expect(rows[1].querySelector('input')).not.toBeNull();
  expect(rows[1].querySelector('.consumer-sub')).not.toBeNull();
});

describe('text filter placeholders', () => {
  // The magnifier already says "search", so the default is just the column
  // label and an ellipsis. Was "Search Name..." beside the icon.
  const placeholdersFor = async (fields: Record<string, unknown>[]) => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DXTable, {
        clientSide: true,
        items: [{ id: 1, name: 'Sample', account_code: 'A1', email: 'a@example.com' }],
        fields,
      })),
    });
    await expect.poll(() => screen.container.querySelectorAll('.dx-table-filter-cell input').length).toBe(fields.length);
    return [...screen.container.querySelectorAll<HTMLInputElement>('.dx-table-filter-cell input')].map((input) => input.placeholder);
  };

  it('defaults to the column label plus an ellipsis, or the key when there is no label', async () => {
    expect(await placeholdersFor([
      { key: 'name', label: 'Name', filter: 'text' },
      { key: 'account_code', filter: 'text' },
    ])).toEqual(['Name…', 'account_code…']);
  });

  it('gives number filters the same label-plus-ellipsis default', async () => {
    expect(await placeholdersFor([
      { key: 'count', label: 'Count', filter: 'number' },
    ])).toEqual(['Count…']);
  });

  it('keeps a consumer-provided filterPlaceholder', async () => {
    expect(await placeholdersFor([
      { key: 'email', label: 'Email', filter: 'text', filterPlaceholder: 'Search by email address' },
    ])).toEqual(['Search by email address']);
  });
});
