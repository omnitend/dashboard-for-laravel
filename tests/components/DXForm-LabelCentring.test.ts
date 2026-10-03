/**
 * A horizontal field's label shares a vertical centre with the FIRST LINE of
 * its control, measured from rendered rects (label text's first line box vs
 * the control's box). Class-name assertions would pass with the alignment
 * rules missing or inert, so these read geometry. The rules live in
 * theme.scss and reach the tests through the BUILT dist/style.css.
 *
 * Switch-list rows (#160) put a label, a switch and an optional trailing
 * control (a consumer's notes input through `switch-list-item`) on one line.
 * The row's `align-items-center` used to land on bootstrap-vue-next's
 * BFormGroup wrapper rather than the inner `.row`, which a horizontal form
 * top-aligns, so the padded label column sat 11px below a lone switch and
 * 3.5px below a switch + notes row (the label "drops" when the switch is on).
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';

const settled = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/** Vertical centre of the first rendered line of text inside `element`. */
const firstLineCentre = (element: Element) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  const line = Array.from(range.getClientRects()).find((rect) => rect.height > 0);
  expect(line, 'label has a rendered line').toBeTruthy();
  return line!.top + line!.height / 2;
};

const centre = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return rect.top + rect.height / 2;
};

/** The label column whose text includes `labelText`, and its content column. */
const rowFor = (root: Element, labelText: string) => {
  const label = Array.from(root.querySelectorAll('.col-form-label')).find((element) =>
    element.textContent?.includes(labelText),
  );
  expect(label, `expected a label column for "${labelText}"`).toBeTruthy();
  return { label: label!, content: label!.nextElementSibling! };
};

const offset = (root: Element, labelText: string, controlSelector: string) => {
  const { label, content } = rowFor(root, labelText);
  const control = content.querySelector(controlSelector);
  expect(control, `expected "${controlSelector}" beside "${labelText}"`).toBeTruthy();
  return firstLineCentre(label) - centre(control!);
};

describe('horizontal labels centre on the first line of their control', () => {
  it('text, checkbox, switch, radio and file rows', async () => {
    await page.viewport(1200, 900);
    const screen = render(DXForm, {
      props: {
        form: useForm({ name: '', agreed: false, active: true, size: 'a', document: null, nativeTick: null, paddedFile: null }),
        showSubmit: false,
        layout: 'horizontal',
        fields: [
          { key: 'name', type: 'text', label: 'Product name', help: 'Shown on the menu' },
          { key: 'agreed', type: 'checkbox', label: 'Refund approval' },
          { key: 'active', type: 'switch', label: 'Available to order' },
          { key: 'size', type: 'radio', label: 'Portion', options: [{ value: 'a', text: 'Half' }, { value: 'b', text: 'Full' }] },
          { key: 'document', type: 'file', label: 'Name badge' },
          // Positive controls for the instrument: hand-built markup shaped
          // like the two pilot reports (a bare native checkbox; a file input
          // inside an `mt-2` wrapper). The measurement must SEE these as off.
          { key: 'nativeTick', label: 'Bare checkbox' },
          { key: 'paddedFile', label: 'Padded file' },
        ],
      },
      slots: {
        'value(nativeTick)': () =>
          h('label', { style: 'display:flex;align-items:center;margin:0' }, [
            h('input', { type: 'checkbox', class: 'bare-tick', style: 'width:1.25rem;height:1.25rem' }),
            h('span', 'Can approve'),
          ]),
        'value(paddedFile)': () =>
          h('div', { class: 'mt-2' }, [h('input', { type: 'file', class: 'form-control' })]),
      },
    });
    await expect.element(screen.getByText('Product name')).toBeVisible();
    await settled();
    const root = screen.container;

    expect(Math.abs(offset(root, 'Product name', 'input'))).toBeLessThan(1);
    expect(Math.abs(offset(root, 'Refund approval', '.form-check-input'))).toBeLessThan(1);
    expect(Math.abs(offset(root, 'Available to order', '.form-check-input'))).toBeLessThan(1);
    expect(Math.abs(offset(root, 'Portion', '.form-check-input'))).toBeLessThan(1);
    expect(Math.abs(offset(root, 'Name badge', 'input[type="file"]'))).toBeLessThan(1);

    // Help text stays below the control rather than being centred with it.
    const { content } = rowFor(root, 'Product name');
    const input = content.querySelector('input')!.getBoundingClientRect();
    const hint = content.querySelector('.form-text')!.getBoundingClientRect();
    expect(hint.top).toBeGreaterThanOrEqual(input.bottom - 0.5);

    expect(Math.abs(offset(root, 'Bare checkbox', '.bare-tick'))).toBeGreaterThan(5);
    expect(Math.abs(offset(root, 'Padded file', 'input[type="file"]'))).toBeGreaterThan(5);
  });
});

describe('switch-list rows centre the label, switch and trailing control together', () => {
  const mountList = async () => {
    await page.viewport(1200, 900);
    const screen = render(DXForm, {
      props: {
        form: useForm({ allergens: [1] }),
        showSubmit: false,
        layout: 'horizontal',
        fields: [
          {
            key: 'allergens',
            type: 'switch-list',
            hideLabel: true,
            options: [
              { value: 1, text: 'Celery' },
              { value: 2, text: 'Gluten' },
            ],
          },
        ],
      },
      slots: {
        'switch-list-item(allergens)': ({ on }: { on: boolean }) =>
          on ? h('input', { class: 'form-control form-control-sm notes', placeholder: 'Notes…' }) : null,
      },
    });
    await expect.element(screen.getByText('Celery')).toBeVisible();
    await settled();
    return screen.container;
  };

  it('an OFF row (label + switch)', async () => {
    const root = await mountList();
    expect(Math.abs(offset(root, 'Gluten', '.form-check-input'))).toBeLessThan(1);
  });

  it('an ON row (label + switch + notes input)', async () => {
    const root = await mountList();
    expect(rowFor(root, 'Celery').content.querySelector('.notes')).not.toBeNull();
    expect(Math.abs(offset(root, 'Celery', '.form-check-input'))).toBeLessThan(1);
    expect(Math.abs(offset(root, 'Celery', '.notes'))).toBeLessThan(1);
  });
});
