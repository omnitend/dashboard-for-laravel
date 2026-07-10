import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref, nextTick } from 'vue';
import DFormSelect from '../../resources/js/components/base/DFormSelect.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// A `select` option whose value is `null` (a common "None"/"no selection"
// entry) doesn't round-trip through raw BVN BFormSelect: Vue omits the empty
// `value` attribute so the browser falls back to the option's text, and a
// model bound to `null` matches no option (renders blank). DFormSelect maps a
// `null` option value (and a `null` model) to a private sentinel so the
// selection round-trips, while keeping the consumer's model/emit as `null`.
describe('DFormSelect null-option round-trip', () => {
  const options = [
    { text: 'None – manual entry', value: null },
    { text: 'Stripe', value: 'stripe' },
  ];

  it('gives the null option a real value attribute (not its text)', async () => {
    const screen = render(DFormSelect, {
      props: { options, modelValue: null },
    });
    await flush();

    const opts = Array.from(screen.container.querySelectorAll('option'));
    const noneOption = opts.find((o) => o.textContent?.trim() === 'None – manual entry')!;

    // Without the fix the browser uses the option's text as its value.
    expect(noneOption.getAttribute('value')).not.toBe('None – manual entry');
    expect(noneOption.value).not.toBe('None – manual entry');
  });

  it('selects the null option when the model is null', async () => {
    const screen = render(DFormSelect, {
      props: { options, modelValue: null },
    });
    await flush();

    const select = screen.container.querySelector('select') as HTMLSelectElement;
    const opts = Array.from(select.options);
    const noneOption = opts.find((o) => o.textContent?.trim() === 'None – manual entry')!;

    // The "None" option is the one actually selected, not a blank/empty select.
    expect(noneOption.selected).toBe(true);
    expect(select.selectedIndex).toBe(opts.indexOf(noneOption));
  });

  it('emits null (not the sentinel) when the null option is chosen', async () => {
    const model = ref<string | null>('stripe');
    const screen = render({
      render: () =>
        h(DFormSelect, {
          options,
          modelValue: model.value,
          'onUpdate:modelValue': (value: string | null) => {
            model.value = value;
          },
        }),
    });
    await flush();

    const select = screen.container.querySelector('select') as HTMLSelectElement;
    const opts = Array.from(select.options);
    const noneIndex = opts.findIndex((o) => o.textContent?.trim() === 'None – manual entry');

    select.selectedIndex = noneIndex;
    select.dispatchEvent(new Event('change'));
    await nextTick();
    await flush();

    expect(model.value).toBe(null);
  });

  it('emits a real option value unchanged', async () => {
    const model = ref<string | null>(null);
    const screen = render({
      render: () =>
        h(DFormSelect, {
          options,
          modelValue: model.value,
          'onUpdate:modelValue': (value: string | null) => {
            model.value = value;
          },
        }),
    });
    await flush();

    const select = screen.container.querySelector('select') as HTMLSelectElement;
    const opts = Array.from(select.options);
    select.selectedIndex = opts.findIndex((o) => o.textContent?.trim() === 'Stripe');
    select.dispatchEvent(new Event('change'));
    await nextTick();
    await flush();

    expect(model.value).toBe('stripe');
  });

  it('leaves options without a null value untouched', async () => {
    const plainOptions = [
      { text: 'Stripe', value: 'stripe' },
      { text: 'PayPal', value: 'paypal' },
    ];
    const screen = render(DFormSelect, {
      props: { options: plainOptions, modelValue: 'paypal' },
    });
    await flush();

    const select = screen.container.querySelector('select') as HTMLSelectElement;
    const opts = Array.from(select.options);
    expect(opts.map((o) => o.value)).toEqual(['stripe', 'paypal']);
    expect(opts.find((o) => o.value === 'paypal')!.selected).toBe(true);
  });
});
