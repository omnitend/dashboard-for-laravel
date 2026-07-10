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
