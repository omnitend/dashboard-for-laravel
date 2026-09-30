import { it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DXModalActions from '../../resources/js/components/extended/DXModalActions.vue';
import DButton from '../../resources/js/components/base/DButton.vue';

it('stacks additional actions at full width with a gap by default', async () => {
  const screen = render({render: () => h('div', {style:'width:480px'}, [h(DXModalActions, {}, () => [h(DButton, {href:'/sales'}, ()=>'View sales'), h(DButton, {}, ()=>'Print report')])])});
  const group = screen.container.querySelector('.dx-modal-actions')!;
  const buttons = [...group.querySelectorAll('.btn')];
  expect(buttons).toHaveLength(2);
  const first = buttons[0].getBoundingClientRect();
  const second = buttons[1].getBoundingClientRect();
  expect(first.width).toBeCloseTo(group.getBoundingClientRect().width, 0);
  expect(second.width).toBeCloseTo(first.width, 0);
  expect(second.top - first.bottom).toBeGreaterThanOrEqual(8);
});


it('DModal exposes full-width actions while preserving scoped and named slots', async () => {
  const { default: DModal } = await import('../../resources/js/components/base/DModal.vue');
  const { BApp } = await import('bootstrap-vue-next');
  let actionsCanHide = false;
  render({ render: () => h(BApp, {}, () => h(DModal, { modelValue: true }, {
    default: () => h('p', {}, 'Report details'),
    title: () => h('span', {}, 'Custom report title'),
    actions: (props: { hide: unknown }) => {
      actionsCanHide = typeof props.hide === 'function';
      return [h(DButton, {}, () => 'View sales'), h(DButton, {}, () => 'Print report')];
    },
    footer: () => h(DButton, {}, () => 'Custom close'),
  })) });
  await expect.poll(() => document.querySelector('.modal.show .dx-modal-actions')).toBeTruthy();
  const modal = document.querySelector('.modal.show')!;
  expect(modal.textContent).toContain('Report details');
  expect(modal.textContent).toContain('Custom report title');
  expect(actionsCanHide).toBe(true);
  const group = modal.querySelector('.dx-modal-actions')!;
  expect(group.querySelectorAll('.btn')).toHaveLength(2);
  await expect.poll(() => Math.round(group.querySelector('.btn')!.getBoundingClientRect().width)).toBe(Math.round(group.getBoundingClientRect().width));
  const footer = modal.querySelector('.modal-footer')!;
  expect(footer.textContent).toContain('Custom close');
  expect(footer.querySelector('.btn')!.getBoundingClientRect().width).toBeLessThan(group.getBoundingClientRect().width);
});
