import { it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DFormCheckbox from '../../resources/js/components/base/DFormCheckbox.vue';

it.each([14, 16, 20])('centres the checkbox against the first label line at %ipx', async (fontSize) => {
  const screen = render({render: () => h('div', {style: {fontSize: `${fontSize}px`, width: '180px'}}, [
    h(DFormCheckbox, {}, () => 'Show on the Web Shop with a longer wrapped label'),
  ])});
  const input = screen.container.querySelector('input')!;
  const label = screen.container.querySelector('label')!;
  const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
  expect(label.getBoundingClientRect().height).toBeGreaterThan(lineHeight);
  const inputCentre = input.getBoundingClientRect().top + input.getBoundingClientRect().height / 2;
  const firstLineCentre = label.getBoundingClientRect().top + lineHeight / 2;
  expect(Math.abs(inputCentre - firstLineCentre)).toBeLessThan(1);
});
