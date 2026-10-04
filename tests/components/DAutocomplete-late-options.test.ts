import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, reactive, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DAutocomplete from '../../resources/js/components/base/DAutocomplete.vue';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CATEGORIES = [
  { value: '77', text: 'Ales' },
  { value: '78', text: 'Alcopop' },
];

/**
 * 0.42.1. bvn's BAutocomplete sets the input's text from the model value once,
 * through reka-ui's ComboboxInput, and only again when the MODEL changes. A
 * value set before its options load (a DXTable select filter seeded from the
 * URL, `?product_category_id=78`, while the categories are still being
 * fetched) therefore kept showing the raw "78" after "Alcopop" arrived.
 */
describe('DAutocomplete resolves the label when options arrive after the value', () => {
  const mountLate = (props: Record<string, unknown> = {}) => {
    const options = ref<Array<{ value: string; text: string }>>([]);
    const model = ref<unknown>(props.multiple ? ['78'] : '78');
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, {
            options: options.value,
            modelValue: model.value,
            'onUpdate:modelValue': (value: unknown) => {
              model.value = value;
            },
            ...props,
          }),
        ),
    });
    const input = () => screen.container.querySelector('input') as HTMLInputElement;
    return { screen, options, model, input };
  };

  it('single: the input shows the option label once the options load', async () => {
    const { options, input } = mountLate();
    await wait(80);
    // Control: before the options load there is nothing but the raw value.
    expect(input().value).toBe('78');

    options.value = CATEGORIES;
    await wait(80);
    expect(input().value).toBe('Alcopop');
  });

  it('single: a later options change that still holds the value relabels it', async () => {
    const { options, input } = mountLate();
    options.value = [{ value: '78', text: '78' }];
    await wait(80);
    expect(input().value).toBe('78');

    options.value = CATEGORIES;
    await wait(80);
    expect(input().value).toBe('Alcopop');
  });

  it('single: a search the user is typing is not overwritten when options refresh', async () => {
    const { options, input } = mountLate({ openOnFocus: true });
    await wait(80);
    await userEvent.click(input());
    await userEvent.fill(input(), 'Alc');
    await wait(80);
    expect(input().value).toBe('Alc');

    options.value = CATEGORIES;
    await wait(80);
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe('Alc');
  });

  it('multiple: the selection shows the option label once the options load', async () => {
    const { screen, options } = mountLate({ multiple: true });
    await wait(80);
    options.value = CATEGORIES;
    await wait(80);
    const selection = screen.container.querySelector('.b-autocomplete-selection');
    expect(selection?.textContent).toContain('Alcopop');
  });
});

describe('DXTable select filter resolves its label when filterOptions arrive late', () => {
  beforeEach(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('dxtable-perpage-'))
      .forEach((key) => localStorage.removeItem(key));
  });

  it('a filter seeded with "78" shows "Alcopop" once filterOptions are installed', async () => {
    // Mirrors the downstream app: the column is declared without options,
    // the filter is seeded from the URL, then `field.filterOptions = …` is
    // assigned on the (reactive) field once the categories endpoint answers.
    const categoryField = reactive<Record<string, unknown>>({
      key: 'product_category_id',
      label: 'Category',
      filter: 'select',
    });
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [],
            clientSide: true,
            fields: [{ key: 'name', label: 'Name' }, categoryField],
            filters: { product_category_id: '78' },
          }),
        ),
    });
    await wait(80);
    const input = () =>
      screen.container
        .querySelectorAll('.dx-table-filter-cell')[1]
        .querySelector('input') as HTMLInputElement;
    expect(input().value).toBe('78');

    categoryField.filterOptions = CATEGORIES;
    await wait(80);
    expect(input().value).toBe('Alcopop');
  });
});
