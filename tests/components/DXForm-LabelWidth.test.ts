/**
 * The horizontal form's label column width, measured from rendered rects.
 *
 * With no `labelCols` from the caller, the label column is
 * `--dx-form-label-width` (45%) of the row from `sm` up and the input takes the
 * rest; below `sm` the label stacks above the input. An explicit `labelCols`
 * (form- or field-level, number or per-breakpoint object) still uses
 * Bootstrap's 12-column grid exactly as before.
 *
 * Class-name assertions would pass with the width rule missing or inert, so
 * these read geometry. The width rule lives in theme.scss and reaches the
 * tests through the BUILT dist/style.css: `npm run build:lib` after editing it.
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition, LabelCols } from '../../resources/js/types';

const settled = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const fields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Product name', hint: 'Shown on the menu and on receipts' },
  { key: 'active', type: 'switch', label: 'Available to order' },
];

const mountForm = async (options: { labelCols?: LabelCols; fields?: FieldDefinition[] } = {}) => {
  const screen = render(DXForm, {
    props: {
      form: useForm({ name: '', active: true }),
      fields: options.fields ?? fields,
      showSubmit: false,
      layout: 'horizontal',
      ...(options.labelCols !== undefined && { labelCols: options.labelCols }),
    },
  });
  await expect.element(screen.getByText('Product name')).toBeVisible();
  await settled();
  return screen;
};

/** The label column, the input column and their row, for the field labelled `labelText`. */
const columns = (root: Element, labelText: string) => {
  const label = Array.from(root.querySelectorAll<HTMLElement>('.col-form-label')).find((element) =>
    element.textContent?.includes(labelText),
  );
  expect(label, `expected a label column for "${labelText}"`).toBeTruthy();
  const row = label!.parentElement!;
  expect(row.classList.contains('row')).toBe(true);
  const content = label!.nextElementSibling as HTMLElement;
  expect(content).toBeTruthy();
  return {
    label: label!.getBoundingClientRect(),
    content: content.getBoundingClientRect(),
    row: row.getBoundingClientRect(),
  };
};

const labelShare = (root: Element, labelText: string) => {
  const { label, row } = columns(root, labelText);
  return label.width / row.width;
};

describe('DXForm horizontal label column width', () => {
  it('gives the label 45% of the row by default, with the input straight after it', async () => {
    await page.viewport(1200, 800);
    const screen = await mountForm();

    for (const labelText of ['Product name', 'Available to order']) {
      const { label, content, row } = columns(screen.container, labelText);
      const share = label.width / row.width;
      expect(Math.abs(share - 0.45), `${labelText}: label is ${(share * 100).toFixed(1)}% of the row`).toBeLessThan(0.005);
      expect(content.left).toBeCloseTo(label.right, 0);
      expect(content.right).toBeCloseTo(row.right, 0);
      // Side by side, not stacked.
      expect(content.top).toBeLessThan(label.bottom);
    }
  });

  it('still honours an explicit numeric labelCols (4 → a third)', async () => {
    await page.viewport(1200, 800);
    const screen = await mountForm({ labelCols: 4 });

    expect(Math.abs(labelShare(screen.container, 'Product name') - 4 / 12)).toBeLessThan(0.005);
  });

  it('lets a field-level labelCols win over the default', async () => {
    await page.viewport(1200, 800);
    const screen = await mountForm({
      fields: [{ ...fields[0], labelCols: 2 }, fields[1]],
    });

    expect(Math.abs(labelShare(screen.container, 'Product name') - 2 / 12)).toBeLessThan(0.005);
    expect(Math.abs(labelShare(screen.container, 'Available to order') - 0.45)).toBeLessThan(0.005);
  });

  it('still applies a responsive labelCols object per breakpoint', async () => {
    await page.viewport(1200, 800);
    let screen = await mountForm({ labelCols: { sm: 5, lg: 3 } });
    expect(Math.abs(labelShare(screen.container, 'Product name') - 3 / 12)).toBeLessThan(0.005);
    screen.unmount();

    await page.viewport(800, 800);
    screen = await mountForm({ labelCols: { sm: 5, lg: 3 } });
    expect(Math.abs(labelShare(screen.container, 'Product name') - 5 / 12)).toBeLessThan(0.005);
  });

  it('stacks the label above the input below sm by default', async () => {
    await page.viewport(500, 800);
    const screen = await mountForm();

    const { label, content, row } = columns(screen.container, 'Product name');
    expect(label.width).toBeCloseTo(row.width, 0);
    expect(content.top).toBeGreaterThanOrEqual(label.bottom - 0.5);
    expect(content.left).toBeCloseTo(label.left, 0);
  });
});
