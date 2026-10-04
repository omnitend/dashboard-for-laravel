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

/**
 * Display-only values (pilot note 29). A badge, a line of text or a short
 * stack of lines has no input box, so without help it sits at the top of the
 * row while the label column is padded down to an input's text line: "No PIN
 * set" sat ~7px above "Employee PIN". `.dx-form-plaintext` gives the value
 * the same top/bottom offset as `.col-form-label`, and DXField puts it round
 * a `plaintext` field's `value` slot automatically.
 */
describe('display-only values share the label line', () => {
  const mountDisplayRows = async () => {
    await page.viewport(1200, 900);
    const screen = render(DXForm, {
      props: {
        form: useForm({ pin: null, connection: null, history: null, status: null, created: 'Sat 18th Apr', bareBadge: null }),
        showSubmit: false,
        layout: 'horizontal',
        fields: [
          { key: 'pin', label: 'Employee PIN' },
          { key: 'connection', label: 'Connection' },
          { key: 'history', label: 'Cost history' },
          // The automatic path: a plaintext field's value slot is wrapped.
          { key: 'status', label: 'Printer status', plaintext: true },
          // The built-in plaintext text control was already aligned.
          { key: 'created', type: 'text', label: 'Created', plaintext: true },
          // Positive control: the same badge with no wrapper must read as off.
          { key: 'bareBadge', label: 'Bare badge' },
        ],
      },
      slots: {
        'value(pin)': () => h('div', { class: 'dx-form-plaintext' }, [h('span', { class: 'pin-text text-muted' }, 'No PIN set')]),
        'value(connection)': () =>
          h('div', { class: 'dx-form-plaintext' }, [h('span', { class: 'badge text-bg-secondary connection-badge' }, 'Not connected')]),
        'value(history)': () =>
          h('div', { class: 'dx-form-plaintext' }, [
            h('div', { class: 'history-line' }, '£1.20 from 1 Apr'),
            h('div', { class: 'history-line' }, '£1.10 from 1 Jan'),
          ]),
        'value(status)': () => h('span', { class: 'badge text-bg-success status-badge' }, 'Online'),
        'value(bareBadge)': () => h('span', { class: 'badge text-bg-secondary bare-badge' }, 'Not connected'),
      },
    });
    await expect.element(screen.getByText('Employee PIN')).toBeVisible();
    await settled();
    return screen.container;
  };

  /** Label first-line centre minus the value's first-line centre. */
  const textOffset = (root: Element, labelText: string, valueSelector: string) => {
    const { label, content } = rowFor(root, labelText);
    const value = content.querySelector(valueSelector);
    expect(value, `expected "${valueSelector}" beside "${labelText}"`).toBeTruthy();
    return firstLineCentre(label) - firstLineCentre(value!);
  };

  it('plain text', async () => {
    const root = await mountDisplayRows();
    expect(Math.abs(textOffset(root, 'Employee PIN', '.pin-text'))).toBeLessThan(1);
  });

  it('a badge', async () => {
    const root = await mountDisplayRows();
    expect(Math.abs(offset(root, 'Connection', '.connection-badge'))).toBeLessThan(1);
  });

  it('the first line of a two-line stack', async () => {
    const root = await mountDisplayRows();
    const lines = rowFor(root, 'Cost history').content.querySelectorAll('.history-line');
    expect(lines).toHaveLength(2);
    expect(lines[1].getBoundingClientRect().top).toBeGreaterThan(lines[0].getBoundingClientRect().top);
    expect(Math.abs(textOffset(root, 'Cost history', '.history-line'))).toBeLessThan(1);
  });

  it("a plaintext field's value slot, with no class from the consumer", async () => {
    const root = await mountDisplayRows();
    expect(Math.abs(offset(root, 'Printer status', '.status-badge'))).toBeLessThan(1);
    expect(Math.abs(offset(root, 'Created', 'input'))).toBeLessThan(1);
  });

  // Until 0.42.1 this was the positive control (an unwrapped badge sat 2-11px
  // off); a display-only row is now aligned with no class, so it is pinned
  // as aligned, and the control moves to a row that keeps the top alignment.
  it('an unwrapped badge in an ordinary value slot is aligned too', async () => {
    const root = await mountDisplayRows();
    expect(Math.abs(offset(root, 'Bare badge', '.bare-badge'))).toBeLessThan(1);
  });
});

/**
 * Display-only values with NO class and NO field flag (0.42.1). Consumers kept
 * missing `.dx-form-plaintext`: the downstream app's product category modal
 * showed a "Products" row (a small borderless table: the category name, and a
 * "16 products" link on the right) ~10px above its label. A row whose content
 * column holds no form control is now baseline-aligned, so the FIRST line of
 * text in it, whatever its shape, sits on the label's first line.
 */
