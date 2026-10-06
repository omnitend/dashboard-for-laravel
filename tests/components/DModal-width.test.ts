import { it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DModal from '../../resources/js/components/base/DModal.vue';

it.each([
  { viewport: 1280, size: undefined, expected: 800 },
  { viewport: 1280, size: 'sm', expected: 300 },
  { viewport: 390, size: undefined, expected: 390 },
  { viewport: 390, size: 'sm', expected: 374 },
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

/*
 * Below `sm` DModal is full screen by default (Bootstrap's
 * `.modal-fullscreen-sm-down`), except a `size="sm"` dialog, which stays a
 * centred confirmation. Full screen means the dialog's rect IS the viewport,
 * the footer stays on screen and the body is what scrolls.
 */
it('covers the viewport below sm, with a pinned footer and a scrolling body', async () => {
  await page.viewport(390, 844);
  render({
    render: () => h(BApp, {}, () => h(DModal, { modelValue: true, title: 'Edit' }, () =>
      h('div', { class: 'tall-probe', style: 'height: 2000px' }, 'Tall'))),
  });
  await expect.poll(() => document.querySelector('.modal.show .modal-dialog')).toBeTruthy();
  const dialog = document.querySelector('.modal.show .modal-dialog')!;
  expect(dialog.classList.contains('modal-fullscreen-sm-down')).toBe(true);
  await expect.poll(() => Math.round(dialog.getBoundingClientRect().height)).toBe(window.innerHeight);
  const rect = dialog.getBoundingClientRect();
  expect([Math.round(rect.left), Math.round(rect.top), Math.round(rect.width)]).toEqual([0, 0, window.innerWidth]);

  const footer = document.querySelector('.modal.show .modal-footer')!;
  expect(Math.round(footer.getBoundingClientRect().bottom)).toBeLessThanOrEqual(window.innerHeight);
  const body = document.querySelector('.modal.show .modal-body') as HTMLElement;
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
  expect(getComputedStyle(body).overflowY).toBe('auto');
});

it('keeps a size="sm" modal as a centred dialog below sm', async () => {
  await page.viewport(390, 844);
  render({ render: () => h(BApp, {}, () => h(DModal, { modelValue: true, size: 'sm' }, () => 'Sure?')) });
  await expect.poll(() => document.querySelector('.modal.show .modal-dialog')).toBeTruthy();
  const dialog = document.querySelector('.modal.show .modal-dialog')!;
  expect(dialog.classList.contains('modal-fullscreen-sm-down')).toBe(false);
  await expect.poll(() => Math.round(dialog.getBoundingClientRect().height)).toBeLessThan(window.innerHeight);
});

it('lets a consumer opt out with :fullscreen="false"', async () => {
  await page.viewport(390, 844);
  render({ render: () => h(BApp, {}, () => h(DModal, { modelValue: true, fullscreen: false }, () => 'Body')) });
  await expect.poll(() => document.querySelector('.modal.show .modal-dialog')).toBeTruthy();
  const dialog = document.querySelector('.modal.show .modal-dialog')!;
  expect(dialog.classList.contains('modal-fullscreen-sm-down')).toBe(false);
  await expect.poll(() => Math.round(dialog.getBoundingClientRect().width)).toBe(374);
});

it('is not full screen from sm up', async () => {
  await page.viewport(1280, 900);
  render({ render: () => h(BApp, {}, () => h(DModal, { modelValue: true }, () => 'Body')) });
  await expect.poll(() => document.querySelector('.modal.show .modal-dialog')).toBeTruthy();
  const dialog = document.querySelector('.modal.show .modal-dialog')!;
  await expect.poll(() => Math.round(dialog.getBoundingClientRect().width)).toBe(800);
  expect(Math.round(dialog.getBoundingClientRect().height)).toBeLessThan(window.innerHeight);
});
