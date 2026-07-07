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
  DXField,
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
// ---------------------------------------------------------------------------
const KNOWN_DEEP_TARGETS: Record<string, string[]> = {
  'DAutocomplete.vue': ['.input-group', '.b-autocomplete-input-wrapper', '.b-autocomplete-trigger'],
  'DXField.vue': ['.form-check', '.form-check-label', '.form-check-input'],
  'DXTable.vue': ['tbody tr', '.pagination', '.pagination-sm .page-link', '.pagination .page-item.disabled .page-link'],
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
      .filter(([, source]) => /<style[^>]*\bscoped\b[^>]*>[\s\S]*:deep\(/.test(source))
      .map(([path]) => path.split('/').pop()!);

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

describe('scoped :deep() DOM-level audit (#58)', () => {
  it('DAutocomplete: .d-autocomplete :deep(.input-group)', async () => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DAutocomplete, { options: [{ value: 'a', text: 'A' }] })),
    });
    await flush();

    const group = screen.container.querySelector('.input-group')!;
    expect(ancestorHasScopeId(group, scopeIdForSelector('.input-group'))).toBe(true);
  });

  it('DXField switch: .dx-switch :deep(.form-check)', async () => {
    const form = useForm({ active: true });
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXField, { field: { key: 'active', type: 'switch', label: 'Active' }, form }),
        ),
    });
    await flush();

    const box = screen.container.querySelector('.form-check')!;
    expect(ancestorHasScopeId(box, scopeIdForSelector('.form-check'))).toBe(true);
  });

  it('DXTable: :deep(tbody tr) and :deep(.pagination)', async () => {
    const screen = render(DXTable, {
      props: {
        items: [{ id: 1, name: 'A' }],
        fields: [{ key: 'name', label: 'Name' }],
        pagination: { current_page: 1, per_page: 10, total: 25, from: 1, to: 10 },
      },
    });
    await flush();

    const pagination = screen.container.querySelector('.pagination');
    expect(pagination).not.toBeNull();
    expect(ancestorHasScopeId(pagination!, scopeIdForSelector('.pagination'))).toBe(true);

    const row = screen.container.querySelector('tbody tr');
    expect(row).not.toBeNull();
    expect(ancestorHasScopeId(row!, scopeIdForSelector('tbody tr'))).toBe(true);
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
