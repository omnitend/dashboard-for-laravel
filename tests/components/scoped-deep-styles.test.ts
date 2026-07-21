import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
// Import from the BUILT dist bundle (not resources/js source). This is the
// only way to reproduce the #53 failure mode, where a scoped :deep() rule
// forwards its scope-id fine through Vite's dev transform (a false positive —
// the docs Astro/Vite dev build "worked" while the fix was actually inert)
// but is lost in a real Rollup production build. See CLAUDE.md's "Overriding
// Bootstrap Vue Next component styling" section and issue #58.
import {
  DAutocomplete,
  DXSwitch,
  DXTable,
  DXStatCard,
  DXDashboardSidebar,
  DXRepeater,
} from '../../dist/dashboard-for-laravel.js';
import builtCss from '../../dist/style.css?raw';
import { useForm } from '../../resources/js/composables/useForm';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The scope-id Vue's compiler generates (`data-v-<hash>`) is derived from the
 * component's own path/content and changes whenever the component is edited —
 * hardcoding a specific hash here would make this test fail (or worse, pass
 * for the wrong reason) on every unrelated style tweak. Instead, read the
 * *current* hash straight out of the built CSS for the exact selector a
 * :deep() rule targets, then check that same attribute reaches an ancestor of
 * the rendered target element.
 */
function scopeIdForSelector(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = builtCss.match(new RegExp(`\\[data-v-([0-9a-f]+)\\]\\s*${escaped}[{,:]`));
  if (!match) {
    throw new Error(
      `No compiled [data-v-*] rule found for "${selector}" in dist/style.css — ` +
        `run "npm run build" first, or the selector/build has drifted.`,
    );
  }
  return `data-v-${match[1]}`;
}

function ancestorHasScopeId(el: Element, scopeAttr: string): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.hasAttribute(scopeAttr)) return true;
    node = node.parentElement;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Coverage guard: every `:deep()` selector currently shipped in a component's
// scoped styles must have a corresponding DOM-level assertion below. If this
// list and the source drift apart, a new `:deep()` site could silently ship
// broken (inert) styles the way #53 did — this fails loudly instead so it
// gets a real DOM-level check (see the audits below) before merging.
//
// Component -> the plain CSS class/selector each :deep() rule targets.
//
// Detecting a scoped `:deep()` site is the `hasScopedDeepRule` predicate below.
// ---------------------------------------------------------------------------

/**
 * Strip comments from a style block's body before looking for `:deep(`.
 *
 * `/* … *\/` is a comment in plain CSS and in every preprocessor, so it is
 * always stripped. `//` to end-of-line is a comment ONLY in SCSS/Sass/Less/
 * Stylus, and stripping it from plain CSS would risk eating a real rule that
 * happens to follow a protocol-relative `url(//cdn…)` on the same line — a
 * FALSE NEGATIVE, which for this guard is the dangerous direction. So it is
 * gated on the block declaring such a `lang`.
 */
