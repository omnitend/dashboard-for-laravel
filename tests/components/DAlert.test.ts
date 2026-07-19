import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DAlert from '../../resources/js/components/base/DAlert.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/*
 * DAlert defaults `modelValue` to `true` (#144) — bvn's BAlert defaults it to
 * `false`. BAlert keeps the `.alert` element in the DOM either way and toggles
 * the `.show` class, so presence proves nothing: assert VISIBILITY. Against the
 * pre-fix wrapper (default false) the first test goes red — a bare alert renders
 * `.fade` without `.show` and `checkVisibility()` is false.
 */
describe('DAlert default visibility (#144)', () => {
  it('renders visible by default with no model-value', async () => {
    const screen = render(DAlert, {
      props: { variant: 'info' },
      slots: { default: () => 'Heads up' },
    });
    await flush();

    const alert = screen.container.querySelector('.alert') as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.checkVisibility()).toBe(true);
    expect(alert.classList.contains('show')).toBe(true);
    expect(alert.textContent).toContain('Heads up');
  });

  it('stays hidden when model-value is explicitly false', async () => {
    const screen = render(DAlert, {
      props: { variant: 'info', modelValue: false },
      slots: { default: () => 'Should not show' },
    });
    await flush();

    const alert = screen.container.querySelector('.alert') as HTMLElement;
    expect(alert.checkVisibility()).toBe(false);
    expect(alert.classList.contains('show')).toBe(false);
  });

  it('forwards update:modelValue so v-model dismissal still round-trips', async () => {
    // The wrapper leaves `emits` undeclared, so the listener flows through
    // $attrs to BAlert. Dismissing must call it with false.
    let dismissedTo: unknown = 'unset';
    const screen = render(DAlert, {
      props: {
        variant: 'success',
        dismissible: true,
        modelValue: true,
        'onUpdate:modelValue': (value: boolean) => {
          dismissedTo = value;
        },
      },
      slots: { default: () => 'Dismiss me' },
    });
    await flush();

    const closeButton = screen.container.querySelector('.btn-close') as HTMLElement;
    expect(closeButton).not.toBeNull();
    closeButton.click();
    await flush();

    expect(dismissedTo).toBe(false);
  });
});
