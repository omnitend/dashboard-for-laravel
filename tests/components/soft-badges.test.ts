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
  ['danger', '#f5dff1', '#59194a'],
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

describe('buttons: bold solid only for primary/danger, soft for the rest', () => {
  it('primary button is the brand navy fill with light-brand text (solid)', async () => {
    const style = await paintedStyle(DButton, 'primary', '.btn');
    expect(style.background).toBe(rgb('#151e2d'));
    expect(style.color).toBe(rgb('#e9f0f8'));
  });

  it('danger button is the red fill with white text (solid)', async () => {
    const style = await paintedStyle(DButton, 'danger', '.btn');
    expect(style.background).toBe(rgb('#dc2626'));
    expect(style.color).toBe(rgb('#ffffff'));
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