function stripStyleComments(body: string, lang: string | null): string {
  const withoutBlockComments = body.replace(/\/\*[\s\S]*?\*\//g, '');
  if (lang === null || /^(scss|sass|less|stylus|styl)$/.test(lang) === false) {
    return withoutBlockComments;
  }
  // Only treat `//` as a comment when it starts a token, so `https://` and
  // `url(http://…)` are left alone.
  return withoutBlockComments.replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

/**
 * Does this SFC source contain a `:deep()` rule inside a **scoped** style block?
 *
 * Exported (and fixture-tested below) because the obvious one-liner is wrong.
 * The original was:
 *
 *   /<style[^>]*\bscoped\b[^>]*>[\s\S]*:deep\(/
 *
 * whose greedy, unanchored `[\s\S]*` runs from the FIRST `<style scoped>` tag
 * to ANY later `:deep(` in the file — so it fired on a `:deep(` mentioned in a
 * CSS comment, in a separate NON-scoped `<style>` block further down (the shape
 * `DXTableShell.vue` has: a scoped block, then a global one), or in template
 * text / a JS string. A guard that fires on comments trains people to reword the
 * comment, which is exactly the wrong incentive (#167).
 *
 * Instead: walk each `<style>` block, ask whether *that block's own* opening tag
 * carries `scoped`, and look for `:deep(` only in that block's comment-stripped
 * body.
 *
 * Deliberately fail-CLOSED: an unterminated `<style>` (no closing tag) is
 * scanned to end-of-file rather than skipped, so a malformed SFC can never
 * silently opt out of the guard.
 */
export function hasScopedDeepRule(source: string): boolean {
  const blocks = source.matchAll(/<style([^>]*)>([\s\S]*?)(?:<\/style>|$)/g);

  for (const [, attrs, body] of blocks) {
    // `scoped` must be a bare boolean attribute — a word boundary alone would
    // also match e.g. `data-note="scoped"`.
    const isScoped = /(?:^|\s)scoped(?=[\s=/]|$)/.test(attrs);
    if (isScoped === false) continue;

    const langMatch = attrs.match(/\blang\s*=\s*["']?([a-z]+)/i);
    const lang = langMatch === null || langMatch === undefined ? null : langMatch[1].toLowerCase();

    if (/:deep\(/.test(stripStyleComments(body, lang))) return true;
  }

  return false;
}

const KNOWN_DEEP_TARGETS: Record<string, string[]> = {
  'DAutocomplete.vue': ['.input-group', '.b-autocomplete-input-wrapper', '.b-autocomplete-trigger', '.b-autocomplete-clear.btn-close', '.input-group:focus-within', '.form-control', '.btn'],
  'DXSwitch.vue': ['.form-check', '.form-check-label', '.form-check-input'],
  'DXTable.vue': ['tbody tr.dx-row-actionable', 'thead th'],
  // The windowed pager (#155) styles its DButtons via `.dx-pager :deep(.btn)`,
  // anchored on the component's own plain `.dx-pager` root so the scope-id has a
  // host. The DXTable DOM audit below exercises it — DXTablePagination renders as
  // a child of DXTable, so `.dx-pager .btn`'s ancestor carries this scope-id.
  'DXTablePagination.vue': ['.btn', '.btn:first-child'],
  'DXStatCard.vue': ['.dx-stat-card__body'],
  'DXDashboardSidebar.vue': ['.nav-link', '.nav-icon', '.nav-label'],
  'DXRepeater.vue': ['.mb-3'],
};

describe('scoped :deep() coverage guard (#58)', () => {
  it('every component with a scoped :deep() rule is one of the known, DOM-verified sites', async () => {
    const glob = import.meta.glob('/resources/js/components/**/*.vue', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

    const filesWithDeep = Object.entries(glob)
      .filter(([, source]) => hasScopedDeepRule(source))
      .map(([path]) => path.split('/').pop()!);

    // Non-vacuity: an empty `filesWithDeep` would make the assertion below pass
    // while detecting nothing at all — the exact failure mode a careless fix to
    // the predicate introduces. Real :deep() sites exist (see KNOWN_DEEP_TARGETS),
    // so finding none means the detector is broken, not that the code is clean.
    expect(
      filesWithDeep.length,
      'The scoped :deep() detector found no sites at all — it has stopped ' +
        'detecting rather than the components having stopped using :deep().',
    ).toBeGreaterThan(0);

    const unknown = filesWithDeep.filter((name) => !(name in KNOWN_DEEP_TARGETS));

    expect(
      unknown,
      `New scoped :deep() usage found in: ${unknown.join(', ')}. ` +
        `A :deep() rule is silently inert if the component's scope-id doesn't ` +
        `reach a real DOM host in a production build (#53). Verify at the DOM ` +
        `level against the built dist bundle (see the pattern in this file), ` +
        `then add the component + its targeted selector(s) to KNOWN_DEEP_TARGETS.`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Fixture table for the detector itself (#167). The end-to-end guard above can
// only ever exercise shapes some component happens to have today, so the shapes
// that caused the false positives — and, more importantly, the shape that MUST
// still be caught — are pinned here directly against the predicate.
// ---------------------------------------------------------------------------
const DETECTOR_FIXTURES: Array<{ name: string; expected: boolean; source: string }> = [
  {
    name: 'a real :deep() rule in a scoped block',
    expected: true,
    source: `<template><div class="x"><Child /></div></template>
<style scoped>
.x :deep(.child) { color: red; }
</style>`,
  },
  {
    name: 'a real :deep() rule in a scoped block declaring lang="scss"',
    expected: true,
    source: `<style lang="scss" scoped>
.x { :deep(.child) { color: red; } }
</style>`,
  },
  {
    name: 'a real :deep() rule in a scoped block with other attributes (module)',
    expected: true,
    source: `<style module scoped>
.x :deep(.child) { color: red; }
</style>`,
  },
  {
    name: 'a real :deep() rule in a SECOND scoped block',
    expected: true,
    source: `<style scoped>
.a { color: red; }
</style>

<style scoped>
.b :deep(.child) { color: blue; }
</style>`,
  },
  {
    name: 'a real :deep() rule alongside a comment that also mentions the token',
    expected: true,
    source: `<style scoped>
/* Careful: :deep( is inert if the scope-id never reaches a host. */
.x :deep(.child) { color: red; }
</style>`,
  },
  {
    name: 'an unterminated scoped block containing a real :deep() rule (fail closed)',
    expected: true,
    source: `<style scoped>
.x :deep(.child) { color: red; }`,
  },
  {
    name: 'ONLY a mention inside a CSS block comment in a scoped block',
    expected: false,
    source: `<style scoped>
/* A scoped :deep(.child) here would be inert, so this is global instead. */
.x { color: red; }
</style>`,
  },
  {
    name: 'ONLY a mention inside a MULTI-LINE CSS block comment in a scoped block',
    expected: false,
    source: `<style scoped>
/*
  Why this is not written as
  .x :deep(.child)
  — the scope-id would not reach the host.
*/
.x { color: red; }
</style>`,
  },
  {
    name: 'ONLY a mention inside a // comment in a scoped lang="scss" block',
    expected: false,
    source: `<style lang="scss" scoped>
// .x :deep(.child) would be inert here
.x { color: red; }
</style>`,
  },
  {
    name: 'a real :deep() rule in a NON-scoped block that FOLLOWS a scoped one',
    expected: false,
    source: `<style scoped>
.x { color: red; }
</style>

<style>
.dx-table-card :deep(.child) { color: blue; }
</style>`,
  },
  {
    name: 'a real :deep() rule in a NON-scoped block that PRECEDES a scoped one',
    expected: false,
    source: `<style>
.dx-table-card :deep(.child) { color: blue; }
</style>

<style scoped>
.x { color: red; }
</style>`,
  },
  {
    name: 'a :deep( in template text, with a scoped block present',
    expected: false,
    source: `<template><code>.x :deep(.child)</code></template>
<style scoped>
.x { color: red; }
</style>`,
  },
  {
    name: 'a :deep( in a JS string, with a scoped block present',
    expected: false,
    source: `<script setup lang="ts">
const hint = 'use :deep(.child) only when the scope-id reaches a host';
</script>
<style scoped>
.x { color: red; }
</style>`,
  },
  {
    name: 'a non-scoped block whose attribute VALUE contains the word scoped',
    expected: false,
    source: `<style data-note="not-scoped-on-purpose">
.x :deep(.child) { color: red; }
</style>`,
  },
  {
    name: 'no style block at all, :deep( only in a script comment (DButton.vue shape)',
    expected: false,
    source: `<script setup lang="ts">
// Bootstrap utilities are global, avoiding the scoped \`:deep()\`-on-a-B-root trap.
</script>`,
  },
];

describe('scoped :deep() detector fixtures (#167)', () => {
  it.each(DETECTOR_FIXTURES)('$expected for: $name', ({ source, expected }) => {
    expect(hasScopedDeepRule(source)).toBe(expected);
  });
});

describe('scoped :deep() DOM-level audit (#58)', () => {
  it('DAutocomplete: .d-autocomplete :deep(.input-group)', async () => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DAutocomplete, { options: [{ value: 'a', text: 'A' }] })),
    });
    await flush();

    const group = screen.container.querySelector('.input-group')!;
    expect(ancestorHasScopeId(group, scopeIdForSelector('.input-group'))).toBe(true);
  });

  it('DXSwitch: .dx-switch :deep(.form-check)', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DXSwitch, { modelValue: true, label: 'Active' })),
    });
    await flush();

    const box = screen.container.querySelector('.form-check')!;
    expect(ancestorHasScopeId(box, scopeIdForSelector('.form-check'))).toBe(true);
  });

  it('DXTable: :deep(tbody tr) and the windowed pager :deep(.dx-pager .btn)', async () => {
    const screen = render(DXTable, {
      props: {
        items: [{ id: 1, name: 'A' }],
        fields: [{ key: 'name', label: 'Name' }],
        pagination: { current_page: 1, per_page: 10, total: 25, from: 1, to: 10 },
        // Interactive, so the row actually carries the marker class the rule targets.
        onRowClicked: () => {},
      },
    });
    await flush();

    // The pager's DButton — the `.dx-pager :deep(.btn)` rule's target. Look the
    // scope-id up via `.btn:first-child` (compiled as `.dx-pager[data-v] .btn:
    // first-child`), which is unique to this component's pager rule — a bare
    // `.btn` is generic and would match another component's scope-id first.
    const pagerButton = screen.container.querySelector('.dx-pager .btn');
    expect(pagerButton).not.toBeNull();
    expect(ancestorHasScopeId(pagerButton!, scopeIdForSelector('.btn:first-child'))).toBe(true);

    // The clickable affordance hangs off a marker class now (#115), so the row
    // must both carry the class and sit under the scope-id for the rule to bite.
    const row = screen.container.querySelector('tbody tr');
    expect(row).not.toBeNull();
    expect(row!.classList.contains('dx-row-actionable')).toBe(true);
    expect(
      ancestorHasScopeId(row!, scopeIdForSelector('tbody tr.dx-row-actionable')),
    ).toBe(true);

    // Muted header titles (#157): the scope-id must reach the th AND the
    // colour must actually differ from the body text — presence of the rule in
    // the CSS alone would pass with the rule inert, which is the #53 trap.
    const th = screen.container.querySelector('thead th');
    expect(th).not.toBeNull();
    expect(ancestorHasScopeId(th!, scopeIdForSelector('thead th'))).toBe(true);
    const thColor = getComputedStyle(th!).color;
    expect(thColor).not.toBe(getComputedStyle(document.body).color);
  });

  it('DXStatCard: .dx-stat-card :deep(.dx-stat-card__body)', async () => {
    const screen = render(DXStatCard, {
      props: { title: 'Revenue', value: '£1,000' },
    });
    await flush();

    const body = screen.container.querySelector('.dx-stat-card__body');
    expect(body).not.toBeNull();
    expect(ancestorHasScopeId(body!, scopeIdForSelector('.dx-stat-card__body'))).toBe(true);
  });

  it('DXRepeater table layout: .dx-repeater-table td :deep(.mb-3)', async () => {
    const form = useForm({ lines: [{ name: 'First' }] });
    const screen = render(DXRepeater, {
      props: {
        form,
        keyPath: 'lines',
        field: {
          key: 'lines',
          type: 'repeater',
          repeaterLayout: 'table',
          fields: [{ key: 'name', type: 'text', label: 'Name' }],
        },
      },
    });
    await flush();

    const control = screen.container.querySelector('.mb-3');
    expect(control).not.toBeNull();
    expect(ancestorHasScopeId(control!, scopeIdForSelector('.mb-3'))).toBe(true);
    // Bootstrap's `.mb-3` utility is `!important` — a plain (non-!important)
    // override silently loses, leaving the field vertically off-centre
    // against the row's trailing remove button. Assert the CASCADE actually
    // won, not just that the rule is present in the stylesheet.
    expect(getComputedStyle(control!).marginBottom).toBe('0px');
  });

  it('DXDashboardSidebar: :deep(.nav-link)', async () => {
    const screen = render(DXDashboardSidebar, {
      props: {
        navigation: [{ items: [{ label: 'Home', url: '/' }] }],
        currentUrl: '/',
      },
    });
    await flush();

    const link = screen.container.querySelector('.nav-link');
    expect(link).not.toBeNull();
    expect(ancestorHasScopeId(link!, scopeIdForSelector('.nav-link'))).toBe(true);
  });
});
