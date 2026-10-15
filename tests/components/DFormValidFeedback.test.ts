import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref } from 'vue';
import DFormValidFeedback from '../../resources/js/components/base/DFormValidFeedback.vue';
import DFormInput from '../../resources/js/components/base/DFormInput.vue';
import { DFormValidFeedback as ExportedValidFeedback } from '../../resources/js/index';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('DFormValidFeedback', () => {
  it('is exported from the main entry', () => {
    expect(ExportedValidFeedback).toBe(DFormValidFeedback);
  });

  it('renders .valid-feedback with its default slot and forwards attributes', async () => {
    const screen = render(DFormValidFeedback, {
      attrs: { id: 'name-ok', 'data-testid': 'ok', class: 'extra' },
      slots: { default: () => h('strong', { class: 'slot-content' }, 'Looks good') },
    });
    await flush();
    const feedback = screen.container.querySelector('#name-ok') as HTMLElement;
    expect(feedback.classList).toContain('valid-feedback');
    expect(feedback.classList).toContain('extra');
    expect(feedback.getAttribute('data-testid')).toBe('ok');
    expect(feedback.querySelector('.slot-content')?.textContent).toBe('Looks good');
  });

  it('shows with state=true and stays hidden otherwise', async () => {
    const state = ref<boolean | null>(null);
    const screen = render({
      render: () =>
        h('div', [h(DFormValidFeedback, { class: 'own-state', state: state.value }, () => 'Fine')]),
    });
    await flush();
    const feedback = screen.container.querySelector('.own-state') as HTMLElement;
    expect(getComputedStyle(feedback).display).toBe('none');
    state.value = true;
    await flush();
    expect(getComputedStyle(feedback).display).toBe('block');
    state.value = false;
    await flush();
    expect(getComputedStyle(feedback).display).toBe('none');
  });

  it('shows beside a valid sibling input', async () => {
    const state = ref<boolean | null>(null);
    const screen = render({
      render: () =>
        h('div', [
          h(DFormInput, { state: state.value }),
          h(DFormValidFeedback, { class: 'sibling' }, () => 'Fine'),
        ]),
    });
    await flush();
    const feedback = screen.container.querySelector('.sibling') as HTMLElement;
    expect(getComputedStyle(feedback).display).toBe('none');
    state.value = true;
    await flush();
    expect(getComputedStyle(feedback).display).toBe('block');
  });
});
