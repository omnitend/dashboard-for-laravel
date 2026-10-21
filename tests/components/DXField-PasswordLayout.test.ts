import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { page, userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import DButton from '../../resources/js/components/base/DButton.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { PasswordActionsSlotProps } from '../../resources/js/types';

/*
 * How a password field looks and lays out (0.47.0 review):
 *
 * - The eye is part of the field: the input's border colour, outer radius and
 *   background, not a darker square `outline-secondary` box; its keyboard focus
 *   takes the input's focus border and halo.
 * - A `password-actions` button (Generate) never squeezes the input: when the
 *   row cannot give the input `--dx-password-input-min-width` beside the
 *   actions, the actions wrap below it. Nothing overflows the modal or page.
 *
 * Measurements, not pixels. Thresholds are absolute (the token in px) or
 * containment checks, never proportional to text width, so Linux Chromium's
 * stepped glyph advances (CLAUDE.md, "macOS hides Linux text layout") cannot
 * move them. Elements are found by role/label/text rather than by the new
 * wrapper classes, so the same assertions run (and fail) against 0.46's
 * markup.
 */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Slot body: the consumer's Generate button, a filled `secondary` DButton. */
const generateButton = (slotProps: PasswordActionsSlotProps) =>
  h(
    DButton,
    {
      variant: 'secondary',
      disabled: slotProps.disabled,
      onClick: () => {
        slotProps.update('Gen-Secret-4821xQ');
        slotProps.setRevealed(true);
      },
    },
    () => 'Generate',
  );

/** `--dx-password-input-min-width` resolved to px on the root. */
function inputMinWidthPx(): number {
  const probe = document.createElement('div');
  probe.style.width = 'var(--dx-password-input-min-width, 11rem)';
  probe.style.position = 'absolute';
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

function parts(root: ParentNode) {
  const field = root.querySelector('[data-dx-field-key="password"]') as HTMLElement;
  const input = field.querySelector('input') as HTMLInputElement;
  const eye = field.querySelector(
    'button[aria-label="Show password"], button[aria-label="Hide password"]',
  ) as HTMLButtonElement;
  const generate = Array.from(field.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === 'Generate',
  ) as HTMLButtonElement;
  // The control column: the `.col` beside a horizontal label, else the field.
  const column = (input.closest('.col') ?? field) as HTMLElement;
  return { field, input, eye, generate, column };
}

/** Every rect inside `container` (1px of rounding allowed). */
function expectInside(element: Element, container: Element) {
  const inner = element.getBoundingClientRect();
  const outer = container.getBoundingClientRect();
  expect(inner.left).toBeGreaterThanOrEqual(outer.left - 1);
  expect(inner.right).toBeLessThanOrEqual(outer.right + 1);
}

function expectNoHorizontalOverflow() {
  const root = document.documentElement;
  expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
  const modalBody = document.querySelector('.modal.show .modal-body, .modal .modal-body');
  if (modalBody !== null) {
    expect(modalBody.scrollWidth).toBeLessThanOrEqual(modalBody.clientWidth);
  }
}

afterEach(async () => {
  document.documentElement.removeAttribute('data-bs-theme');
  document.querySelectorAll('.modal, .modal-backdrop').forEach((node) => node.remove());
  document.body.classList.remove('modal-open');
  document.body.removeAttribute('style');
  await page.viewport(414, 896);
});

function renderHorizontalForm() {
  const form = useForm({ name: '', password: 'correct-horse-battery' });
  return render({
    render: () =>
      h(BApp, {}, () =>
        // Page padding, as in a dashboard: a horizontal form's `.row` has
        // negative gutter margins that would otherwise overflow the window.
        h('div', { class: 'p-3' }, h(
          DXForm,
          {
            form,
            layout: 'horizontal',
            showSubmit: false,
            fields: [
              { key: 'name', type: 'text', label: 'Name' },
              { key: 'password', type: 'password', label: 'Password' },
            ],
          },
          { 'password-actions(password)': generateButton },
        )),
      ),
  });
}

describe('password field: the input stays readable at every width', () => {
  // Phone (stacked label), the sm/md band (horizontal label, narrow column),
  // and desktop widths.
  for (const viewportWidth of [320, 414, 600, 800, 1000, 1280]) {
    it(`DXForm (horizontal) at ${viewportWidth}px`, async () => {
      await page.viewport(viewportWidth, 800);
      const screen = renderHorizontalForm();
      await wait(100);

      const { input, eye, generate, column } = parts(screen.container);
      const minimum = inputMinWidthPx();
      // Positive control: the token resolved to something (11rem = 176px).
      expect(minimum).toBeGreaterThan(100);
      // Whenever the column has room for the minimum input and the eye, the
      // input gets at least the minimum, whatever the Generate button needs.
      if (column.clientWidth >= minimum + eye.offsetWidth) {
        expect(input.clientWidth).toBeGreaterThanOrEqual(minimum);
      }
      expectInside(input, column);
      expectInside(eye, column);
      expectInside(generate, column);
      expectNoHorizontalOverflow();
    });
  }

  it('keeps Generate on the input row when there is plenty of room', async () => {
    await page.viewport(1280, 800);
    const screen = renderHorizontalForm();
    await wait(100);
    const { input, generate } = parts(screen.container);
    const inputRect = input.getBoundingClientRect();
    const generateRect = generate.getBoundingClientRect();
    expect(Math.abs(generateRect.top - inputRect.top)).toBeLessThanOrEqual(1);
    expect(generateRect.left).toBeGreaterThan(inputRect.right);
  });

  // The reported case: DXTable's create modal (`editLayout` horizontal by
  // default, `lg` = 500px wide below the lg breakpoint, 800px from it) puts the
  // control column beside a 45% label column, about 250px at an 800px window
  // and 420px at 1000px. 0.47's first cut gave the input 77px there ("LC").
  for (const viewportWidth of [600, 800, 1000, 1280]) {
    it(`DXTable create modal at ${viewportWidth}px: input readable, no overflow`, async () => {
      await page.viewport(viewportWidth, 800);
      const screen = render({
        render: () =>
          h(BApp, {}, () =>
            h(
              DXTable,
              {
                items: [{ id: 1, name: 'Ann' }],
                fields: [{ key: 'name', label: 'Name' }],
                editFields: [
                  { key: 'name', type: 'text', label: 'Name' },
                  { key: 'password', type: 'password', label: 'Password' },
                ],
                itemName: 'user',
                createUrl: '/api/users',
              },
              { 'edit-password-actions(password)': generateButton },
            ),
          ),
      });
      await wait(80);
      (Array.from(screen.container.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === 'New user',
      ) as HTMLElement).click();
      await wait(300);

      const modal = document.querySelector('.modal') as HTMLElement;
      const { input, eye, generate, column } = parts(modal);
      // Positive control: the label really is beside the control here.
      expect(input.closest('.col')).not.toBeNull();
      expect(column.clientWidth).toBeGreaterThan(200);
      expect(column.clientWidth).toBeLessThan(500);

      generate.click();
      await wait(50);
      expect(input.value).toBe('Gen-Secret-4821xQ');
      expect(input.type).toBe('text');

      expect(input.clientWidth).toBeGreaterThanOrEqual(inputMinWidthPx());
      expectInside(input, column);
      expectInside(eye, column);
      expectInside(generate, column);
      expectNoHorizontalOverflow();
    });
  }
});

describe('password field: the eye is part of the input', () => {
  const colour = (element: Element, property: string) =>
    getComputedStyle(element).getPropertyValue(property);

  for (const theme of ['light', 'dark']) {
    it(`matches the input's border, radius and background (${theme})`, async () => {
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
      }
      await page.viewport(1000, 800);
      const screen = renderHorizontalForm();
      await wait(100);
      const { input, eye } = parts(screen.container);

      for (const side of ['top', 'right', 'bottom', 'left']) {
        expect(colour(eye, `border-${side}-color`)).toBe(colour(input, 'border-top-color'));
      }
      expect(colour(eye, 'background-color')).toBe(colour(input, 'background-color'));
      // The eye's outer corners carry the input's own radius (the input's
      // outer corners are its left ones).
      expect(colour(eye, 'border-top-right-radius')).toBe(colour(input, 'border-top-left-radius'));
      expect(colour(eye, 'border-bottom-right-radius')).toBe(
        colour(input, 'border-bottom-left-radius'),
      );
      expect(parseFloat(colour(eye, 'border-top-right-radius'))).toBeGreaterThan(0);
      // Same height as the input: one control.
      expect(Math.abs(eye.offsetHeight - input.offsetHeight)).toBeLessThanOrEqual(1);
    });
  }

  it("takes the input's focus border and halo on keyboard focus", async () => {
    await page.viewport(1000, 800);
    const screen = renderHorizontalForm();
    await wait(100);
    const { input, eye } = parts(screen.container);

    // Past Bootstrap's 0.15s border-color/box-shadow transition.
    input.focus();
    await wait(300);
    const inputFocusBorder = colour(input, 'border-top-color');
    const inputFocusShadow = colour(input, 'box-shadow');
    expect(inputFocusShadow).not.toBe('none');

    await userEvent.tab();
    await wait(300);
    expect(document.activeElement).toBe(eye);
    expect(eye.matches(':focus-visible')).toBe(true);
    expect(colour(eye, 'border-top-color')).toBe(inputFocusBorder);
    expect(colour(eye, 'box-shadow')).toBe(inputFocusShadow);
  });
});
