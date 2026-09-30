import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXSwitch from '../../resources/js/components/extended/DXSwitch.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/*
 * The theme centres a check/radio box against the first line of its label,
 * using the actual line height and control size. The switch component centres
 * its input independently and must keep a zero margin.
 */
describe('checkbox/switch optical centring', () => {
  it('centres a plain checkbox on the first label line', async () => {
    const screen = render({
      render: () =>
        h('div', { class: 'form-check' }, [
          h('input', { class: 'form-check-input', type: 'checkbox' }),
          h('label', { class: 'form-check-label' }, 'Available'),
        ]),
    });
    await flush();

    const input = screen.container.querySelector('.form-check-input') as HTMLElement;
    const label = screen.container.querySelector('.form-check-label') as HTMLElement;
    const inputCentre = input.getBoundingClientRect().top + input.getBoundingClientRect().height / 2;
    const firstLineCentre = label.getBoundingClientRect().top + parseFloat(getComputedStyle(label).lineHeight) / 2;

    expect(Math.abs(inputCentre - firstLineCentre)).toBeLessThan(1);
  });

  it('leaves DXSwitch unaffected — its flex-centred inner input keeps margin 0', async () => {
    // DXSwitch zeroes the inner input's margin at higher specificity
    // (`.dx-switch :deep(.form-check-input) { margin: 0 }`), so the global
    // optical-centre margin must NOT leak into it and shove the toggle down.
    const screen = render({
      render: () => h(BApp, {}, () => h(DXSwitch, { modelValue: true, label: 'Visible' })),
    });
    await flush();

    const input = screen.container.querySelector('.dx-switch .form-check-input') as HTMLElement;
    expect(input).toBeTruthy();
    expect(parseFloat(getComputedStyle(input).marginTop)).toBe(0);
  });
});
