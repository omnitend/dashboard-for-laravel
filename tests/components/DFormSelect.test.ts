import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
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

// #128 reported that object-VALUED options can't round-trip (the object
// stringifies to `[object Object]`). Investigated and closed as not-a-bug: BVN's
// BFormSelect uses Vue's native `vModelSelect`, which keeps the real value on the
// option element (`_value`) and matches by deep equality — so v-model round-trips
// the ORIGINAL object in both directions. The `[object Object]` DOM `value`
// attribute is inert (Vue never uses it for matching). These pin that so a bvn
// bump that regressed it (e.g. dropping `_value` for a plain attribute) would
// fail loudly, rather than silently pushing consumers back to a native <select>.
describe('DFormSelect object-valued options round-trip (#128)', () => {
  const objA = { id: 1, name: 'Apple' };
  const objB = { id: 2, name: 'Banana' };
  const options = [
    { text: 'Apple', value: objA },
    { text: 'Banana', value: objB },
  ];

  it('emits the ORIGINAL object (identity) when an object option is selected', async () => {
    const model = ref<unknown>(undefined);
    const updates: unknown[] = [];
    const screen = render(DFormSelect, {
      props: {
        options,
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => {
          model.value = value;
          updates.push(value);
        },
      },
    });
    await flush();

    const select = screen.container.querySelector('select') as HTMLSelectElement;
    await userEvent.selectOptions(select, select.options[1]);
    await flush();

    // The object comes back, NOT a stringified `[object Object]`. (Under the
    // test harness `render(props)` reactive-wraps the options, so we assert
    // structural equality rather than reference identity; in real usage against
    // raw options Vue preserves identity — proven separately.)
    const emitted = updates[updates.length - 1];
    expect(typeof emitted).toBe('object');
    expect(emitted).toStrictEqual(objB);
  });

  it('selects the matching option when the model is an object', async () => {
    const screen = render(DFormSelect, {
      props: { options, modelValue: objB },
    });
    await flush();

    const select = screen.container.querySelector('select') as HTMLSelectElement;
    expect(select.selectedIndex).toBe(1);
  });
});
