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
  it('keeps enabled labels at regular weight in both switch variants', async () => {
    for (const onVariant of ['success', 'neutral']) {
      const screen = mount({ modelValue: true, label: 'Collection is enabled', onVariant });
      await flush();

      const label = screen.container.querySelector('.form-check-label') as HTMLElement;
      expect(getComputedStyle(label).fontWeight).toBe('400');
    }
  });

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
 * #158 — DXSwitch is the "filled box": the WHOLE box carries the state colour
 * (green ON / light-red OFF by default) and the pill uses a muted green-grey ON and red-grey OFF
 * affordance. `neutral` keeps a brand primary panel for mixed-semantics
 * switches. Asserts the ACTUAL painted colours (from the built dist theme) by
 * channel dominance — robust to the exact soft-mix — so the property asked for
 * (green box / red box / state-tinted pill) is what's tested, not a class.
 */
describe('DXSwitch filled box (green-on / light-red-off default, #158)', () => {
  const chans = (rgb: string): [number, number, number] => {
    const m = rgb.match(/\d+/g)!.map(Number);
    return [m[0], m[1], m[2]];
  };
  const painted = async (props: Record<string, unknown>) => {
    const screen = mount(props);
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const box = screen.container.querySelector('.form-check') as HTMLElement;
    const pill = screen.container.querySelector('.form-check-input') as HTMLElement;
    return {
      box: chans(getComputedStyle(box).backgroundColor),
      pill: chans(getComputedStyle(pill).backgroundColor),
      root: screen.container.querySelector('.dx-switch') as HTMLElement,
      screen,
    };
  };

  it('default ON: the whole box is green and the pill is a muted green-grey', async () => {
    const { box, pill, root } = await painted({ modelValue: true, label: 'Current' });
    // Green box: green channel dominates.
    expect(box[1]).toBeGreaterThan(box[0]);
    expect(box[1]).toBeGreaterThan(box[2]);
    expect(root.classList.contains('dx-switch--success')).toBe(true);
    // The track harmonises with the green box without repeating its bright fill.
    expect(pill[1]).toBeGreaterThan(pill[0]);
    expect(pill[0]).toBeGreaterThan(pill[2]);
    expect(pill[1]).toBeLessThan(box[1]);
  });

  it('keeps the ON tint under keyboard focus and when disabled', async () => {
    const { pill, screen } = await painted({ modelValue: true, label: 'Current' });
    const input = screen.container.querySelector('input') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);
    expect(chans(getComputedStyle(input).backgroundColor)).toEqual(pill);
    expect(getComputedStyle(input).boxShadow).not.toBe('none');

    const disabled = await painted({ modelValue: true, label: 'Locked', disabled: true });
    const disabledInput = disabled.screen.container.querySelector('input') as HTMLInputElement;
    expect(disabledInput.disabled).toBe(true);
    expect(disabledInput.checked).toBe(true);
    expect(disabled.pill).toEqual(pill);
  });

  it('allows the ON track token to be overridden independently', async () => {
    const { root, screen } = await painted({ modelValue: true, label: 'Current' });
    root.style.setProperty('--dx-switch-on-pill', '#445544');
    const input = screen.container.querySelector('input') as HTMLInputElement;
    await expect.poll(() => getComputedStyle(input).backgroundColor).toBe('rgb(68, 85, 68)');
  });

  it('default OFF: the whole box is light red (red channel dominates)', async () => {
    const { box, pill } = await painted({ modelValue: false, label: 'Current' });
    expect(box[0]).toBeGreaterThan(box[1]);
    expect(box[0]).toBeGreaterThan(box[2]);
    expect(pill[0]).toBeGreaterThan(pill[1]);
    expect(pill[0]).toBeGreaterThan(pill[2]);
    expect(pill[0]).toBeLessThan(box[0]);
  });

  it('keeps the OFF tint under focus and allows a separate OFF token override', async () => {
    const { root, pill, screen } = await painted({ modelValue: false, label: 'Closed' });
    const input = screen.container.querySelector('input') as HTMLInputElement;
    input.focus();
    expect(chans(getComputedStyle(input).backgroundColor)).toEqual(pill);
    root.style.setProperty('--dx-switch-off-pill', '#996666');
    await expect.poll(() => getComputedStyle(input).backgroundColor).toBe('rgb(153, 102, 102)');
    const disabled = await painted({ modelValue: false, label: 'Closed', disabled: true });
    expect((disabled.screen.container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
    expect(disabled.pill).toEqual(pill);
  });

  it('onVariant="neutral": box is not the success green and the toggle is switch-neutral', async () => {
    const { box, root, screen } = await painted({ modelValue: true, label: 'Contains alcohol', onVariant: 'neutral' });
    // Not a green box (neutral is a primary/navy-tinted panel, not green).
    expect(box[1] > box[0] && box[1] > box[2]).toBe(false);
    expect(root.classList.contains('dx-switch--neutral')).toBe(true);
    expect(screen.container.querySelector('.form-switch.switch-neutral')).toBeTruthy();
  });
});
