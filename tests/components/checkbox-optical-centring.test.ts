import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXSwitch from '../../resources/js/components/extended/DXSwitch.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/*
 * The theme optically centres a check/radio/switch box against its label's first
 * line by nudging `.form-check-input`'s top margin from Bootstrap's 0.25em to
 * 0.325em (Poppins seats glyphs low in the line box). These read the COMPUTED
 * margin from the built dist stylesheet (tests/setup.ts imports it), so a revert
 * of the theme rule turns the first assertion red at 4px.
 */
describe('checkbox/switch optical centring (0.325em)', () => {
  it('gives a plain .form-check-input the optical-centre top margin, not Bootstrap 0.25em', async () => {
    const screen = render({
      render: () =>
        h('div', { class: 'form-check' }, [
          h('input', { class: 'form-check-input', type: 'checkbox' }),
          h('label', { class: 'form-check-label' }, 'Available'),
        ]),
    });
    await flush();

    const input = screen.container.querySelector('.form-check-input') as HTMLElement;
    const style = getComputedStyle(input);
    const marginTop = parseFloat(style.marginTop);
    const fontSize = parseFloat(style.fontSize);

    // Asserted relative to the input's own font-size, since `em` resolves against
    // it (whatever the inherited size happens to be in the harness). 0.325em is
    // the optical-centre value; Bootstrap's 0.25em is what this moved away from.
    expect(marginTop / fontSize).toBeCloseTo(0.325, 2);
    expect(marginTop / fontSize).toBeGreaterThan(0.25); // strictly past Bootstrap's default
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
