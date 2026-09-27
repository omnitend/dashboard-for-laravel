import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DButton from '../../resources/js/components/base/DButton.vue';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const dimensions = (element: Element) => {
  const { width, height } = element.getBoundingClientRect();
  return { width, height };
};

describe('DButton icon-only sizing', () => {
  it.each([undefined, 'sm', 'lg'] as const)('is square at standard button height for size %s', async size => {
    const standard = render(DButton, { props: { size }, slots: { default: () => 'Action' } });
    const icon = render(DButton, { props: { size, icon: 'trash', iconOnly: true, 'aria-label': 'Delete' } });
    await flush();
    const button = icon.container.querySelector('button')!;
    const actual = dimensions(button);
    const expected = dimensions(standard.container.querySelector('button')!);
    expect(expected.height).toBeGreaterThan(30);
    expect(actual.height).toBeCloseTo(expected.height, 0);
    expect(actual.width).toBeCloseTo(actual.height, 0);
    expect(button.getAttribute('aria-label')).toBe('Delete');
    expect(button.querySelector('.bi-trash')).toBeTruthy();
  });

  it('keeps its dimensions and accessible name while showing a loading spinner', async () => {
    const props = { icon: 'trash', iconOnly: true, 'aria-label': 'Delete', spinnerDelay: 0, minSpinnerTime: 0 };
    const screen = render(DButton, { props });
    await flush();
    const button = screen.container.querySelector('button')!;
    const before = dimensions(button);
    await screen.rerender({ ...props, loading: true, loadingText: 'Deleting…' });
    await expect.poll(() => button.querySelector('.spinner-border')).toBeTruthy();
    expect(dimensions(button)).toEqual(before);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Delete');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.bi-trash')).toBeNull();
    expect(button.textContent).not.toContain('Deleting…');
    await screen.rerender({ ...props, loading: false });
    await expect.poll(() => button.querySelector('.bi-trash')).toBeTruthy();
    expect(dimensions(button)).toEqual(before);
    expect(button.disabled).toBe(false);
  });

  it('supports a custom icon slot and replaces it with the spinner while loading', async () => {
    const props = { iconOnly: true, 'aria-label': 'Custom action', spinnerDelay: 0 };
    const screen = render(DButton, { props, slots: { default: () => h('svg', { width: 20, height: 20, 'data-test': 'custom-icon', 'aria-hidden': 'true' }) } });
    await flush();
    const button = screen.container.querySelector('button')!;
    expect(button.querySelector('[data-test="custom-icon"]')).toBeTruthy();
    const before = dimensions(button);
    expect(before.width).toBeCloseTo(before.height, 0);
    await screen.rerender({ ...props, loading: true });
    await expect.poll(() => button.querySelector('.spinner-border')).toBeTruthy();
    expect(button.querySelector('[data-test="custom-icon"]')).toBeNull();
    expect(dimensions(button)).toEqual(before);
  });

  it('prioritises square sizing over block and does not change labelled buttons', async () => {
    const square = render(DButton, { props: { iconOnly: true, block: true, icon: 'trash', 'aria-label': 'Delete' } });
    const labelled = render(DButton, { props: { icon: 'trash' }, slots: { default: () => 'Delete this record' } });
    await flush();
    const actual = dimensions(square.container.querySelector('button')!);
    expect(actual.width).toBeCloseTo(actual.height, 0);
    const normal = dimensions(labelled.container.querySelector('button')!);
    expect(normal.width).toBeGreaterThan(normal.height);
    expect(labelled.container.textContent).toContain('Delete this record');
  });
});


it.each(['sm', 'lg'])('inherits %s sizing inside an input group without stretching it', async size => {
  const screen = render({ render: () => h('div', { class: `input-group input-group-${size}` }, [
    h('input', { class: 'form-control', 'aria-label': 'Search' }),
    h(DButton, { iconOnly: true, icon: 'search', 'aria-label': 'Run search' }),
  ]) });
  const reference = render({ render: () => h('div', { class: `input-group input-group-${size}` }, [
    h('input', { class: 'form-control', 'aria-label': 'Reference' }),
  ]) });
  await flush();
  const button = screen.container.querySelector('button')!;
  const expected = reference.container.querySelector('input')!.getBoundingClientRect().height;
  expect(expected).toBeGreaterThan(30);
  expect(dimensions(button).height).toBeCloseTo(expected, 0);
  expect(dimensions(button).width).toBeCloseTo(expected, 0);
  expect(getComputedStyle(button).paddingTop).toBe('0px');
  expect(screen.container.querySelector('.input-group')!.getBoundingClientRect().height).toBeCloseTo(expected, 0);
});


it('preserves the input-group parent padding', async () => {
  const style = document.createElement('style');
  style.textContent = '.input-group { padding: 7px; }';
  document.head.prepend(style);
  try {
    const screen = render({ render: () => h('div', { class: 'input-group' }, [
      h(DButton, { iconOnly: true, icon: 'search', 'aria-label': 'Search' }),
    ]) });
    await flush();
    const group = screen.container.querySelector('.input-group')!;
    expect(group.querySelector('button')).not.toBeNull();
    expect(getComputedStyle(group).paddingTop).toBe('7px');
  } finally {
    style.remove();
  }
});