describe('display-only values of any shape share the label line with no class', () => {
  const mountBareRows = async () => {
    await page.viewport(1200, 900);
    const screen = render(DXForm, {
      props: {
        form: useForm({ text: null, link: null, badge: null, split: null, table: null, stack: null, withButton: null }),
        showSubmit: false,
        layout: 'horizontal',
        fields: [
          { key: 'text', label: 'Employee PIN' },
          { key: 'link', label: 'Website' },
          { key: 'badge', label: 'Connection' },
          { key: 'split', label: 'Products' },
          { key: 'table', label: 'Product table' },
          { key: 'stack', label: 'Cost history' },
          // Positive control: text beside a button is NOT display-only, so the
          // row keeps the top alignment and the text sits high, as before.
          { key: 'withButton', label: 'Printer' },
        ],
      },
      slots: {
        'value(text)': () => h('span', { class: 'bare-text text-muted' }, 'No PIN set'),
        'value(link)': () => h('a', { href: '#', class: 'bare-link' }, 'Open the shop'),
        'value(badge)': () => h('span', { class: 'badge text-bg-secondary bare-badge' }, 'Not connected'),
        'value(split)': () =>
          h('div', { class: 'd-flex justify-content-between' }, [
            h('span', { class: 'split-name' }, 'Alcopop'),
            h('a', { href: '#', class: 'split-link' }, '16 products'),
          ]),
        'value(table)': () =>
          h('table', { class: 'table table-sm table-borderless mb-0' }, [
            h('tbody', [
              h('tr', [h('td', { class: 'table-first' }, 'Alcopop'), h('td', { class: 'text-end' }, [h('a', { href: '#' }, '16 products')])]),
              h('tr', { class: 'small' }, [h('td', [h('i', 'Subcategories of Alcopop')]), h('td', { class: 'text-end' }, '3 products')]),
            ]),
          ]),
        'value(withButton)': () =>
          h('div', [h('div', { class: 'beside-button' }, 'Kitchen'), h('button', { type: 'button', class: 'btn btn-secondary' }, 'Test print')]),
        'value(stack)': () =>
          h('div', [
            h('div', { class: 'stack-line' }, '£1.20 from 1 Apr'),
            h('div', { class: 'stack-line' }, '£1.10 from 1 Jan'),
          ]),
      },
    });
    await expect.element(screen.getByText('Employee PIN')).toBeVisible();
    await settled();
    return screen.container;
  };

  const textOffset = (root: Element, labelText: string, valueSelector: string) => {
    const { label, content } = rowFor(root, labelText);
    const value = content.querySelector(valueSelector);
    expect(value, `expected "${valueSelector}" beside "${labelText}"`).toBeTruthy();
    return firstLineCentre(label) - firstLineCentre(value!);
  };

  it('(a) plain text', async () => {
    const root = await mountBareRows();
    expect(Math.abs(textOffset(root, 'Employee PIN', '.bare-text'))).toBeLessThan(1);
  });

  it('(b) a link', async () => {
    const root = await mountBareRows();
    expect(Math.abs(textOffset(root, 'Website', '.bare-link'))).toBeLessThan(1);
  });

  it('(c) a badge', async () => {
    const root = await mountBareRows();
    expect(Math.abs(offset(root, 'Connection', '.bare-badge'))).toBeLessThan(1);
  });

  it('(d) a two-cell flex row: text left, link right', async () => {
    const root = await mountBareRows();
    expect(Math.abs(textOffset(root, 'Products', '.split-name'))).toBeLessThan(1);
    expect(Math.abs(textOffset(root, 'Products', '.split-link'))).toBeLessThan(1);
  });

  it("(e) a small table's first row", async () => {
    const root = await mountBareRows();
    expect(Math.abs(textOffset(root, 'Product table', '.table-first'))).toBeLessThan(1);
  });

  it('(f) the first line of a multi-line stack, the second below it', async () => {
    const root = await mountBareRows();
    const lines = rowFor(root, 'Cost history').content.querySelectorAll('.stack-line');
    expect(lines).toHaveLength(2);
    expect(lines[1].getBoundingClientRect().top).toBeGreaterThan(lines[0].getBoundingClientRect().top);
    expect(Math.abs(textOffset(root, 'Cost history', '.stack-line'))).toBeLessThan(1);
  });

  it('positive control: text above a button keeps the top alignment', async () => {
    const root = await mountBareRows();
    // A row holding a button is not display-only: its first line of text sits
    // at the top of the row, well above the label, as before 0.42.1.
    expect(Math.abs(textOffset(root, 'Printer', '.beside-button'))).toBeGreaterThan(3);
  });
});
