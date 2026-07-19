import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DAutocomplete from '../../resources/js/components/base/DAutocomplete.vue';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const options = [
  { value: 1, text: 'Apple' },
  { value: 2, text: 'Banana' },
  { value: 3, text: 'Cherry' },
];

const openList = async (screen: ReturnType<typeof render>, term?: string) => {
  const input = screen.container.querySelector('input') as HTMLInputElement;
  await userEvent.click(input);
  if (term !== undefined) await userEvent.fill(input, term);
  await wait(220);
  return input;
};

const optionTexts = () =>
  [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent?.trim());

/**
 * #138. A pinned, never-filtered, selectable "no selection" row — the one gap
 * between DAutocomplete and the house ot-searchable-select once value identity
 * (#153) was confirmed already correct upstream.
 */
describe('DAutocomplete null-option (#138)', () => {
  it('adds no null option by default (regression guard)', async () => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DAutocomplete, { options, openOnFocus: true })),
    });
    await wait(80);
    await openList(screen);

    const texts = optionTexts();
    expect(texts).toEqual(['Apple', 'Banana', 'Cherry']);
    expect(texts).not.toContain('None');
  });

  it('prepends a pinned "None" row when null-option is true', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DAutocomplete, { options, nullOption: true, openOnFocus: true })),
    });
    await wait(80);
    await openList(screen);

    const texts = optionTexts();
    expect(texts[0]).toBe('None');
    expect(texts).toEqual(['None', 'Apple', 'Banana', 'Cherry']);
  });

  it('uses a custom label when null-option is a string', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, { options, nullOption: 'Any fruit', openOnFocus: true }),
        ),
    });
    await wait(80);
    await openList(screen);

    expect(optionTexts()[0]).toBe('Any fruit');
  });

  it('keeps the null option pinned even when the term filters out everything else', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DAutocomplete, { options, nullOption: true, openOnFocus: true })),
    });
    await wait(80);
    // "zzz" matches no fruit AND not "None" — without pinning the list would be empty.
    await openList(screen, 'zzz');

    expect(optionTexts()).toEqual(['None']);
  });

  it('emits null and hides the ✕ when the null option is selected', async () => {
    const model = ref<unknown>(2);
    const updates: unknown[] = [];
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, {
            options,
            nullOption: true,
            openOnFocus: true,
            modelValue: model.value,
            'onUpdate:modelValue': (value: unknown) => {
              model.value = value;
              updates.push(value);
            },
          }),
        ),
    });
    await wait(80);
    // Starts with a real selection → clear button present.
    expect(screen.container.querySelector('.b-autocomplete-clear')).not.toBeNull();

    await openList(screen);
    const none = [...document.querySelectorAll('[role="option"]')].find(
      (o) => o.textContent?.trim() === 'None',
    ) as HTMLElement;
    expect(none).toBeTruthy();
    await userEvent.click(none);
    await wait(120);

    expect(updates[updates.length - 1]).toBeNull();
    expect(screen.container.querySelector('.b-autocomplete-clear')).toBeNull();
  });

  // Codex #138 review [P2]: the null row must be built with the consumer's
  // configured value-field/text-field, else bvn normalises our {value,text}
  // to {value: undefined, text: undefined} and the row shows blank / selects
  // undefined instead of null.
  it('honours value-field/text-field when building the null option', async () => {
    const fieldOptions = [
      { id: 1, label: 'Apple' },
      { id: 2, label: 'Banana' },
    ];
    const model = ref<unknown>(1);
    const updates: unknown[] = [];
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, {
            options: fieldOptions,
            valueField: 'id',
            textField: 'label',
            nullOption: 'Nothing',
            openOnFocus: true,
            modelValue: model.value,
            'onUpdate:modelValue': (value: unknown) => {
              model.value = value;
              updates.push(value);
            },
          }),
        ),
    });
    await wait(80);
    await openList(screen);

    // The row renders with the label (proves text-field was honoured, not blank).
    expect(optionTexts()[0]).toBe('Nothing');

    const none = [...document.querySelectorAll('[role="option"]')].find(
      (o) => o.textContent?.trim() === 'Nothing',
    ) as HTMLElement;
    expect(none).toBeTruthy();
    await userEvent.click(none);
    await wait(120);

    // Selecting it emits null (proves value-field was honoured, not undefined).
    expect(updates[updates.length - 1]).toBeNull();
  });

  // Codex #138 review [P1]: inheritAttrs must stay false. With a single root
  // element and inheritAttrs on, Vue applies $attrs to the wrapper div AND the
  // explicit v-bind applies them to BAutocomplete — duplicating class/id and
  // double-firing listeners. Assert a consumer class does NOT land on the
  // wrapper div (it belongs only on the forwarded BAutocomplete).
  it('does not double-apply consumer attrs onto the wrapper (inheritAttrs: false)', async () => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DAutocomplete, { options, class: 'probe-class' })),
    });
    await wait(80);

    const wrapper = screen.container.querySelector('.d-autocomplete') as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.classList.contains('probe-class')).toBe(false);
  });

  it("composes with a consumer's filterFunction on the non-null options", async () => {
    // A deliberately odd filter: keep only options whose text ends with the term.
    const endsWith: (opts: any[], term: string) => any[] = (opts, term) =>
      term ? opts.filter((o) => String(o.text).toLowerCase().endsWith(term.toLowerCase())) : opts;

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, {
            options,
            nullOption: true,
            filterFunction: endsWith,
            openOnFocus: true,
          }),
        ),
    });
    await wait(80);
    await openList(screen, 'rry'); // only "Cherry" ends with "rry"

    // Null option still pinned; consumer's filter still applied to the rest.
    expect(optionTexts()).toEqual(['None', 'Cherry']);
  });
});
