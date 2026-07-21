import { describe, it, expect, beforeAll } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp, BToast } from 'bootstrap-vue-next';
import DTabs from '../../resources/js/components/base/DTabs.vue';
import DBadge from '../../resources/js/components/base/DBadge.vue';
// `DTab` is a raw re-export of `BTab` (see DTabs.test.ts / #119), so it only
// exists on the package index, not as its own .vue file.
import { DTab } from '../../resources/js/index';

/**
 * Theme chrome polish — nav-tabs, header-less toast, soft `.text-bg-*`
 * overridability. Plan: plans/2026-07-21-tabs-toast-badge-polish.md.
 *
 * These read the theme **from source** (`theme.scss?inline`, compiled by Vite's
 * Sass pipeline at test time) rather than from `dist/style.css`, so the guard
 * tracks the file you edit instead of whatever build happens to be on disk. The
 * compiled sheet is appended AFTER the stylesheets `tests/setup.ts` loads, so
 * for equal-specificity rules the source wins — which is what we want to assert
 * on. Where source-vs-dist order isn't enough to decide (the specificity test
 * below), the assertion is made against uniquely-named probe classes that no
 * shipped stylesheet targets.
 */
import themeCss from '../../resources/css/theme.scss?inline';

beforeAll(() => {
  const styleEl = document.createElement('style');
  styleEl.id = 'dx-theme-compiled-from-source';
  styleEl.textContent = themeCss;
  document.head.appendChild(styleEl);
});

