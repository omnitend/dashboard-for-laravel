import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DFormInput from '../../resources/js/components/base/DFormInput.vue';
import DFormSelect from '../../resources/js/components/base/DFormSelect.vue';
import DFormTextarea from '../../resources/js/components/base/DFormTextarea.vue';
import DFormFile from '../../resources/js/components/base/DFormFile.vue';

/**
 * Focus rings follow the brand and the form-error colour. Before the fix the
 * plain ring was a leftover indigo (rgba(79, 70, 229, 0.1)) from before the
 * navy brand, and an invalid control's ring was the danger MAGENTA
 * (Bootstrap's `$form-validation-states` reads `--bs-danger-rgb`) around a
 * crimson border, against the rule that form errors are crimson.
 */
const NAVY = '21, 30, 45'; // $primary #151e2d
const CRIMSON = '200, 16, 46'; // $dx-form-error #c8102e
const INDIGO = '79, 70, 229';
const MAGENTA_DANGER = '163, 36, 127'; // $danger #a3247f

const themeApplied = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--dx-chart-1').trim() !== '';

const focusedShadow = async (
  component: unknown,
  props: Record<string, unknown>,
  selector: string,
  focusSelector = selector,
) => {
  const screen = render({ render: () => h(component as never, props) });
  let target: HTMLElement | null = null;
  for (let i = 0; i < 150; i++) {
    target = screen.container.querySelector(selector) as HTMLElement | null;
    if (target && themeApplied()) break;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  (screen.container.querySelector(focusSelector) as HTMLElement).focus();
  // Bootstrap transitions box-shadow; wait for it to settle.
  let previous = '';
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    const current = getComputedStyle(target!).boxShadow;
    if (current === previous && current !== 'none') break;
    previous = current;
  }
  return getComputedStyle(target!).boxShadow;
};

const controls: Array<[string, unknown, string, string?]> = [
  ['DFormInput', DFormInput, 'input'],
  ['DFormSelect', DFormSelect, 'select'],
  ['DFormTextarea', DFormTextarea, 'textarea'],
  ['DFormFile', DFormFile, '.b-form-file-control', 'button'],
];

describe('focus rings', () => {
  for (const [name, component, selector, focusSelector] of controls) {
    it(`a focused ${name} rings in the brand navy, not the old indigo`, async () => {
      const shadow = await focusedShadow(component, {}, selector, focusSelector);
      expect(shadow).toContain(`rgba(${NAVY}`);
      expect(shadow).not.toContain(INDIGO);
    });

    it(`a focused invalid ${name} rings in the crimson error colour, not magenta`, async () => {
      const shadow = await focusedShadow(component, { state: false }, selector, focusSelector);
      expect(shadow).toContain(`rgba(${CRIMSON}`);
      expect(shadow).not.toContain(MAGENTA_DANGER);
    });
  }
});
