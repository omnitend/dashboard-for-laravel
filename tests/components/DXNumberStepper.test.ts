import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref, nextTick } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXNumberStepper from '../../resources/js/components/extended/DXNumberStepper.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const themeApplied = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--dx-chart-1').trim() !== '';

/** Render the stepper bound to a ref model; returns its parts and every emit. */
function mount(props: Record<string, unknown> = {}, initial: number | null = 1) {
  const model = ref<number | null>(initial);
  const emitted: Array<number | null> = [];
  const screen = render({
    render: () =>
      h(BApp, {}, () =>
        h(DXNumberStepper, {
          modelValue: model.value,
          'onUpdate:modelValue': (value: number | null) => {
            emitted.push(value);
            model.value = value;
          },
          ...props,
        }),
      ),
  });
  const root = () => screen.container.querySelector('.dx-number-stepper') as HTMLElement;
  const input = () => screen.container.querySelector('input') as HTMLInputElement;
  const decrease = () =>
    screen.container.querySelector('.dx-number-stepper__decrease') as HTMLButtonElement;
  const increase = () =>
    screen.container.querySelector('.dx-number-stepper__increase') as HTMLButtonElement;
  return { screen, model, emitted, root, input, decrease, increase };
}

/** Wait for the theme stylesheet so measured sizes are the real ones. */
const settleTheme = async () => {
  for (let i = 0; i < 150 && !themeApplied(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  await flush();
};

const type = async (input: HTMLInputElement, text: string) => {
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
};

describe('DXNumberStepper', () => {
  it('renders decrease, a number input and increase, in that order', async () => {
    const { root, input, decrease, increase } = mount();
    await flush();
    expect(root().classList.contains('input-group')).toBe(true);
    const children = Array.from(root().children);
    expect(children.indexOf(decrease())).toBe(0);
    expect(children.indexOf(input())).toBe(1);
    expect(children.indexOf(increase())).toBe(2);
    expect(input().type).toBe('number');
    expect(input().value).toBe('1');
  });

  it('clicking + and - steps by `step` and emits each step', async () => {
    const { model, emitted, increase, decrease, input } = mount({ step: 5 }, 10);
    await flush();
    increase().click();
    await flush();
    expect(model.value).toBe(15);
    increase().click();
    await flush();
    expect(model.value).toBe(20);
    decrease().click();
    await flush();
    expect(model.value).toBe(15);
    expect(emitted).toEqual([15, 20, 15]);
    expect(input().value).toBe('15');
  });

  it('defaults step to 1', async () => {
    const { model, increase } = mount({}, 3);
    await flush();
    increase().click();
    await flush();
    expect(model.value).toBe(4);
  });

  it('respects min and max: the button at the bound is disabled and the step clamps', async () => {
    const { model, emitted, increase, decrease } = mount({ min: 0, max: 10, step: 4 }, 8);
    await flush();
    expect(decrease().disabled).toBe(false);
    expect(increase().disabled).toBe(false);
    increase().click(); // 8 + 4 = 12, clamped to max
    await flush();
    expect(model.value).toBe(10);
    expect(increase().disabled).toBe(true);
    expect(decrease().disabled).toBe(false);

    model.value = 2;
    await flush();
    decrease().click(); // 2 - 4 = -2, clamped to min
    await flush();
    expect(model.value).toBe(0);
    expect(decrease().disabled).toBe(true);
    expect(increase().disabled).toBe(false);
    expect(emitted).toEqual([10, 0]);
  });

  it('decimal steps do not accumulate float error (0.1 x 3 is 0.3)', async () => {
    const { model, increase, decrease, input } = mount({ step: 0.1 }, 0);
    await flush();
    increase().click();
    increase().click();
    increase().click();
    await flush();
    expect(model.value).toBe(0.3);
    expect(input().value).toBe('0.3');
    decrease().click();
    await flush();
    expect(model.value).toBe(0.2);
  });

  it('a decimal step from a value with more places keeps the value precision', async () => {
    const { model, increase } = mount({ step: 0.1 }, 1.05);
    await flush();
    increase().click();
    await flush();
    expect(model.value).toBe(1.15);
  });

  it('typing propagates a number, and clearing the input emits null', async () => {
    const { model, input } = mount({}, 1);
    await flush();
    await type(input(), '42');
    expect(model.value).toBe(42);
    await type(input(), '');
    expect(model.value).toBeNull();
  });

  it('typing out of range is left alone while typing and clamped on blur', async () => {
    const { model, input, emitted } = mount({ min: 1, max: 50 }, 5);
    await flush();
    await type(input(), '120');
    expect(model.value).toBe(120);
    input().blur();
    await flush();
    expect(model.value).toBe(50);
    expect(input().value).toBe('50');

    await type(input(), '0');
    input().blur();
    await flush();
    expect(model.value).toBe(1);
    expect(emitted).toEqual([120, 50, 0, 1]);
  });

  it('blur does not emit when the value is already in range', async () => {
    const { input, emitted } = mount({ min: 1, max: 50 }, 5);
    await flush();
    await type(input(), '7');
    input().blur();
    await flush();
    expect(emitted).toEqual([7]);
  });

  it('from empty, a step goes to the in-range value nearest zero', async () => {
    const { model, increase } = mount({ min: 1 }, null);
    await flush();
    increase().click();
    await flush();
    expect(model.value).toBe(1);

    const unbounded = mount({}, null);
    await flush();
    unbounded.decrease().click();
    await flush();
    expect(unbounded.model.value).toBe(0);
  });

  it('ArrowUp and ArrowDown on the input step exactly like the buttons', async () => {
    const { model, input } = mount({ step: 0.1, max: 0.2 }, 0);
    await flush();
    input().focus();
    await userEvent.keyboard('{ArrowUp}');
    await flush();
    expect(model.value).toBe(0.1);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    await flush();
    expect(model.value).toBe(0.2);
    await userEvent.keyboard('{ArrowDown}');
    await flush();
    expect(model.value).toBe(0.1);
  });

  it('ArrowUp adds the step like the + button, not snapping to the browser step grid', async () => {
    // With min 0 the browser's own stepUp snaps to the 0, 0.1, 0.2… grid, so
    // from 1.05 it gives 1.1; the + button gives 1.15, and so must the key.
    const { model, input } = mount({ step: 0.1, min: 0 }, 1.05);
    await flush();
    input().focus();
    await userEvent.keyboard('{ArrowUp}');
    await flush();
    expect(model.value).toBe(1.15);
  });

  it('disabled disables both buttons and the input', async () => {
    const { input, increase, decrease } = mount({ disabled: true }, 5);
    await flush();
    expect(input().disabled).toBe(true);
    expect(increase().disabled).toBe(true);
    expect(decrease().disabled).toBe(true);
  });

  it('passes attributes through to the input, and class to the group', async () => {
    const { input, root } = mount({ name: 'cases', 'aria-label': 'Cases', class: 'my-stepper' }, 2);
    await flush();
    expect(input().getAttribute('name')).toBe('cases');
    expect(input().getAttribute('aria-label')).toBe('Cases');
    expect(root().classList.contains('my-stepper')).toBe(true);
    expect(input().classList.contains('my-stepper')).toBe(false);
  });

  it('labels the buttons Decrease / Increase, with the field label when given', async () => {
    const plain = mount({}, 2);
    await flush();
    expect(plain.decrease().getAttribute('aria-label')).toBe('Decrease');
    expect(plain.increase().getAttribute('aria-label')).toBe('Increase');

    const labelled = mount({ 'aria-label': 'Cases' }, 2);
    await flush();
    expect(labelled.decrease().getAttribute('aria-label')).toBe('Decrease Cases');
    expect(labelled.increase().getAttribute('aria-label')).toBe('Increase Cases');
  });

  it('a button is not a separate Tab stop (the input arrows step instead)', async () => {
    const { increase, decrease } = mount({}, 2);
    await flush();
    expect(increase().getAttribute('tabindex')).toBe('-1');
    expect(decrease().getAttribute('tabindex')).toBe('-1');
  });

  for (const size of ['sm', 'md', 'lg'] as const) {
    it(`at size ${size}, each button is at least as wide as the input is tall`, async () => {
      const { input, increase, decrease } = mount({ size }, 2);
      await settleTheme();
      const inputHeight = input().getBoundingClientRect().height;
      for (const button of [increase(), decrease()]) {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(inputHeight - 0.5);
        expect(Math.abs(rect.height - inputHeight)).toBeLessThan(1);
      }
    });
  }

  it('at md the touch target is at least 2.25rem', async () => {
    const { increase } = mount({}, 2);
    await settleTheme();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rect = increase().getBoundingClientRect();
    expect(rect.width).toBeGreaterThanOrEqual(2.25 * rem);
    expect(rect.height).toBeGreaterThanOrEqual(2.25 * rem);
  });

  it('the buttons use the soft secondary (action) look', async () => {
    const { increase } = mount({}, 2);
    await settleTheme();
    expect(increase().classList.contains('btn-secondary')).toBe(true);
    expect(getComputedStyle(increase()).backgroundColor).toBe('rgb(230, 235, 242)');
  });

  /*
   * Controlled by `modelValue`. A parent may DECLINE an emitted value — e.g. a
   * purchase-order quantity that only takes whole cases keeps 2 when 2.5 is
   * typed. The prop then never changes, so nothing tells the stepper to
   * resync: it used to show 2 on blur but step from its own 2.5, so + went to
   * 3.5 (which the parent declined again, so nothing saved) and every later
   * step stayed fractional.
   */
  describe('controlled by modelValue when the parent declines a value', () => {
    /** A parent that accepts only whole numbers; returns the model and emits. */
    function mountWholeNumbersOnly(initial: number) {
      const model = ref<number | null>(initial);
      const emitted: Array<number | null> = [];
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXNumberStepper, {
              modelValue: model.value,
              'onUpdate:modelValue': (value: number | null) => {
                emitted.push(value);
                if (value !== null && Number.isInteger(value)) model.value = value;
              },
            }),
          ),
      });
      const input = () => screen.container.querySelector('input') as HTMLInputElement;
      const increase = () =>
        screen.container.querySelector('.dx-number-stepper__increase') as HTMLButtonElement;
      const decrease = () =>
        screen.container.querySelector('.dx-number-stepper__decrease') as HTMLButtonElement;
      return { model, emitted, input, increase, decrease };
    }

    it('after a declined typed value, blur shows the model and + steps from it', async () => {
      const { model, emitted, input, increase } = mountWholeNumbersOnly(2);
      await flush();
      await type(input(), '2.5');
      // Typing passes through as typed (the parent decides).
      expect(emitted).toEqual([2.5]);
      expect(input().value).toBe('2.5');
      input().blur();
      await flush();
      expect(model.value).toBe(2);
      expect(input().value).toBe('2');

      increase().click();
      await flush();
      expect(emitted).toEqual([2.5, 3]);
      expect(model.value).toBe(3);
      expect(input().value).toBe('3');
    });

    it('ArrowUp while still focused on a declined value steps from the model', async () => {
      const { emitted, input } = mountWholeNumbersOnly(2);
      await flush();
      await type(input(), '2.5');
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await flush();
      expect(emitted).toEqual([2.5, 3]);
      expect(input().value).toBe('3');
    });

    it('a declined step is not left on screen', async () => {
      // A parent that refuses every change: the shown value must stay its own.
      const emitted: Array<number | null> = [];
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(DXNumberStepper, {
              modelValue: 4,
              'onUpdate:modelValue': (value: number | null) => emitted.push(value),
            }),
          ),
      });
      await flush();
      const input = screen.container.querySelector('input') as HTMLInputElement;
      (screen.container.querySelector('.dx-number-stepper__increase') as HTMLButtonElement).click();
      await flush();
      expect(emitted).toEqual([5]);
      expect(input.value).toBe('4');
      // And the next step is computed from 4 again, not from 5.
      (screen.container.querySelector('.dx-number-stepper__increase') as HTMLButtonElement).click();
      await flush();
      expect(emitted).toEqual([5, 5]);
      expect(input.value).toBe('4');
    });

    it('a parent that accepts the value still works as before (type, blur, step)', async () => {
      const { model, emitted, input, increase } = mountWholeNumbersOnly(2);
      await flush();
      await type(input(), '7');
      input().blur();
      await flush();
      expect(model.value).toBe(7);
      expect(input().value).toBe('7');
      increase().click();
      await flush();
      expect(emitted).toEqual([7, 8]);
      expect(input().value).toBe('8');
    });
  });
});
