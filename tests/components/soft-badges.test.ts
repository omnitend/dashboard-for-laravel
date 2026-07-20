import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DBadge from '../../resources/js/components/base/DBadge.vue';
import DButton from '../../resources/js/components/base/DButton.vue';

/**
 * The semantic colour system (soft-first). See
 * plans/2026-07-18-semantic-colour-system.md.
 *
 * Asserts the ACTUAL painted colours (getComputedStyle) of the real components,
 * not the CSS source — a theme edit that drops an override silently reverts a
 * variant to Bootstrap's default, which a source string-match wouldn't catch.
 * The theme comes in through the built dist/style.css imported in tests/setup.ts,
 * so this also guards that the map-driven overrides actually compile and win the
 * cascade over Bootstrap's own rules.
 */
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const paintedStyle = async (component: any, variant: string, selector: string) => {
  const screen = render({
    render: () => h(BApp, {}, () => h(component, { variant }, () => variant)),
  });
  await new Promise((resolve) => setTimeout(resolve, 30));
  const el = screen.container.querySelector(selector) as HTMLElement;
  const style = getComputedStyle(el);
  return { background: style.backgroundColor, color: style.color };
};

// [variant, soft bg, soft text]
const softBadges: Array<[string, string, string]> = [
  ['primary', '#e9f0f8', '#151e2d'],
  ['secondary', '#e6ebf2', '#29374a'],
  ['success', '#cdf9b2', '#203b0e'],
  ['danger', '#f8d4d4', '#7a1a1a'],
  ['warning', '#fce5c4', '#512d05'],
  ['info', '#deebff', '#12376c'],
];

describe('semantic badges are all soft-tinted', () => {
  for (const [variant, bg, text] of softBadges) {
    it(`paints the ${variant} badge as a soft ${bg} tint with ${text} text`, async () => {
      const style = await paintedStyle(DBadge, variant, '.badge');
      expect(style.background).toBe(rgb(bg));
      expect(style.color).toBe(rgb(text));
    });
  }
});

/**
 * Soft-first is the default for `.text-bg-*` across the board, not just `.badge`
 * (#158 follow-on). A stock indicator built as `.input-group-text.text-bg-success`
 * must match the "current" `.badge.text-bg-success` green instead of Bootstrap's
 * solid dark fill — so the soft tint applies to any element carrying the class.
 * `.toast` is deliberately excluded (its own fainter mix drives `--bs-toast-bg`).
 */
const paintedRawStyle = async (className: string) => {
  const screen = render({
    render: () => h(BApp, {}, () => h('span', { class: className }, 'x')),
  });
  await new Promise((resolve) => setTimeout(resolve, 30));
  const el = screen.container.querySelector('span') as HTMLElement;
  const style = getComputedStyle(el);
  return { background: style.backgroundColor, color: style.color };
};

describe('.text-bg-* is soft on any element, not only .badge', () => {
  it('paints a non-badge .text-bg-success (e.g. input-group-text) as the soft badge green', async () => {
    const style = await paintedRawStyle('input-group-text text-bg-success');
    expect(style.background).toBe(rgb('#cdf9b2'));
    expect(style.color).toBe(rgb('#203b0e'));
  });

  it('excludes .toast so its own fainter mix is not clobbered', async () => {
    const style = await paintedRawStyle('toast text-bg-success');
    // The broad soft rule must NOT paint a toast the full soft badge green.
    expect(style.background).not.toBe(rgb('#cdf9b2'));
  });
});

describe('buttons: bold solid ONLY for primary, soft for the rest (incl. danger)', () => {
  it('primary button is the brand navy fill with light-brand text (solid)', async () => {
    const style = await paintedStyle(DButton, 'primary', '.btn');
    expect(style.background).toBe(rgb('#151e2d'));
    expect(style.color).toBe(rgb('#e9f0f8'));
  });

  it('danger button is SOFT now (light-red tint + dark-red text), not a solid red fill', async () => {
    const style = await paintedStyle(DButton, 'danger', '.btn');
    expect(style.background).toBe(rgb('#f8d4d4'));
    expect(style.color).toBe(rgb('#7a1a1a'));
  });

  it('secondary button is the soft grey tint (not the dark slate solid)', async () => {
    const style = await paintedStyle(DButton, 'secondary', '.btn');
    expect(style.background).toBe(rgb('#e6ebf2'));
    expect(style.color).toBe(rgb('#29374a'));
  });

  it('success button is soft, not a saturated lime fill', async () => {
    const style = await paintedStyle(DButton, 'success', '.btn');
    expect(style.background).toBe(rgb('#cdf9b2'));
    expect(style.color).toBe(rgb('#203b0e'));
  });
});

describe('progress-bar fills use the vivid solid-bg, not the dark emphasis (#154)', () => {
  const paintedBar = async (variantClass: string) => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h('div', { class: 'progress' }, [
            h('div', { class: `progress-bar ${variantClass}`, style: 'width: 50%' }),
          ]),
        ),
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    const bar = screen.container.querySelector('.progress-bar') as HTMLElement;
    return getComputedStyle(bar).backgroundColor;
  };

  it('bg-success fills as the vivid lime (the switch-ON green), not the dark olive', async () => {
    // Would this pass if the bug were present? No — Bootstrap's .bg-success
    // paints the $success emphasis #4d7c0f, which this rejects.
    expect(await paintedBar('bg-success')).toBe(rgb('#84cc16'));
  });

  it('bg-warning fills as the bright amber solid, not the dark amber emphasis', async () => {
    expect(await paintedBar('bg-warning')).toBe(rgb('#f59e0b'));
  });

  it('the default (variant-less) bar stays the brand navy', async () => {
    expect(await paintedBar('')).toBe(rgb('#151e2d'));
  });
});
