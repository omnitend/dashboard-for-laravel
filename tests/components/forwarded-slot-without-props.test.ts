/**
 * Wrappers forward every slot with its slot props
 * (`#[name]="slotProps"` → `<slot :name v-bind="slotProps ?? {}" />`).
 *
 * bootstrap-vue-next 1.x asks whether a slot has content by CALLING it with
 * no argument (`isEmptySlot(slots.default)` is `(el?.() ?? []).length === 0`)
 * in BFormCheckbox, BFormRadio, BFormFile, BAvatar, BModal, BOffcanvas, BCard
 * and BSpinner. Our forwarded slot then receives `undefined`, and
 * `v-bind="slotProps"` compiles to `renderSlot(..., normalizeProps(
 * guardReactiveProps(undefined)))`, i.e. `props = null`. Vue before 3.5.41
 * (vuejs/core#15177) only defaulted `undefined`, so `renderSlot` read
 * `null.key` and threw "Cannot read properties of null (reading 'key')": the
 * checkbox rendered nothing. That broke every DXSwitch (it always passes a
 * default slot) on 0.49.0 and 0.49.1 in apps on Vue 3.5.38.
 *
 * The rendering tests below go red only on a Vue older than 3.5.41; this
 * suite's own Vue (3.5.44) defaults `null` too, so on it they pass either way
 * and the source guard at the bottom is what fails on the unguarded pattern.
 * To see the rendering tests fail for the real reason, run this file with
 * `vue` aliased to a 3.5.38 install (`resolve.alias` in a copy of
 * vitest.config.ts): every one of them fails there without the fallback.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, type Component } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DFormCheckbox from '../../resources/js/components/base/DFormCheckbox.vue';
import DFormRadio from '../../resources/js/components/base/DFormRadio.vue';
import DFormFile from '../../resources/js/components/base/DFormFile.vue';
import DAvatar from '../../resources/js/components/base/DAvatar.vue';
import DModal from '../../resources/js/components/base/DModal.vue';
import DOffcanvas from '../../resources/js/components/base/DOffcanvas.vue';
import DXSwitch from '../../resources/js/components/extended/DXSwitch.vue';
import DXField from '../../resources/js/components/extended/DXField.vue';
import { useForm } from '../../resources/js/composables/useForm';

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

const mount = (
  component: Component,
  props: Record<string, unknown>,
  slots: Record<string, () => unknown>,
) =>
  render(
    { render: () => h(BApp, {}, () => h(component, props, slots)) },
    { global: { stubs: { transition: false, 'transition-group': false } } },
  );

const textOf = (selector: string) =>
  Array.from(document.querySelectorAll(selector))
    .map((element) => element.textContent ?? '')
    .join(' ');

describe('a forwarded slot that bootstrap-vue-next calls with no argument', () => {
  it('DFormCheckbox renders its default slot (label content)', async () => {
    const screen = mount(DFormCheckbox, { modelValue: false }, { default: () => 'Accept the terms' });
    await settle();
    expect(screen.container.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(screen.container.querySelector('.form-check-label')?.textContent).toContain('Accept the terms');
  });

  it('DXSwitch renders (it always passes DFormCheckbox a default slot)', async () => {
    const screen = mount(DXSwitch, { modelValue: true, label: 'Product is current' }, {});
    await settle();
    expect(screen.container.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(screen.container.querySelector('.form-check-label')?.textContent).toContain('Product is current');
  });

  it('DXField of type switch and checkbox renders its control', async () => {
    for (const type of ['switch', 'checkbox']) {
      const screen = mount(
        DXField,
        { field: { key: 'is_current', label: 'Current', type }, form: useForm({ is_current: true }) },
        {},
      );
      await settle();
      expect(screen.container.querySelector('input[type="checkbox"]'), type).toBeTruthy();
      screen.unmount();
    }
  });

  it('DFormRadio renders its default slot', async () => {
    const screen = mount(DFormRadio, { value: 'a', name: 'choice' }, { default: () => 'Option A' });
    await settle();
    expect(screen.container.querySelector('input[type="radio"]')).toBeTruthy();
    expect(screen.container.textContent).toContain('Option A');
  });

  it('DFormFile renders its label and placeholder slots', async () => {
    const screen = mount(
      DFormFile,
      {},
      { label: () => 'Upload an invoice', placeholder: () => 'Nothing picked yet' },
    );
    await settle();
    expect(screen.container.querySelector('input[type="file"]')).toBeTruthy();
    expect(screen.container.textContent).toContain('Upload an invoice');
    expect(screen.container.textContent).toContain('Nothing picked yet');
  });

  it('DAvatar renders its default and badge slots', async () => {
    const screen = mount(DAvatar, {}, { default: () => 'JP', badge: () => '3' });
    await settle();
    expect(screen.container.querySelector('.b-avatar')?.textContent).toContain('JP');
    expect(screen.container.querySelector('.b-avatar .badge')?.textContent).toContain('3');
  });

  it('DModal renders its header-close slot', async () => {
    const screen = mount(
      DModal,
      { modelValue: true, title: 'Edit booking' },
      { default: () => 'Modal body', 'header-close': () => 'Shut' },
    );
    await settle();
    expect(textOf('.modal')).toContain('Modal body');
    expect(textOf('.modal-header')).toContain('Shut');
    screen.unmount();
  });

  it('DOffcanvas renders its footer and header-close slots', async () => {
    const screen = mount(
      DOffcanvas,
      { modelValue: true, title: 'Filters' },
      { default: () => 'Offcanvas body', footer: () => 'Offcanvas footer', 'header-close': () => 'Shut' },
    );
    await settle();
    expect(textOf('.offcanvas')).toContain('Offcanvas body');
    expect(textOf('.offcanvas')).toContain('Offcanvas footer');
    expect(textOf('.offcanvas-header')).toContain('Shut');
    screen.unmount();
  });
});

describe('slot-prop forwarding guard', () => {
  const sources = import.meta.glob('../../resources/js/components/**/*.vue', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  it('reads the component sources (positive control)', () => {
    const forwardingFiles = Object.entries(sources).filter(([, source]) => /#\[\w+\]="slotProps"/.test(source));
    expect(forwardingFiles.length).toBeGreaterThan(40);
    expect(Object.keys(sources).some((file) => file.endsWith('/DFormCheckbox.vue'))).toBe(true);
  });

  it('never binds forwarded slot props without a fallback for a slot called with no argument', () => {
    const offenders = Object.entries(sources).flatMap(([file, source]) =>
      source
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => /v-bind="slotProps"/.test(line))
        .map(({ number }) => `${file.replace('../../resources/js/components/', '')}:${number}`),
    );
    expect(offenders).toEqual([]);
  });
});