/** Composite a computed `rgb()`/`rgba()` colour over white and return its relative luminance. */
const luminanceOnWhite = (computed: string): number => {
  const parts = computed.match(/[\d.]+/g);
  if (!parts) throw new Error(`unparseable colour: ${computed}`);
  const [r, g, b] = parts.slice(0, 3).map(Number);
  const alpha = parts.length > 3 ? Number(parts[3]) : 1;
  const channel = (value: number) => {
    const composited = (value * alpha + 255 * (1 - alpha)) / 255;
    return composited <= 0.03928 ? composited / 12.92 : ((composited + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrastOnWhite = (computed: string) => 1.05 / (luminanceOnWhite(computed) + 0.05);

/** Poll until the source-compiled theme has actually painted the element. */
const settled = async (read: () => boolean) => {
  for (let i = 0; i < 150; i++) {
    if (read()) return;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
};

// ---------------------------------------------------------------------------
// 1. nav-tabs: inactive tabs are muted chrome, not saturated links
// ---------------------------------------------------------------------------

describe('nav-tabs inactive links are muted, not the saturated link-blue', () => {
  const renderTabs = () =>
    render({
      render: () =>
        h(BApp, {}, () =>
          h(DTabs, {}, () => [
            h(DTab, { title: 'Overview' }, () => 'overview'),
            h(DTab, { title: 'Selling' }, () => 'selling'),
          ]),
        ),
    });

  it('paints an INACTIVE tab in the muted secondary colour, not $link-color', async () => {
    const screen = renderTabs();
    await settled(() => screen.container.querySelectorAll('.nav-tabs .nav-link').length >= 2);

    const inactive = [...screen.container.querySelectorAll('.nav-tabs .nav-link')].find(
      (link) => !link.classList.contains('active'),
    ) as HTMLElement;
    const colour = getComputedStyle(inactive).color;

    // Would this pass with the bug present? No — Bootstrap's default is
    // `--bs-nav-link-color: var(--bs-link-color)`, i.e. the theme's #2563eb.
    expect(colour).not.toBe('rgb(37, 99, 235)');
    // `--bs-secondary-color` is rgba(var(--bs-body-color-rgb), .75).
    expect(colour).toBe('rgba(33, 37, 41, 0.75)');
    // …and it is still legible: WCAG AA for normal text needs 4.5:1.
    expect(contrastOnWhite(colour)).toBeGreaterThan(4.5);
  });

  it('keeps the ACTIVE tab dark, so selection still reads without the blue', async () => {
    const screen = renderTabs();
    await settled(() => !!screen.container.querySelector('.nav-tabs .nav-link.active'));

    const active = screen.container.querySelector('.nav-tabs .nav-link.active') as HTMLElement;
    const inactive = [...screen.container.querySelectorAll('.nav-tabs .nav-link')].find(
      (link) => !link.classList.contains('active'),
    ) as HTMLElement;

    const activeColour = getComputedStyle(active).color;
    // The active tab must be visibly DARKER than the muted inactive one — that
    // contrast is the whole selection signal once the blue is gone.
    expect(luminanceOnWhite(activeColour)).toBeLessThan(
      luminanceOnWhite(getComputedStyle(inactive).color),
    );
    expect(contrastOnWhite(activeColour)).toBeGreaterThan(7);
  });
});

// ---------------------------------------------------------------------------
// 2. header-less toast: body + close X share a centreline, padding is symmetric
// ---------------------------------------------------------------------------

describe('a header-less toast centres its body against the close button', () => {
  const renderBodyOnlyToast = async (container: HTMLElement) => {
    await settled(() => !!container.querySelector('.toast .toast-body'));
    const toast = container.querySelector('.toast') as HTMLElement;
    return {
      toast,
      row: toast.querySelector('.d-flex') as HTMLElement,
      body: toast.querySelector('.toast-body') as HTMLElement,
      close: toast.querySelector('.btn-close, .btn-close-custom') as HTMLElement,
    };
  };

  const mountBodyOnly = () =>
    render({
      render: () =>
        h(BApp, {}, () =>
          h(BToast, { body: 'Saved changes to the product.', visible: true, noProgress: true }),
        ),
    });

  it('renders the body-only shape this fix targets (.toast > .d-flex > body + close)', async () => {
    const screen = mountBodyOnly();
    const { toast, row, body, close } = await renderBodyOnlyToast(screen.container);

    // Guards the premise: if bvn ever stops emitting this shape the geometric
    // assertions below would be measuring something else entirely.
    expect(toast.querySelector('.toast-header')).toBeNull();
    expect(row).not.toBeNull();
    expect(close.parentElement).toBe(row);
    expect(body.parentElement).toBe(row);
  });

  it('puts the message text and the close X on the same centreline', async () => {
    const screen = mountBodyOnly();
    const { body, close } = await renderBodyOnlyToast(screen.container);

    // Measure the TEXT, not the body box: with the bug the body box stretches to
    // the row height (so its centre already matches) while the text inside it is
    // pushed to the top by the reduced padding. Asserting on the box would pass
    // either way — a test that cannot go red.
    const textRange = document.createRange();
    textRange.selectNodeContents(body);
    const textRect = textRange.getBoundingClientRect();
    const closeRect = close.getBoundingClientRect();

    const textCentre = textRect.top + textRect.height / 2;
    const closeCentre = closeRect.top + closeRect.height / 2;

    expect(Math.abs(textCentre - closeCentre)).toBeLessThanOrEqual(1);
  });

  it('restores symmetric body padding (no header above it to hug)', async () => {
    const screen = mountBodyOnly();
    const { body } = await renderBodyOnlyToast(screen.container);
    const style = getComputedStyle(body);

    expect(style.paddingTop).toBe(style.paddingBottom);
    // Would this pass with the bug present? No — the theme's `.toast .toast-body`
    // sets `padding-top: 0.25rem` = 4px against a 12px bottom.
    expect(style.paddingTop).not.toBe('4px');
  });

  it('keeps the reduced top padding when a header IS present', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(BToast, {
            title: 'Saved',
            body: 'Saved changes to the product.',
            visible: true,
            noProgress: true,
          }),
        ),
    });
    await settled(() => !!screen.container.querySelector('.toast .toast-header'));

    const body = screen.container.querySelector('.toast .toast-body') as HTMLElement;
    // The header case is the one the 0.25rem was written for — the body tucks up
    // under the title. The fix must not leak into it.
    expect(getComputedStyle(body).paddingTop).toBe('4px');
  });
});

// ---------------------------------------------------------------------------
// 3a. soft `.text-bg-*` stays a single-class selector consumers can override
// ---------------------------------------------------------------------------

const VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];

