import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DAutocomplete from '../../resources/js/components/base/DAutocomplete.vue';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * #153. greendragon's `ot-product-options.vue` carries a workaround —
 * `value: String(productLine.id)` in, `Number(...)` out — added because an older
 * `DAutocomplete`/`BAutocomplete` was believed to round-trip an option's value
 * through the DOM as a string, so a numeric id came back stringified. That was
 * the single biggest reason the house `ot-searchable-select` was built (#138).
 *
 * On the current bvn (0.45.6) it does NOT reproduce: a numeric value is
 * registered on the combobox item as-is and emitted unchanged, so the workaround
 * is obsolete. These tests pin that upstream behaviour in both directions (and
 * the string path DXTable's filters depend on, #108) so a bvn bump that
 * regresses value identity is caught rather than silently re-imposing the dance.
 */
describe('DAutocomplete value identity round-trip (#153)', () => {
  const selectOption = async (
    options: Array<{ value: unknown; text: string }>,
    pickText: string,
  ) => {
    const model = ref<unknown>(undefined);
    const updates: unknown[] = [];
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, {
            options,
            modelValue: model.value,
            openOnFocus: true,
            'onUpdate:modelValue': (value: unknown) => {
              model.value = value;
              updates.push(value);
            },
          }),
        ),
    });
    await wait(80);

    const input = screen.container.querySelector('input') as HTMLElement;
    await userEvent.click(input);
    await userEvent.fill(input, pickText);
    await wait(200);

    const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
      o.textContent?.includes(pickText),
    ) as HTMLElement;
    expect(option, `option "${pickText}" should be in the list`).toBeTruthy();
    await userEvent.click(option);
    await wait(120);

    return updates[updates.length - 1];
  };

  it('emits a numeric option value unchanged (a number stays a number)', async () => {
    const last = await selectOption(
      [
        { value: 1, text: 'One' },
        { value: 2, text: 'Two' },
        { value: 3, text: 'Three' },
      ],
      'Two',
    );
    expect(typeof last).toBe('number');
    expect(last).toBe(2);
  });

  it('emits a string option value unchanged (the DXTable filter path, #108)', async () => {
    const last = await selectOption(
      [
        { value: 'active', text: 'Active' },
        { value: 'pending', text: 'Pending' },
      ],
      'Pending',
    );
    expect(typeof last).toBe('string');
    expect(last).toBe('pending');
  });

  it('displays the matching text for a programmatically-set numeric model', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, {
            options: [
              { value: 1, text: 'One' },
              { value: 2, text: 'Two' },
            ],
            modelValue: 2,
          }),
        ),
    });
    await wait(80);

    const input = screen.container.querySelector('input') as HTMLInputElement;
    // No String() coercion on the model, yet the numeric value resolves to its text.
    expect(input.value).toBe('Two');
  });
});
