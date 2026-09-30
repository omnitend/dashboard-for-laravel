import { it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

it('opens column help on focus without changing the sort or losing hints', async () => {
  const screen = render({render: () => h(BApp, {}, () => h(DXTable, {
    items:[{name:'Alpha'},{name:'Beta'}],clientSide:true,
    fields:[{key:'name',label:'Name',sortable:true,hint:'Customer name',info:'Names explain who placed the order.'}] as any,
  }))});
  await expect.poll(() => screen.container.querySelectorAll('tbody tr').length).toBe(2);
  const button = screen.container.querySelector('button[aria-label="More information: Name"]') as HTMLButtonElement;
  expect(button).toBeTruthy();
  const header = button.closest('th')!;
  expect(getComputedStyle(header.querySelector('.dx-field-label__text')!).color).toBe(getComputedStyle(header).color);
  const sort = header.getAttribute('aria-sort');
  expect(header.textContent).toContain('Customer name');
  button.focus();
  await expect.poll(() => [...document.querySelectorAll('.popover')].some(el => el.textContent?.includes('Names explain who placed the order.'))).toBe(true);
  button.click();
  expect(header.getAttribute('aria-sort')).toBe(sort);
  expect(screen.container.querySelector('tbody tr')?.textContent).toContain('Alpha');
});