describe('the soft colour overrides do not inflate their specificity', () => {
  it('writes every .text-bg-* exclusion inside :where() (zero specificity)', () => {
    for (const variant of VARIANTS) {
      expect(themeCss).toContain(`.text-bg-${variant}:where(:not(.toast))`);
      // A bare `:not()` would add a class-weight, taking the selector to 0,2,0.
      expect(themeCss).not.toContain(`.text-bg-${variant}:not(`);
    }
  });

  it('scopes the progress-bar fill through :where() too', () => {
    for (const variant of VARIANTS) {
      expect(themeCss).toContain(`:where(.progress-bar).bg-${variant}`);
      expect(themeCss).not.toContain(`.progress-bar.bg-${variant}`);
    }
  });

  /**
   * The assertion that actually matters: hand the browser's own cascade the
   * REAL selector shape as compiled from theme.scss and check that a
   * single-class consumer rule with `!important` beats it.
   *
   * The variant class in that selector is swapped for a random probe token, so
   * the (shared, possibly stale) `dist/style.css` loaded by tests/setup.ts can't
   * decide the outcome — this measures the selector's specificity and nothing
   * else. Both rules carry `!important` (as the theme's do), so specificity is
   * the only tiebreak before source order, and the consumer rule is written
   * last, exactly where a consumer's stylesheet sits.
   *
   * `libraryAlone` is the POSITIVE CONTROL. Without it the whole thing passes
   * vacuously whenever the probe element doesn't satisfy the rest of the
   * compound selector (`:where(.progress-bar)` needs a `.progress-bar` on the
   * element!) — the library rule simply never matches and the consumer "wins"
   * against nothing. That exact false green happened while writing this.
   */
  const LIBRARY_COLOUR = 'rgb(230, 235, 242)';
  const CONSUMER_COLOUR = 'rgb(4, 8, 15)';

  const compiledSelectorFor = (pattern: RegExp) => {
    const match = themeCss.match(pattern);
    if (!match) throw new Error(`no rule matching ${pattern} in the compiled theme`);
    return match[1];
  };

  const paintOf = async (className: string, extraClasses: string[]) => {
    const screen = render({
      render: () => h('span', { class: [className, ...extraClasses].join(' ') }, 'x'),
    });
    const span = screen.container.querySelector('span') as HTMLElement;
    await settled(() => getComputedStyle(span).backgroundColor !== 'rgba(0, 0, 0, 0)');
    return getComputedStyle(span).backgroundColor;
  };

  /**
   * @param compiledSelector the selector exactly as theme.scss compiled it
   * @param variantClass     the class inside it to replace with the probe token
   * @param extraClasses     other classes the compiled selector requires on the element
   */
  const cascadeProbe = async (
    compiledSelector: string,
    variantClass: string,
    extraClasses: string[],
  ) => {
    const probe = `dx-spec-probe-${Math.random().toString(36).slice(2)}`;
    const sheet = document.createElement('style');
    sheet.textContent = [
      `${compiledSelector.replace(`.${variantClass}`, `.${probe}`)} { background-color: ${LIBRARY_COLOUR} !important; }`,
      `.${probe}-consumer { background-color: ${CONSUMER_COLOUR} !important; }`,
    ].join('\n');
    document.head.appendChild(sheet);

    const libraryAlone = await paintOf(probe, extraClasses);
    const withConsumer = await paintOf(`${probe} ${probe}-consumer`, extraClasses);
    sheet.remove();
    return { libraryAlone, withConsumer };
  };

  it("lets a consumer's single-class !important rule beat the soft .text-bg-* fill", async () => {
    // Anchored on the soft fill so it can't match Bootstrap's own (earlier,
    // exclusion-less) `.text-bg-secondary` rule.
    const selector = compiledSelectorFor(
      /(\.text-bg-secondary[^\s,{]*)\s*\{\s*background-color:\s*#e6ebf2/,
    );
    // Sanity: we really did lift the exclusion out of the specificity count.
    expect(selector).toBe('.text-bg-secondary:where(:not(.toast))');

    const { libraryAlone, withConsumer } = await cascadeProbe(selector, 'text-bg-secondary', []);
    expect(libraryAlone).toBe(LIBRARY_COLOUR); // positive control: the rule really applies
    // Would this pass with the bug present? No — a bare `:not(.toast)` makes the
    // library rule 0,2,0 and it keeps the fill (verified by hardcoding it).
    expect(withConsumer).toBe(CONSUMER_COLOUR);
  });

  it("lets a consumer's single-class !important rule beat the .progress-bar fill", async () => {
    const selector = compiledSelectorFor(
      /([^\s,{]*\.bg-success)\s*\{\s*background-color:\s*#84cc16/,
    );
    expect(selector).toBe(':where(.progress-bar).bg-success');

    const { libraryAlone, withConsumer } = await cascadeProbe(selector, 'bg-success', [
      'progress-bar',
    ]);
    expect(libraryAlone).toBe(LIBRARY_COLOUR);
    expect(withConsumer).toBe(CONSUMER_COLOUR);
  });
});

/**
 * The other half of lowering the specificity: at 0,1,0 the soft overrides now
 * TIE with Bootstrap's own `.text-bg-*` / `.bg-*` helpers (also 0,1,0 and also
 * `!important`), so the win rests entirely on source order — theme.scss imports
 * Bootstrap above this block. Over-apply `:where()` (wrap the whole selector
 * rather than just the exclusion) and the rules silently lose, reverting every
 * badge and progress bar to Bootstrap's dark fills.
 *
 * Measured with every OTHER stylesheet disabled, so the shared `dist/style.css`
 * — which may still carry the old, higher-specificity selectors — cannot decide
 * the outcome and give a false green.
 */
describe('the soft overrides still beat Bootstrap at equal specificity', () => {
  const paintedWithSourceThemeOnly = async (markup: () => any, selector: string) => {
    const ours = document.getElementById('dx-theme-compiled-from-source');
    const disabled = [...document.styleSheets].filter((sheet) => sheet.ownerNode !== ours);
    disabled.forEach((sheet) => {
      sheet.disabled = true;
    });
    try {
      const screen = render({ render: markup });
      const el = () => screen.container.querySelector(selector) as HTMLElement | null;
      await settled(() => {
        const node = el();
        return !!node && getComputedStyle(node).backgroundColor !== 'rgba(0, 0, 0, 0)';
      });
      return getComputedStyle(el() as HTMLElement).backgroundColor;
    } finally {
      disabled.forEach((sheet) => {
        sheet.disabled = false;
      });
    }
  };

  it('keeps .badge.text-bg-secondary on the soft tint, not Bootstrap’s solid $secondary', async () => {
    const painted = await paintedWithSourceThemeOnly(
      () => h('span', { class: 'badge text-bg-secondary' }, 'x'),
      '.badge',
    );
    expect(painted).toBe('rgb(230, 235, 242)'); // $dx-variants secondary soft-bg #e6ebf2
    expect(painted).not.toBe('rgb(71, 85, 105)'); // $secondary #475569 — what losing looks like
  });

  it('keeps .progress-bar.bg-success on the vivid lime, not the dark emphasis olive', async () => {
    const painted = await paintedWithSourceThemeOnly(
      () => h('div', { class: 'progress' }, [h('div', { class: 'progress-bar bg-success' })]),
      '.progress-bar',
    );
    expect(painted).toBe('rgb(132, 204, 22)'); // solid-bg #84cc16
    expect(painted).not.toBe('rgb(77, 124, 15)'); // $success #4d7c0f — what losing looks like
  });
});

// ---------------------------------------------------------------------------
// 3b. DBadge already supports a variant-less badge via `:variant="null"`
// ---------------------------------------------------------------------------

/**
 * Not a new feature — a guard on behaviour dfl already has and now documents
 * (docs/src/pages/components/base/DBadge.mdx). bvn's `useColorVariantClasses`
 * emits `text-bg-${variant}` only when `variant !== null`, and `BBadge`'s prop
 * default is `secondary`. So `null` opts out and `undefined` does NOT (Vue
 * substitutes the prop default for `undefined`) — that asymmetry is the part a
 * consumer gets wrong, so it is pinned here.
 */
describe('DBadge: :variant="null" opts out of the soft text-bg-* fill', () => {
  const badgeClasses = async (props: Record<string, unknown>) => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DBadge, props, () => 'label')),
    });
    await settled(() => !!screen.container.querySelector('.badge'));
    return [...(screen.container.querySelector('.badge') as HTMLElement).classList];
  };

  it('emits NO text-bg-* class when variant is explicitly null', async () => {
    const classes = await badgeClasses({ variant: null });
    expect(classes).toContain('badge');
    expect(classes.filter((name) => name.startsWith('text-bg-'))).toEqual([]);
  });

  it('still defaults to text-bg-secondary when no variant is given', async () => {
    expect(await badgeClasses({})).toContain('text-bg-secondary');
  });

  it('treats undefined as "no value" and falls back to the default (documented trap)', async () => {
    expect(await badgeClasses({ variant: undefined })).toContain('text-bg-secondary');
  });
});
