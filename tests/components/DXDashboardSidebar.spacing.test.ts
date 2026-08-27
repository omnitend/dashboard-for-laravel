import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';
import { sampleNavigation } from '../fixtures/navigationData';

// Measures rendered rects rather than asserting class names: a class can be
// present and inert (scoped style, overridden utility) and still pass a
// string check. These numbers are the sidebar's vertical rhythm, and 0.40.0
// shipped with a 4px group gap that made each label look attached to the
// group above it.
describe('DXDashboardSidebar vertical rhythm', () => {
  const mount = () =>
    render(DXDashboardSidebar, {
      props: { navigation: sampleNavigation, currentUrl: '/dashboard', title: 'My App' },
    });

  it('leaves 1rem between a group and the next group label', async () => {
    const screen = mount();
    await expect.element(screen.getByText('Settings')).toBeVisible();

    const groups = Array.from(screen.container.querySelectorAll('.nav-group'));
    expect(groups.length).toBeGreaterThan(1);
    const lastItemOfFirst = Array.from(groups[0].querySelectorAll('.nav-link')).at(-1)!;
    const secondLabel = groups[1].querySelector('.nav-group-label')!;
    const gap = secondLabel.getBoundingClientRect().top - lastItemOfFirst.getBoundingClientRect().bottom;

    expect(gap).toBeCloseTo(16, 0);
  });

  it('keeps the first item 0.5rem under the header', async () => {
    const screen = mount();
    await expect.element(screen.getByText('Dashboard')).toBeVisible();

    const header = screen.container.querySelector('.sidebar-header')!;
    const nav = screen.container.querySelector('.sidebar-nav')!;
    const firstLabelOrLink = nav.querySelector('.nav-group-label, .nav-link')!;
    const gap = firstLabelOrLink.getBoundingClientRect().top - header.getBoundingClientRect().bottom;

    expect(gap).toBeCloseTo(8, 0);
  });
});
