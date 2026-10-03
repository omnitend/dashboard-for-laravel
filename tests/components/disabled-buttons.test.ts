import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DButton from '../../resources/js/components/base/DButton.vue';
import DXSaveButton from '../../resources/js/components/extended/DXSaveButton.vue';

/**
 * Disabled buttons are neutral grey whatever their variant. Bootstrap's own
 * treatment is opacity only, so a disabled butter-yellow warning or lime
 * success button kept its colour and still looked pressable. Before the change
 * every expectation below failed: the warning button painted #efd574 at 0.65
 * opacity and the primary one the navy fill.
 */
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const DISABLED_BG = rgb('#e9ecef');
const DISABLED_TEXT = rgb('#6c757d');
const DISABLED_OUTLINE_BORDER = rgb('#ced4da');

const themeApplied = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--dx-chart-1').trim() !== '';

const paintedButton = async (variant: string, props: Record<string, unknown> = { disabled: true }) => {
  const screen = render({
    render: () => h(BApp, {}, () => h(DButton, { variant, ...props }, () => variant)),
  });
  let button: HTMLElement | null = null;
  for (let i = 0; i < 150; i++) {
    button = screen.container.querySelector('.btn') as HTMLElement | null;
    if (button && themeApplied()) break;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return getComputedStyle(button!);
};

describe('disabled buttons are neutral, not the variant colour', () => {
  for (const variant of ['warning', 'primary', 'success', 'pending']) {
    it(`a disabled ${variant} button is the neutral grey at full opacity`, async () => {
      const style = await paintedButton(variant);
      expect(style.backgroundColor).toBe(DISABLED_BG);
      expect(style.color).toBe(DISABLED_TEXT);
      expect(style.borderTopColor).toBe(DISABLED_BG);
      expect(style.opacity).toBe('1');
    });
  }

  it('a disabled outline button keeps no fill, with a grey border and label', async () => {
    const style = await paintedButton('outline-warning');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style.borderTopColor).toBe(DISABLED_OUTLINE_BORDER);
    expect(style.color).toBe(DISABLED_TEXT);
  });

  it('a disabled link button is grey text with no fill', async () => {
    const style = await paintedButton('link');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style.color).toBe(DISABLED_TEXT);
  });

  it('an ENABLED warning button keeps its soft yellow (the rule is scoped to disabled)', async () => {
    const style = await paintedButton('warning', {});
    expect(style.backgroundColor).toBe(rgb('#efd574'));
  });

  it('a button inside a disabled fieldset gets the same treatment', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h('fieldset', { disabled: true }, [h(DButton, { variant: 'success' }, () => 'Save')]),
        ),
    });
    let button: HTMLElement | null = null;
    for (let i = 0; i < 150; i++) {
      button = screen.container.querySelector('.btn') as HTMLElement | null;
      if (button && themeApplied()) break;
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    expect(getComputedStyle(button!).backgroundColor).toBe(DISABLED_BG);
  });
});

/**
 * The one exception: DXSaveButton's saved state ("✓ Saved") is a disabled
 * button, but it is a confirmation, not an unavailable action, so it keeps
 * the success soft pair (#c3faaa / #153c04, 10.46:1) instead of turning grey.
 * Before the exception the saved button painted the neutral #e9ecef/#6c757d.
 */
describe('the saved DXSaveButton keeps its success look while disabled', () => {
  const paintedSaveButton = async (props: Record<string, unknown>) => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DXSaveButton, props, () => 'Save')),
    });
    let button: HTMLButtonElement | null = null;
    for (let i = 0; i < 150; i++) {
      button = screen.container.querySelector('button.btn');
      if (button && themeApplied()) break;
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    return button!;
  };

  it('a saved button is disabled and paints the success soft background and text', async () => {
    const button = await paintedSaveButton({ saved: true });
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Saved');
    const style = getComputedStyle(button);
    expect(style.backgroundColor).toBe(rgb('#c3faaa'));
    expect(style.color).toBe(rgb('#153c04'));
    expect(style.borderTopColor).toBe(rgb('#c3faaa'));
    expect(style.opacity).toBe('1');
  });

  it('a DXSaveButton disabled for another reason (not saved) is still neutral', async () => {
    const style = getComputedStyle(await paintedSaveButton({ disabled: true }));
    expect(style.backgroundColor).toBe(DISABLED_BG);
    expect(style.color).toBe(DISABLED_TEXT);
  });

  it('an ordinary disabled primary button beside it is still neutral', async () => {
    const style = await paintedButton('primary');
    expect(style.backgroundColor).toBe(DISABLED_BG);
    expect(style.color).toBe(DISABLED_TEXT);
  });
});
