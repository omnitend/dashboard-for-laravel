import { beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DButton from '../../resources/js/components/base/DButton.vue';
import DFormInput from '../../resources/js/components/base/DFormInput.vue';
import DFormSelect from '../../resources/js/components/base/DFormSelect.vue';
import DInputGroup from '../../resources/js/components/base/DInputGroup.vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import themeCss from '../../resources/css/theme.scss?inline';

beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = themeCss;
  document.head.appendChild(style);
});
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('shared control consistency', () => {
  it.each([undefined, 'sm', 'lg'] as const)('matches input, select and mixed-group button heights at size %s', async size => {
    const screen = render({ render: () => h(BApp, {}, () => h('div', { style: 'width: 900px' }, [
      h(DButton, { size, 'data-test': 'button' }, () => 'Action'),
      h(DFormInput, { size, 'data-test': 'input' }),
      h(DFormSelect, { size, options: ['Example'], 'data-test': 'select' }),
      h(DInputGroup, { size, prepend: 'Showing menu', 'data-test': 'selector-group' }, () => h(DFormSelect, { options: ['Example'] })),
      h(DInputGroup, { size, prepend: 'Add section', 'data-test': 'mixed-group' }, () => [
        h(DFormInput), h(DFormSelect, { options: ['Example'] }), h(DButton, {}, () => 'Add section'),
      ]),
    ])) });
    await flush();
    const root = screen.container;
    const height = root.querySelector('[data-test="button"]')!.getBoundingClientRect().height;
    expect(height).toBeGreaterThan(30);
    for (const selector of ['[data-test="input"]', '[data-test="select"]', '[data-test="selector-group"]', '[data-test="mixed-group"]']) {
      const control = root.querySelector(selector)!;
      expect(control).toBeTruthy();
      expect(control.getBoundingClientRect().height).toBeCloseTo(height, 0);
    }
  });

  it('keeps horizontal form labels aligned with the input text', async () => {
    // The default label column stacks below the `sm` viewport breakpoint, and
    // the runner's default window is narrower than that.
    await page.viewport(1200, 800);
    const screen = render({ setup() {
      const form = useForm({ name: 'Example' });
      return () => h('div', { style: 'width: 900px' }, [h(DXForm, {
        form, layout: 'horizontal', showSubmit: false,
        fields: [{ key: 'name', type: 'text', label: 'Name' }],
      })]);
    } });
    await flush();
    const label = screen.container.querySelector('label')!;
    const input = screen.container.querySelector('input')!;
    expect(label).toBeTruthy();
    expect(input).toBeTruthy();
    const range = document.createRange();
    range.selectNodeContents(label);
    const text = range.getBoundingClientRect();
    const control = input.getBoundingClientRect();
    expect(control.height).toBeGreaterThan(40);
    expect(Math.abs(text.top + text.height / 2 - control.top - control.height / 2)).toBeLessThan(2);
  });

  it('centres short table content beside a taller action and preserves align-top', async () => {
    const screen = render({ render: () => h(BApp, {}, () => h(DXTable, {
      items: [{ id: 1, name: 'Example', notes: 'Details' }], clientSide: true,
      fields: [{ key: 'name' }, { key: 'notes', tdClass: 'align-top' }, { key: 'action' }],
    }, {
      'cell(name)': () => h('span', { 'data-test': 'name' }, 'Example'),
      'cell(notes)': () => h('span', { 'data-test': 'notes' }, 'Details'),
      'cell(action)': () => h(DButton, { icon: 'trash', iconOnly: true, 'aria-label': 'Delete', 'data-test': 'action' }),
    })) });
    await flush();
    const name = screen.container.querySelector('[data-test="name"]')!;
    const action = screen.container.querySelector('[data-test="action"]')!;
    const notes = screen.container.querySelector('[data-test="notes"]')!;
    expect(action.getBoundingClientRect().height).toBeGreaterThan(30);
    const centre = (element: Element) => { const box = element.getBoundingClientRect(); return box.top + box.height / 2; };
    expect(Math.abs(centre(name) - centre(action))).toBeLessThan(2);
    expect(getComputedStyle(name.closest('td')!).verticalAlign).toBe('middle');
    expect(getComputedStyle(notes.closest('td')!).verticalAlign).toBe('top');
  });
});
