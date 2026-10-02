import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXSaveButton from '../../resources/js/components/extended/DXSaveButton.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Small anti-flash timings (forwarded to DButton) so the spinner test stays fast.
const FAST = { spinnerDelay: 20, minSpinnerTime: 20 };

const buttonOf = (root: Element): HTMLButtonElement => {
  const button = root.querySelector('button');
  if (button === null) throw new Error('DXSaveButton rendered no <button>');
  return button;
};

describe('DXSaveButton', () => {
  it('idle: shows its label, enabled, primary, with a polite live region', async () => {
    const screen = render(DXSaveButton, {
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = buttonOf(screen.container);
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.disabled).toBe(false);
    expect(button.classList.contains('btn-primary')).toBe(true);
    expect(button.getAttribute('aria-live')).toBe('polite');
    expect(button.querySelector('.bi-check-lg')).toBeNull();
  });

  it('defaults its label to "Save" when no slot is given', async () => {
    const screen = render(DXSaveButton);
    await flush();
    expect(buttonOf(screen.container).textContent?.trim()).toBe('Save');
  });

  it('saving: is disabled and busy, and shows the spinner after the delay', async () => {
    const screen = render(DXSaveButton, {
      props: { saving: true, savingText: 'Saving…', ...FAST },
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = buttonOf(screen.container);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    await wait(40);
    expect(button.querySelector('.spinner-border')).not.toBeNull();
    expect(button.textContent?.trim()).toBe('Saving…');
  });

  it('saved: shows a tick and "Saved", success styling, and is really disabled', async () => {
    const screen = render(DXSaveButton, {
      props: { saved: true },
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = buttonOf(screen.container);
    expect(button.textContent?.trim()).toBe('Saved');
    const tick = button.querySelector('i.bi.bi-check-lg');
    expect(tick).not.toBeNull();
    expect(tick?.getAttribute('aria-hidden')).toBe('true');
    expect(button.classList.contains('btn-success')).toBe(true);
    expect(button.classList.contains('btn-primary')).toBe(false);
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.classList.contains('dx-save-button--saved')).toBe(true);
    // The live region stays on the same element across the change, so the
    // new label is announced (a freshly inserted live region is not).
    expect(button.getAttribute('aria-live')).toBe('polite');
  });

  it('saved: renders at full strength, not faded like an unavailable button', async () => {
    // Bootstrap fades every :disabled button to 0.65 opacity. The saved state
    // is disabled but it is a confirmation, so it keeps full contrast.
    const screen = render(DXSaveButton, { props: { saved: true } });
    await flush();
    expect(getComputedStyle(buttonOf(screen.container)).opacity).toBe('1');
  });

  it('saved: clicking does nothing', async () => {
    let clicks = 0;
    const screen = render(DXSaveButton, {
      props: { saved: true, onClick: () => { clicks += 1; } },
    });
    await flush();
    buttonOf(screen.container).click();
    await flush();
    expect(clicks).toBe(0);
  });

  it('uses savedText for the saved label', async () => {
    const screen = render(DXSaveButton, {
      props: { saved: true, savedText: 'All changes saved' },
    });
    await flush();
    expect(buttonOf(screen.container).textContent?.trim()).toBe('All changes saved');
  });

  it('saving wins over saved (a re-save from the saved state shows busy, not Saved)', async () => {
    const screen = render(DXSaveButton, {
      props: { saved: true, saving: true },
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = buttonOf(screen.container);
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.classList.contains('btn-success')).toBe(false);
    expect(button.querySelector('.bi-check-lg')).toBeNull();
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('turning saved off restores the enabled Save button', async () => {
    const screen = render(DXSaveButton, {
      props: { saved: true },
      slots: { default: () => 'Save' },
    });
    await flush();
    await screen.rerender({ saved: false });
    await flush();
    const button = buttonOf(screen.container);
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.disabled).toBe(false);
    expect(button.classList.contains('btn-primary')).toBe(true);
    expect(button.classList.contains('btn-success')).toBe(false);
    expect(button.querySelector('.bi-check-lg')).toBeNull();
  });

  it('keeps a consumer icon and variant when not saved', async () => {
    const screen = render(DXSaveButton, {
      props: { icon: 'save', variant: 'secondary' },
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = buttonOf(screen.container);
    expect(button.querySelector('i.bi.bi-save')).not.toBeNull();
    expect(button.classList.contains('btn-secondary')).toBe(true);
  });

  it('respects an explicit disabled when not saved', async () => {
    const screen = render(DXSaveButton, {
      props: { disabled: true },
      slots: { default: () => 'Save' },
    });
    await flush();
    expect(buttonOf(screen.container).disabled).toBe(true);
  });

  it('passes type, block and clicks through to the button', async () => {
    let clicks = 0;
    const screen = render(DXSaveButton, {
      props: { type: 'submit', block: true, onClick: () => { clicks += 1; } },
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = buttonOf(screen.container);
    expect(button.getAttribute('type')).toBe('submit');
    expect(button.classList.contains('w-100')).toBe(true);
    button.click();
    await flush();
    expect(clicks).toBe(1);
  });
});
