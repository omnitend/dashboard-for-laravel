import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DAutocomplete from '../../resources/js/components/base/DAutocomplete.vue';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const options = [
  { value: 'active', text: 'Active' },
  { value: 'pending', text: 'Pending' },
];

const renderAutocomplete = (props: Record<string, any> = {}) =>
  render({
    render: () => h(BApp, {}, () => h(DAutocomplete, { options, ...props })),
  });

/**
 * #108. DXTable uses DAutocomplete for EVERY `select` column filter, so a
 * freshly loaded table with four filters showed four ✕ buttons before the user
 * had done anything. bvn's own `hasSelection` excludes only null/undefined, so
 * an empty STRING — which is what an unset filter binds — counts as a selection.
 */
describe('DAutocomplete clear button (#108)', () => {
  it('renders no clear button for an empty-string model', async () => {
    const screen = renderAutocomplete({ modelValue: '' });
    await wait(80);

    expect(screen.container.querySelector('.b-autocomplete-clear')).toBeNull();
  });

  it('renders no clear button for a null or undefined model', async () => {
    for (const value of [null, undefined]) {
      const screen = renderAutocomplete({ modelValue: value });
      await wait(80);
      expect(screen.container.querySelector('.b-autocomplete-clear')).toBeNull();
    }
  });

  it('renders no clear button for an empty multiple selection', async () => {
    const screen = renderAutocomplete({ modelValue: [], multiple: true });
    await wait(80);

    expect(screen.container.querySelector('.b-autocomplete-clear')).toBeNull();
  });

  it('renders the clear button once there is something to clear', async () => {
    const screen = renderAutocomplete({ modelValue: 'active' });
    await wait(80);

    expect(screen.container.querySelector('.b-autocomplete-clear')).not.toBeNull();
  });

  it('appears and disappears as the model changes', async () => {
    const model = ref<string>('');
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, {
            options,
            modelValue: model.value,
            'onUpdate:modelValue': (value: any) => (model.value = value),
          }),
        ),
    });
    await wait(80);
    expect(screen.container.querySelector('.b-autocomplete-clear')).toBeNull();

    model.value = 'pending';
    await wait(80);
    expect(screen.container.querySelector('.b-autocomplete-clear')).not.toBeNull();

    model.value = '';
    await wait(80);
    expect(screen.container.querySelector('.b-autocomplete-clear')).toBeNull();
  });

  it("still honours a consumer's explicit no-clear-button", async () => {
    const screen = renderAutocomplete({ modelValue: 'active', noClearButton: true });
    await wait(80);

    expect(screen.container.querySelector('.b-autocomplete-clear')).toBeNull();
  });
});
