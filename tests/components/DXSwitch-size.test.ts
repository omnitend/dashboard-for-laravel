import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXSwitch from '../../resources/js/components/extended/DXSwitch.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const boxHeight = (root: Element): number => {
  const box = root.querySelector('.dx-switch .form-check') as HTMLElement;
  expect(box).toBeTruthy();
  return box.getBoundingClientRect().height;
};

describe('DXSwitch size="sm"', () => {
  let defaultHeight = 0;

  beforeEach(async () => {
    // Baseline: the default box matches the input height (~35px). Captured per
    // test so the sm comparison is against a freshly measured default, not a
    // hard-coded px that drifts with theme changes to --dx-input-height.
    const screen = render({
      render: () => h(BApp, {}, () => h(DXSwitch, { modelValue: true, label: 'Default' })),
    });
    await flush();
    defaultHeight = boxHeight(screen.container);
  });

  it('applies the dx-switch--sm class only when size="sm"', async () => {
    const plain = render({
      render: () => h(BApp, {}, () => h(DXSwitch, { modelValue: true, label: 'x' })),
    });
    await flush();
    expect(plain.container.querySelector('.dx-switch--sm')).toBeNull();

    const sm = render({
      render: () => h(BApp, {}, () => h(DXSwitch, { modelValue: true, label: 'x', size: 'sm' })),
    });
    await flush();
    expect(sm.container.querySelector('.dx-switch--sm')).toBeTruthy();
  });

  it('renders a shorter box than the default size', async () => {
    const sm = render({
      render: () => h(BApp, {}, () => h(DXSwitch, { modelValue: true, label: 'Compact', size: 'sm' })),
    });
    await flush();
    const smHeight = boxHeight(sm.container);

    // The whole point of the variant: a compact box for dense rows. Without the
    // `.dx-switch--sm :deep(.form-check)` rule the sm box equals the default and
    // this goes red (the vacuous case). Expect a real reduction (~35px → ~31px).
    expect(smHeight).toBeLessThan(defaultHeight - 2);
  });

  it('keeps the standard box matching the input height when size is omitted', () => {
    // ~35px, the --dx-input-height floor. Guards that the sm rule didn't leak
    // into the default via a too-broad selector.
    expect(defaultHeight).toBeGreaterThan(32);
  });
});
