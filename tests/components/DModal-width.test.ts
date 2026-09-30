import { it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DModal from '../../resources/js/components/base/DModal.vue';

it.each([
  { viewport: 1280, size: undefined, expected: 800 },
  { viewport: 1280, size: 'sm', expected: 300 },
  { viewport: 390, size: undefined, expected: 374 },
])('sizes the modal at $viewport with size=$size', async ({ viewport, size, expected }) => {
  await page.viewport(viewport, 900);
  render({ render: () => h(BApp, {}, () => h(DModal, { modelValue: true, ...(size ? { size } : {}) }, () => 'Form contents')) });
  await expect.poll(() => document.querySelector('.modal.show .modal-dialog')).toBeTruthy();
  const dialog = document.querySelector('.modal.show .modal-dialog')!;
  expect(dialog.textContent).toContain('Form contents');
  await expect.poll(() => Math.round(dialog.getBoundingClientRect().width)).toBe(expected);
  expect(dialog.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
  expect(dialog.getBoundingClientRect().right).toBeLessThanOrEqual(viewport);
});
