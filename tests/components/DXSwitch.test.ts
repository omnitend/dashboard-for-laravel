import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref, nextTick } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXSwitch from '../../resources/js/components/extended/DXSwitch.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mount = (props: Record<string, unknown>, slots?: Record<string, () => unknown>) =>
  render({
    render: () => h(BApp, {}, () => h(DXSwitch, props, slots)),
  });

describe('DXSwitch', () => {
  it('renders the filled-box switch with the label from the prop', async () => {
    const screen = mount({ modelValue: false, label: 'Auto-save' });
    await flush();

    expect(screen.container.querySelector('.dx-switch')).toBeTruthy();
    expect(screen.container.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(screen.container.textContent).toContain('Auto-save');
  });

  it('shows textWhenTrue / textWhenFalse for the current state', async () => {
    const on = mount({ modelValue: true, textWhenTrue: 'Product is current', textWhenFalse: 'Product is not current' });
    await flush();
    expect(on.container.textContent).toContain('Product is current');
    expect(on.container.textContent).not.toContain('Product is not current');

    const off = mount({ modelValue: false, textWhenTrue: 'Product is current', textWhenFalse: 'Product is not current' });
    await flush();
    expect(off.container.textContent).toContain('Product is not current');
  });

  it('falls back to label when no contextual text applies to the state', async () => {
    // On, but only textWhenFalse given -> falls back to label.
    const screen = mount({ modelValue: true, label: 'Fallback', textWhenFalse: 'Off text' });
    await flush();
    expect(screen.container.textContent).toContain('Fallback');
  });

  it('lets the default slot override the label prop', async () => {
    const screen = mount(
      { modelValue: false, label: 'ignored' },
      { default: () => h('span', { class: 'custom-label' }, 'Slotted') },
    );
    await flush();

    expect(screen.container.querySelector('.custom-label')?.textContent).toBe('Slotted');
    expect(screen.container.textContent).not.toContain('ignored');
  });

  it('applies the .dx-switch--on state class only when on', async () => {
    const on = mount({ modelValue: true, label: 'x' });
    await flush();
    expect(on.container.querySelector('.dx-switch--on')).toBeTruthy();

    const off = mount({ modelValue: false, label: 'x' });
    await flush();
    expect(off.container.querySelector('.dx-switch')).toBeTruthy();
    expect(off.container.querySelector('.dx-switch--on')).toBeFalsy();
  });

  it('reflects the model in the checkbox checked state', async () => {
    const screen = mount({ modelValue: true, label: 'x' });
    await flush();

    const input = screen.container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('emits a boolean update:modelValue when toggled', async () => {
    const model = ref(false);
    const screen = mount({
      modelValue: model.value,
      label: 'x',
      'onUpdate:modelValue': (value: boolean) => {
        model.value = value;
      },
    });
    await flush();

    (screen.container.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    await nextTick();
    await flush();

    expect(model.value).toBe(true);
  });

  it('forwards disabled through to the underlying checkbox', async () => {
    const screen = mount({ modelValue: false, label: 'x', disabled: true });
    await flush();

    const input = screen.container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});

/**
 * #158 — the default switch style is green-on / red-off; a `neutral` override is
 * for mixed-semantics switches (primary-on / grey-off). Asserts the ACTUAL
 * painted toggle colour (from the built dist theme), not just a class, so the
 * property that was asked for is what's tested.
 */
describe('DXSwitch on-variant (green-on / red-off default, #158)', () => {
  const SUCCESS = 'rgb(132, 204, 22)'; // #84cc16 solid lime
  const DANGER = 'rgb(220, 38, 38)'; // #dc2626 solid red
  const PRIMARY = 'rgb(21, 30, 45)'; // #151e2d brand navy

  const toggleBg = async (props: Record<string, unknown>) => {
    const screen = mount(props);
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const input = screen.container.querySelector('.form-check-input') as HTMLElement;
    return { bg: getComputedStyle(input).backgroundColor, root: screen.container.querySelector('.dx-switch') as HTMLElement, screen };
  };

  it('defaults to onVariant="success": green track when ON', async () => {
    const { bg, root } = await toggleBg({ modelValue: true, label: 'Current' });
    expect(bg).toBe(SUCCESS);
    expect(root.classList.contains('dx-switch--success')).toBe(true);
  });

  it('defaults to red track when OFF', async () => {
    const { bg } = await toggleBg({ modelValue: false, label: 'Current' });
    expect(bg).toBe(DANGER);
  });

  it('onVariant="neutral" is primary-on (not green) and tags the toggle switch-neutral', async () => {
    const { bg, root, screen } = await toggleBg({ modelValue: true, label: 'Contains alcohol', onVariant: 'neutral' });
    expect(bg).toBe(PRIMARY);
    expect(bg).not.toBe(SUCCESS);
    expect(root.classList.contains('dx-switch--neutral')).toBe(true);
    // The inner form-switch carries switch-neutral so the global theme restores
    // grey-off / primary-on for the toggle.
    expect(screen.container.querySelector('.form-switch.switch-neutral')).toBeTruthy();
  });

  it('onVariant="neutral" is grey (not red) when OFF', async () => {
    const { bg } = await toggleBg({ modelValue: false, label: 'Contains alcohol', onVariant: 'neutral' });
    expect(bg).not.toBe(DANGER);
    expect(bg).not.toBe(SUCCESS);
  });
});
