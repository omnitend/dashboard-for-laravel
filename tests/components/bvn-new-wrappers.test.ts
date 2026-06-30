import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DFormOtp from '../../resources/js/components/base/DFormOtp.vue';
import DAutocomplete from '../../resources/js/components/base/DAutocomplete.vue';
import DAspect from '../../resources/js/components/base/DAspect.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('DFormOtp', () => {
  it('renders one digit box per `length`', async () => {
    const screen = render(DFormOtp, { props: { length: 4 } });
    await flush();
    // BFormOtp renders the visible digit boxes (.b-form-otp-field) plus a
    // separate aria-hidden input holding the combined value.
    const boxes = screen.container.querySelectorAll('input.b-form-otp-field');
    expect(boxes.length).toBe(4);
  });
});

describe('DAutocomplete', () => {
  it('renders an input for the typeahead', async () => {
    const screen = render(DAutocomplete, {
      props: { options: ['Apple', 'Banana', 'Cherry'] },
    });
    await flush();
    expect(screen.container.querySelector('input')).toBeTruthy();
  });
});

describe('DAspect', () => {
  it('renders its default slot content inside an aspect box', async () => {
    const screen = render(DAspect, {
      props: { aspect: '16:9' },
      slots: { default: () => h('div', { class: 'aspect-child' }, 'media') },
    });
    await flush();
    const child = screen.container.querySelector('.aspect-child');
    expect(child).toBeTruthy();
    expect(child?.textContent).toBe('media');
  });
});
