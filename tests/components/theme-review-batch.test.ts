import { describe, it, expect, beforeAll } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';

/**
 * Review-batch theme guards — B14 (dropdown chevron), B17 (thead alignment),
 * S5b (lighter table-header token), PO18 (sized input/button padding parity),
 * PL1 (filter-input search glyph), S3b.1 (autocomplete menu max-height).
 * Plan: plans/2026-07-23-review-batch-defaults-and-tables.md.
 *
 * Like theme-chrome-polish.test.ts, these compile the theme **from source**
 * (`theme.scss?inline`) and append it AFTER the stylesheets tests/setup.ts loads
 * (bootstrap.css + the shared, possibly-stale dist/style.css), so for
 * equal-specificity rules the source override wins — which is exactly the
 * property under test. Each assertion targets the property that was BROKEN, not
 * a proxy; every one has been watched failing against the unfixed theme.
 */
import themeCss from '../../resources/css/theme.scss?inline';

beforeAll(() => {
  const styleEl = document.createElement('style');
  styleEl.id = 'dx-review-batch-theme-compiled-from-source';
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
// B14 — the dropdown caret is the bootstrap-icons chevron, not a border-triangle
// ---------------------------------------------------------------------------

describe('B14: dropdown-toggle caret is a chevron glyph', () => {
  it('renders `::after` as a bootstrap-icons chevron with no border triangle', async () => {
    const screen = render({ render: () => h('button', { class: 'dropdown-toggle' }, 'Menu') });
    const toggle = screen.container.querySelector('.dropdown-toggle') as HTMLElement;

    await settled(() =>
      getComputedStyle(toggle, '::after').fontFamily.toLowerCase().includes('bootstrap-icons'),
    );
    const after = getComputedStyle(toggle, '::after');

    // Would this pass with the bug present? No — Bootstrap's default caret is a
    // CSS border-triangle (empty `content`, body font-family, a real
    // `border-top`). The fix swaps to the icon font + a glyph and drops the
    // border.
    expect(after.fontFamily.toLowerCase()).toContain('bootstrap-icons');
    expect(after.content).not.toBe('""'); // Bootstrap's default is an empty string
    expect(after.content).not.toBe('none');
    expect(after.borderTopWidth).toBe('0px'); // triangle is gone (`border: none`)
  });
});

// ---------------------------------------------------------------------------
// B17 — header labels stay centred whether or not a column carries sort icons
// ---------------------------------------------------------------------------

describe('B17: thead labels share a centreline across sortable/non-sortable columns', () => {
  // Faithful to DXTable's header markup: each `<th>` holds a `.d-flex` with the
  // label; a SORTABLE column also holds a taller two-arrow sort stack, which
  // makes its cell — and thus the whole header row — ~2 lines tall. The plain
  // column's single-line label then depends on the thead vertical-align: floored
  // (bottom) it drops below the sortable label; centred (middle) they align.
  const renderHeader = () =>
    render({
      render: () =>
        h('table', { class: 'table' }, [
          h('thead', [
            h('tr', [
              h('th', [
                h('div', { class: 'd-flex align-items-center' }, [
                  h('span', { class: 'lbl-sortable' }, 'Amount'),
                  h(
                    'span',
                    {
                      style:
                        'display:inline-flex;flex-direction:column;line-height:1.1;font-size:0.75rem;margin-left:0.5rem',
                    },
                    [h('span', '▲'), h('span', '▼')],
                  ),
                ]),
              ]),
              h('th', [
                h('div', { class: 'd-flex align-items-center' }, [
                  h('span', { class: 'lbl-plain' }, 'Linked transaction'),
                ]),
              ]),
            ]),
          ]),
        ]),
    });

  const labelCentre = (el: Element) => {
    const rect = el.getBoundingClientRect();
    return rect.top + rect.height / 2;
  };

  it('sets .table > thead to vertical-align: middle', async () => {
    const screen = renderHeader();
    await settled(() => !!screen.container.querySelector('thead'));
    const thead = screen.container.querySelector('thead') as HTMLElement;
    expect(getComputedStyle(thead).verticalAlign).toBe('middle');
  });

  it('keeps the plain and sortable header labels on the same centreline', async () => {
    const screen = renderHeader();
    await settled(
      () =>
        !!screen.container.querySelector('.lbl-plain') &&
        !!screen.container.querySelector('.lbl-sortable'),
    );

    const sortableCentre = labelCentre(screen.container.querySelector('.lbl-sortable')!);
    const plainCentre = labelCentre(screen.container.querySelector('.lbl-plain')!);

    // Would this pass with the bug present? No — under Bootstrap's default
    // `.table > thead { vertical-align: bottom }` the single-line "Linked
    // transaction" is floored while the two-line sort stack holds "Amount"
    // higher, so the two centres diverge by several px (verified ~3.5px RED).
    expect(Math.abs(sortableCentre - plainCentre)).toBeLessThanOrEqual(1.5);
  });
});

// ---------------------------------------------------------------------------
// S5b — the default table-header colour is lighter (#7c8293)
// ---------------------------------------------------------------------------

describe('S5b: --dx-table-header-color defaults to the lighter #7c8293', () => {
  it('resolves the token to rgb(124, 130, 147) and keeps it AA for large text', async () => {
    const screen = render({
      render: () => h('span', { style: 'color: var(--dx-table-header-color)' }, 'Header'),
    });
    const span = screen.container.querySelector('span') as HTMLElement;
    await settled(() => getComputedStyle(span).color !== 'rgb(0, 0, 0)');
    const colour = getComputedStyle(span).color;

    // Would this pass with the bug present? No — #157's value was
    // `var(--bs-secondary-color)` = rgba(33, 37, 41, 0.75), a darker near-black.
    expect(colour).toBe('rgb(124, 130, 147)'); // #7c8293
    expect(colour).not.toBe('rgba(33, 37, 41, 0.75)');

    // #7c8293 on white is ~3.6:1 — above the 3:1 large/bold-text bar (which is
    // what the semibold header text is), below the 4.5:1 body-text bar. Deliberate.
    const ratio = contrastOnWhite(colour);
    expect(ratio).toBeGreaterThan(3);
    expect(ratio).toBeLessThan(4.5);
  });
});

// ---------------------------------------------------------------------------
// PO18 — sized inputs and sized buttons resolve to the same height
// ---------------------------------------------------------------------------

describe('PO18: sized input padding matches sized button padding', () => {
  const heightsFor = async (sizeClass: string) => {
    const screen = render({
      render: () =>
        h('div', [
          h('input', { class: `form-control ${sizeClass}` }),
          h('button', { class: `btn btn-secondary ${sizeClass.replace('form-control', 'btn')}` }, 'Go'),
        ]),
    });
    const input = screen.container.querySelector('input') as HTMLElement;
    const button = screen.container.querySelector('button') as HTMLElement;
    await settled(() => input.offsetHeight > 0 && button.offsetHeight > 0);
    return { input: input.offsetHeight, button: button.offsetHeight };
  };

  it('gives .form-control-sm the same height as .btn-sm', async () => {
    const { input, button } = await heightsFor('form-control-sm');
    // Would this pass with the bug present? No — Bootstrap's default
    // $input-padding-y-sm (0.25rem) makes the input ~8px shorter than the
    // themed $btn-padding-y-sm (0.5rem) button.
    expect(Math.abs(input - button)).toBeLessThanOrEqual(1);
  });

  it('gives .form-control-lg the same height as .btn-lg', async () => {
    const { input, button } = await heightsFor('form-control-lg');
    // Same class of bug at the lg size (default 0.5rem input vs themed 0.75rem
    // button, ~4px short) — fixed alongside sm.
    expect(Math.abs(input - button)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// PL1 — DXTable text/number filter inputs get a magnifier glyph
// ---------------------------------------------------------------------------

describe('PL1: filter-row text/number inputs carry a search glyph', () => {
  // Mirror DXTable's filter row: `tr.filter-row > th > input.form-control`. The
  // select filter's input is nested (not a direct th child) so it must NOT match.
  const renderFilterRow = () =>
    render({
      render: () =>
        h('table', { class: 'table' }, [
          h('thead', [
            h('tr', { class: 'filter-row' }, [
              h('th', [h('input', { class: 'form-control', type: 'text' })]),
              h('th', [h('input', { class: 'form-control', type: 'number' })]),
              h('th', [h('input', { class: 'form-control', type: 'date' })]),
              // select-filter shape: input nested inside the autocomplete wrapper
              h('th', [
                h('div', { class: 'd-autocomplete' }, [
                  h('div', { class: 'input-group' }, [
                    h('div', { class: 'b-autocomplete-input-wrapper' }, [
                      h('input', { class: 'form-control', type: 'text' }),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
    });

  it('paints a background-image + left padding on text and number filters only', async () => {
    const screen = renderFilterRow();
    await settled(() => screen.container.querySelectorAll('.filter-row input').length >= 4);

    const [text, number, date] = [
      ...screen.container.querySelectorAll('.filter-row > th > input.form-control'),
    ] as HTMLElement[];
    const nested = screen.container.querySelector(
      '.b-autocomplete-input-wrapper input',
    ) as HTMLElement;

    // Would this pass with the bug present? No — without the theme rule these
    // inputs have `background-image: none` and Bootstrap's default padding-left.
    expect(getComputedStyle(text).backgroundImage).not.toBe('none');
    expect(getComputedStyle(text).backgroundImage).toContain('svg');
    expect(parseFloat(getComputedStyle(text).paddingLeft)).toBeGreaterThan(24); // ~1.9rem

    expect(getComputedStyle(number).backgroundImage).not.toBe('none');
    expect(parseFloat(getComputedStyle(number).paddingLeft)).toBeGreaterThan(24);

    // Scope guards: the date filter and the nested (select-filter) input get NO glyph.
    expect(getComputedStyle(date).backgroundImage).toBe('none');
    expect(getComputedStyle(nested).backgroundImage).toBe('none');
  });

  it('leaves an ordinary form input untouched', async () => {
    const screen = render({ render: () => h('input', { class: 'form-control', type: 'text' }) });
    const plain = screen.container.querySelector('input') as HTMLElement;
    await settled(() => plain.offsetHeight > 0);
    expect(getComputedStyle(plain).backgroundImage).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// S3b.1 — the autocomplete popup drops most of the way down the viewport
// ---------------------------------------------------------------------------

describe('S3b.1: .b-autocomplete-content gets a viewport-relative max-height', () => {
  it('declares max-height: min(70vh, 42rem) in the compiled theme', () => {
    expect(themeCss).toMatch(
      /\.b-autocomplete-content\s*\{[^}]*max-height:\s*min\(\s*70vh\s*,\s*42rem\s*\)/,
    );
  });

  it('overrides bvn’s 300px cap on a real element', async () => {
    const screen = render({ render: () => h('div', { class: 'b-autocomplete-content' }, 'x') });
    const el = screen.container.querySelector('.b-autocomplete-content') as HTMLElement;
    await settled(() => getComputedStyle(el).maxHeight !== 'none');
    const maxHeight = getComputedStyle(el).maxHeight;

    // Would this pass with the bug present? No — bvn ships
    // `.b-autocomplete-content { max-height: 300px }` in dist/style.css, which
    // is what wins without this override.
    expect(maxHeight).not.toBe('300px');
    expect(maxHeight).not.toBe('none');
    expect(maxHeight.endsWith('px')).toBe(true); // resolved from min(70vh, 42rem)
  });
});
