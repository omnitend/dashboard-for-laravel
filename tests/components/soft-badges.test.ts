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

const TRANSPARENT = new Set(['rgba(0, 0, 0, 0)', 'transparent', '']);

// The theme (dist/style.css) defines `--dx-chart-1` on :root; Bootstrap does
// not. Non-empty ⇒ the theme stylesheet has been applied, so getComputedStyle
// reflects the themed cascade rather than Bootstrap's default.
const themeApplied = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue('--dx-chart-1')
    .trim() !== '';

// Poll until the theme has applied AND the element is painted, instead of a
// fixed sleep. A fixed 30ms flaked under full-suite CPU load; and a plain
// "wait until non-transparent" isn't enough because Bootstrap's OWN default
// button/badge fills are opaque — the poll would exit on the stale unthemed
// colour before dist/style.css landed. Gating on `themeApplied()` waits for the
// theme specifically. Bounded (~2.4s) so a legitimately transparent element
// still resolves and the assertion runs.
const readWhenPainted = async (container: Element, selector: string) => {
  let el: HTMLElement | null = null;
  for (let i = 0; i < 150; i++) {
    el = container.querySelector(selector) as HTMLElement | null;
    if (el && themeApplied() && !TRANSPARENT.has(getComputedStyle(el).backgroundColor)) break;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  const style = getComputedStyle(el as HTMLElement);
  return { background: style.backgroundColor, color: style.color };
};

const paintedStyle = (component: any, variant: string, selector: string) => {
  const screen = render({
    render: () => h(BApp, {}, () => h(component, { variant }, () => variant)),
  });
  return readWhenPainted(screen.container, selector);
};

// [variant, soft bg, soft text]
const softBadges: Array<[string, string, string]> = [
  ['primary', '#e9f0f8', '#151e2d'],
  ['secondary', '#e6ebf2', '#29374a'],
  ['success', '#c3faaa', '#153c04'],
  ['danger', '#f9dff2', '#61124c'],
  ['warning', '#efd574', '#121419'],
  ['info', '#d5dcf0', '#192547'],
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
const paintedRawStyle = (className: string) => {
  const screen = render({
    render: () => h(BApp, {}, () => h('span', { class: className }, 'x')),
  });
  return readWhenPainted(screen.container, 'span');
};

describe('.text-bg-* is soft on any element, not only .badge', () => {
  it('paints a non-badge .text-bg-success (e.g. input-group-text) as the soft badge green', async () => {
    const style = await paintedRawStyle('input-group-text text-bg-success');
    expect(style.background).toBe(rgb('#c3faaa'));
    expect(style.color).toBe(rgb('#153c04'));
  });

  it('excludes .toast so its own fainter mix is not clobbered', async () => {
    const style = await paintedRawStyle('toast text-bg-success');
    // The broad soft rule must NOT paint a toast the full soft badge green.
    expect(style.background).not.toBe(rgb('#c3faaa'));
  });
});

describe('buttons: bold solid ONLY for primary, soft for the rest (incl. danger)', () => {
  it('primary button is the brand navy fill with light-brand text (solid)', async () => {
    const style = await paintedStyle(DButton, 'primary', '.btn');
    expect(style.background).toBe(rgb('#151e2d'));
    expect(style.color).toBe(rgb('#e9f0f8'));
  });

  it('danger button is SOFT (light-magenta tint + dark-magenta text), not a solid fill', async () => {
    const style = await paintedStyle(DButton, 'danger', '.btn');
    expect(style.background).toBe(rgb('#f9dff2'));
    expect(style.color).toBe(rgb('#61124c'));
  });

  it('secondary button is the soft grey tint (not the dark slate solid)', async () => {
    const style = await paintedStyle(DButton, 'secondary', '.btn');
    expect(style.background).toBe(rgb('#e6ebf2'));
    expect(style.color).toBe(rgb('#29374a'));
  });

  it('success button is soft, not a saturated lime fill', async () => {
    const style = await paintedStyle(DButton, 'success', '.btn');
    expect(style.background).toBe(rgb('#c3faaa'));
    expect(style.color).toBe(rgb('#153c04'));
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
    const { background } = await readWhenPainted(screen.container, '.progress-bar');
    return background;
  };

  it('bg-success fills as the vivid lime (the switch-ON green), not the deep green', async () => {
    // Would this pass if the bug were present? No — Bootstrap's .bg-success
    // paints the $success emphasis #236b12, which this rejects.
    expect(await paintedBar('bg-success')).toBe(rgb('#7bf25a'));
  });

  it('bg-warning fills as the butter-yellow solid, not the deep ochre emphasis', async () => {
    expect(await paintedBar('bg-warning')).toBe(rgb('#efd574'));
  });

  it('bg-danger and bg-info fill with their vivid solids too', async () => {
    expect(await paintedBar('bg-danger')).toBe(rgb('#e46ab9'));
    expect(await paintedBar('bg-info')).toBe(rgb('#7fd7fd'));
  });

  it('the default (variant-less) bar stays the brand navy', async () => {
    expect(await paintedBar('')).toBe(rgb('#151e2d'));
  });
});

/**
 * Bootstrap's subtle family is derived from the soft tints (set before the
 * Bootstrap import): bg-subtle is the soft tint mixed 50% with white, the
 * border is the tint 10% darker, and text-emphasis is the soft text. Without
 * the overrides Bootstrap derives them from the dark emphasis base, a
 * different, greyer family, so every expectation below would fail.
 *
 * Sass emits the 50% mix with fractional channels (`rgb(225, 252.5, 212.5)`),
 * so the comparison parses the channels and allows half a unit of rounding.
 */
const channels = (colour: string) => (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

const expectColourNear = (actual: string, expected: [number, number, number]) => {
  const parsed = channels(actual);
  expect(parsed.length, `could not parse "${actual}"`).toBe(3);
  parsed.forEach((value, index) => {
    expect(Math.abs(value - expected[index]), `${actual} vs rgb(${expected})`).toBeLessThanOrEqual(
      0.5,
    );
  });
};

const paintedMarkup = (markup: () => any, selector: string) => {
  const screen = render({ render: () => h(BApp, {}, markup) });
  return readWhenPainted(screen.container, selector).then((style) => ({
    ...style,
    element: screen.container.querySelector(selector) as HTMLElement,
  }));
};

// [variant, soft-bg mixed 50% with white, soft-text]
const subtleTints: Array<[string, [number, number, number], string]> = [
  ['success', [225, 252.5, 212.5], '#153c04'],
  ['danger', [252, 239, 248.5], '#61124c'],
  ['warning', [247, 234, 185.5], '#121419'],
  ['info', [234, 237.5, 247.5], '#192547'],
];

describe('Bootstrap subtle family follows the soft tints', () => {
  for (const [variant, tint, text] of subtleTints) {
    it(`.bg-${variant}-subtle is the soft tint mixed with white`, async () => {
      const style = await paintedMarkup(
        () => h('span', { class: `bg-${variant}-subtle` }, 'x'),
        'span',
      );
      expectColourNear(style.background, tint);
    });

    it(`.text-${variant}-emphasis is the soft text ${text}`, async () => {
      const style = await paintedMarkup(
        () => h('span', { class: `bg-white text-${variant}-emphasis` }, 'x'),
        'span',
      );
      expect(style.color).toBe(rgb(text));
    });

    it(`.table-${variant} rows use the same tint`, async () => {
      const style = await paintedMarkup(
        () =>
          h('table', { class: 'table' }, [
            h('tbody', [h('tr', { class: `table-${variant}` }, [h('td', 'x')])]),
          ]),
        'td',
      );
      expectColourNear(style.background, tint);
    });
  }

  it('.border-success-subtle is the soft tint 10% darker', async () => {
    const style = await paintedMarkup(
      () => h('div', { class: 'border border-success-subtle bg-white' }, 'x'),
      'div.border',
    );
    expectColourNear(getComputedStyle(style.element).borderTopColor, [167, 247.67, 130.33]);
  });
});

/**
 * Form errors are crimson #c8102e, deliberately NOT the danger magenta (which
 * stays on badges and buttons). Bootstrap's default is $danger, so before this
 * change an invalid field painted the old red #dc2626 and these fail.
 */
describe('form validation errors are crimson, not the danger magenta', () => {
  const CRIMSON = rgb('#c8102e');

  it('paints an invalid input border and its feedback text crimson', async () => {
    const style = await paintedMarkup(
      () =>
        h('div', { class: 'bg-white' }, [
          h('input', { class: 'form-control is-invalid', value: 'x' }),
          h('div', { class: 'invalid-feedback d-block' }, 'Required'),
        ]),
      '.form-control',
    );
    const feedback = style.element.parentElement!.querySelector('.invalid-feedback') as HTMLElement;

    expect(getComputedStyle(style.element).borderTopColor).toBe(CRIMSON);
    expect(getComputedStyle(feedback).color).toBe(CRIMSON);
  });

  it('leaves the danger badge magenta', async () => {
    const style = await paintedStyle(DBadge, 'danger', '.badge');
    expect(style.background).toBe(rgb('#f9dff2'));
    expect(style.background).not.toBe(CRIMSON);
  });
});
