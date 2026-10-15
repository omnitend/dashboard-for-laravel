/// <reference types="vite/client" />
/**
 * Drift guard between the slot interfaces in resources/js/types/navigation.ts
 * and the `<slot>` tags in DXDashboardNavbar's and DXDashboardSidebar's
 * templates, in the direction vue-tsc does not check.
 *
 * `defineSlots` makes vue-tsc reject a `<slot name>` the interface lacks, but
 * an interface member with no `<slot>` compiles: consumers would be offered
 * (and DXDashboard would forward, as `navbar-*`/`sidebar-*`) a slot that
 * never renders. So each list below is pinned twice: to the interface's keys
 * at the type level (compiled by `npm run typecheck`), and to the template's
 * `<slot>` names at run time (by vitest).
 */
import { describe, expect, it } from 'vitest';
import type { DashboardNavbarSlots, DashboardSidebarSlots } from '../../resources/js/types/navigation';
import navbarSource from '../../resources/js/components/extended/DXDashboardNavbar.vue?raw';
import sidebarSource from '../../resources/js/components/extended/DXDashboardSidebar.vue?raw';

/** Exact type equality (neither side may be wider). */
type Equal<Left, Right> =
  (<Probe>() => Probe extends Left ? 1 : 2) extends <Probe>() => Probe extends Right ? 1 : 2
    ? true
    : false;

const navbarSlotNames = [
  'menu-icon',
  'search',
  'actions',
  'user-menu',
  'user-icon',
  'user-menu-items',
] as const;

const sidebarSlotNames = ['brand', 'link', 'footer'] as const;

// The lists are exactly the interfaces' keys: adding a member to an interface
// without adding it here fails the typecheck, and vice versa.
export const navbarListMatchesInterface: Equal<
  (typeof navbarSlotNames)[number],
  keyof DashboardNavbarSlots
> = true;
export const sidebarListMatchesInterface: Equal<
  (typeof sidebarSlotNames)[number],
  keyof DashboardSidebarSlots
> = true;

/**
 * The names of the `<slot>` tags in an SFC's template (`default` for an
 * unnamed one). A dynamic `:name` is returned as-is so the comparison fails
 * rather than silently skipping it.
 */
const templateSlotNames = (source: string): string[] => {
  const template = source
    .slice(0, source.indexOf('<script'))
    .replace(/<!--[\s\S]*?-->/g, '');
  const names = [...template.matchAll(/<slot\b([^>]*)>/g)].map(([, attributes]) => {
    const dynamic = attributes.match(/(?:^|\s)(?::|v-bind:)name="([^"]+)"/);
    if (dynamic) return `:name=${dynamic[1]}`;
    const fixed = attributes.match(/(?:^|\s)name="([^"]+)"/);
    return fixed ? fixed[1] : 'default';
  });
  return [...new Set(names)].sort();
};

describe('dashboard slot interfaces match the templates', () => {
  it('reads the slots it should (positive control)', () => {
    // A parse that found nothing would make both comparisons below pass
    // vacuously for an interface emptied at the same time.
    expect(templateSlotNames(navbarSource).length).toBeGreaterThan(0);
    expect(templateSlotNames(sidebarSource).length).toBeGreaterThan(0);
    expect(templateSlotNames('<template><slot /><slot name="x" :a="1" /></template>')).toEqual([
      'default',
      'x',
    ]);
  });

  it('every DashboardNavbarSlots member has a <slot> in DXDashboardNavbar', () => {
    expect(templateSlotNames(navbarSource)).toEqual([...navbarSlotNames].sort());
  });

  it('every DashboardSidebarSlots member has a <slot> in DXDashboardSidebar', () => {
    expect(templateSlotNames(sidebarSource)).toEqual([...sidebarSlotNames].sort());
  });
});
