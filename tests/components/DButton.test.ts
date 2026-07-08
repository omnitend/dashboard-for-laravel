import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DButton from '../../resources/js/components/base/DButton.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Small anti-flash timings so the timing-dependent tests stay fast but still
// exercise the real setTimeout state machine (no fake timers — unreliable in
// browser mode).
const FAST = { spinnerDelay: 20, minSpinnerTime: 20 };

describe('DButton', () => {
  it('renders default slot content', async () => {
    const screen = render(DButton, {
      slots: { default: () => 'Click me' },
    });
    await flush();
    const button = screen.container.querySelector('button');
    expect(button?.textContent?.trim()).toBe('Click me');
  });

  it('renders a leading Bootstrap Icons glyph for `icon`', async () => {
    const screen = render(DButton, {
      props: { icon: 'save' },
      slots: { default: () => 'Save' },
    });
    await flush();
    const icon = screen.container.querySelector('i.bi.bi-save');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies full-width `w-100` when `block` is set', async () => {
    const screen = render(DButton, {
      props: { block: true },
      slots: { default: () => 'Continue' },
    });
    await flush();
    const button = screen.container.querySelector('button');
    expect(button?.classList.contains('w-100')).toBe(true);
  });

  it('disables the button immediately while loading (before the spinner)', async () => {
    const screen = render(DButton, {
      props: { loading: true, ...FAST },
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = screen.container.querySelector('button');
    // Disabled right away — no waiting for the spinner delay — so a fast
    // double-click can't re-submit during the anti-flash window.
    expect(button?.hasAttribute('disabled')).toBe(true);
    // Spinner not shown yet (still inside spinnerDelay).
    expect(screen.container.querySelector('.spinner-border')).toBeFalsy();
  });

  it('never shows the spinner for a sub-delay (fast) action', async () => {
    const screen = render(DButton, {
      props: { loading: true, ...FAST },
      slots: { default: () => 'Save' },
    });
    await flush();
    // Resolve before the spinner delay elapses.
    screen.rerender({ loading: false, ...FAST });
    await wait(40);
    expect(screen.container.querySelector('.spinner-border')).toBeFalsy();
    const button = screen.container.querySelector('button');
    expect(button?.hasAttribute('disabled')).toBe(false);
  });

  it('shows a trailing spinner and swaps to `loadingText` once the delay passes', async () => {
    const screen = render(DButton, {
      props: { loading: true, loadingText: 'Saving…', ...FAST },
      slots: { default: () => 'Save' },
    });
    await wait(40);
    expect(screen.container.querySelector('.spinner-border')).toBeTruthy();
    const button = screen.container.querySelector('button');
    expect(button?.textContent).toContain('Saving…');
    expect(button?.textContent).not.toContain('Save');
    expect(button?.getAttribute('aria-busy')).toBe('true');
  });

  it('stays disabled while the spinner is still visible during the min-hold', async () => {
    // spinnerDelay short so the spinner shows; minSpinnerTime long so there's a
    // clear window where loading has cleared but the spinner is still up.
    const screen = render(DButton, {
      props: { loading: true, spinnerDelay: 20, minSpinnerTime: 300 },
      slots: { default: () => 'Save' },
    });
    await wait(40); // spinner now visible
    expect(screen.container.querySelector('.spinner-border')).toBeTruthy();
    // Loading clears, but we're inside the 300ms min-hold: spinner stays.
    screen.rerender({ loading: false, spinnerDelay: 20, minSpinnerTime: 300 });
    await wait(40);
    const button = screen.container.querySelector('button');
    // Spinner still shown → button must remain disabled + aria-busy, so a
    // click can't slip through a control that still looks in-flight.
    expect(screen.container.querySelector('.spinner-border')).toBeTruthy();
    expect(button?.hasAttribute('disabled')).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    // After the min-hold elapses, it releases.
    await wait(300);
    expect(screen.container.querySelector('.spinner-border')).toBeFalsy();
    expect(button?.hasAttribute('disabled')).toBe(false);
  });

  it('honours `disabled` on its own', async () => {
    const screen = render(DButton, {
      props: { disabled: true },
      slots: { default: () => 'Nope' },
    });
    await flush();
    const button = screen.container.querySelector('button');
    expect(button?.hasAttribute('disabled')).toBe(true);
  });

  it('forwards a custom variant through to the underlying button', async () => {
    const screen = render(DButton, {
      props: { variant: 'danger' },
      slots: { default: () => h('span', 'Delete') },
    });
    await flush();
    const button = screen.container.querySelector('button');
    expect(button?.classList.contains('btn-danger')).toBe(true);
  });
});
