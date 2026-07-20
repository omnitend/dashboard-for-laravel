import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref, nextTick } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXCurrencyInput from '../../resources/js/components/extended/DXCurrencyInput.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Render the input bound to a ref model; returns the input el + model. */
function mount(props: Record<string, unknown> = {}, initial: number | null = null) {
  const model = ref<number | null>(initial);
  const screen = render({
    render: () =>
      h(BApp, {}, () =>
        h(DXCurrencyInput, {
          modelValue: model.value,
          'onUpdate:modelValue': (v: number | null) => (model.value = v),
          ...props,
        }),
      ),
  });
  const input = () => screen.container.querySelector('input') as HTMLInputElement;
  return { screen, model, input };
}

const type = async (input: HTMLInputElement, text: string) => {
  input.focus();
  input.dispatchEvent(new Event('focus'));
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
};

const blur = async (input: HTMLInputElement) => {
  input.dispatchEvent(new Event('blur'));
  await nextTick();
};

describe('DXCurrencyInput (#152)', () => {
  it('renders the £ prepend by default, and a custom symbol when given', async () => {
    const { screen } = mount();
    await flush();
    expect(screen.container.querySelector('.input-group-text')!.textContent).toBe('£');

    const { screen: eur } = mount({ currencySymbol: '€' });
    await flush();
    expect(eur.container.querySelector('.input-group-text')!.textContent).toBe('€');
  });

  it('seeds the display padded to the minor-unit precision', async () => {
    const { input } = mount({}, 3.8);
    await flush();
    expect(input().value).toBe('3.80');
  });

  it('typing updates the model without reformatting mid-edit', async () => {
    const { model, input } = mount();
    await flush();
    await type(input(), '12.5');
    expect(model.value).toBe(12.5);
    // Mid-edit: NOT padded to 12.50 under the cursor.
    expect(input().value).toBe('12.5');
  });

  it('pads the display on blur', async () => {
    const { input } = mount();
    await flush();
    await type(input(), '12.5');
    await blur(input());
    expect(input().value).toBe('12.50');
  });

  it('clearing the input emits null — never NaN, never ""', async () => {
    const { model, input } = mount({}, 4.2);
    await flush();
    await type(input(), '');
    expect(model.value).toBeNull();
    await blur(input());
    expect(input().value).toBe('');
  });

  it('respects decimals: 0 (a currency with no minor unit)', async () => {
    const { input } = mount({ decimals: 0 }, 500);
    await flush();
    expect(input().value).toBe('500');
  });
});

describe('DXCurrencyInput minorUnits mode (#116)', () => {
  it('displays an integer-pence model as pounds', async () => {
    const { input } = mount({ minorUnits: true }, 1999);
    await flush();
    expect(input().value).toBe('19.99');
  });

  it('typing pounds writes rounded integer pence (float-safe: 19.99 → 1999)', async () => {
    const { model, input } = mount({ minorUnits: true });
    await flush();
    // 19.99 * 100 === 1998.9999999999998 — the round guard is the point.
    await type(input(), '19.99');
    expect(model.value).toBe(1999);
    await type(input(), '0.1');
    expect(model.value).toBe(10);
  });

  it('clearing still emits null in minorUnits mode', async () => {
    const { model, input } = mount({ minorUnits: true }, 250);
    await flush();
    await type(input(), '');
    expect(model.value).toBeNull();
  });

  it('scale follows decimals (decimals 3 → thousandths)', async () => {
    const { model, input } = mount({ minorUnits: true, decimals: 3 }, 1500);
    await flush();
    expect(input().value).toBe('1.500');
    await type(input(), '2.25');
    expect(model.value).toBe(2250);
  });
});
