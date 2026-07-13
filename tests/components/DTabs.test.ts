import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DTabs from '../../resources/js/components/base/DTabs.vue';
import { DTab } from '../../resources/js/index';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * #119. No pane got `active`/`show` on mount: the tab nav rendered and every
 * body was invisible until the user clicked. Two greendragon pages had already
 * papered over it with an explicit `active` on the first tab.
 *
 * Cause: BTabs picks the tab to activate by scanning its slot vnodes for the
 * BTab component type (its initial-selection branch is gated on
 * `tabElementsArray.length > 0`), and a wrapper component in between hides it.
 * Bisected — BTabs+BTab and DTabs+BTab both work; BTabs+DTab does not — so the
 * CHILD wrapper was the problem, and `DTab` is now a raw re-export of `BTab`,
 * the same exception `DCarouselSlide` already carries.
 */
const renderTabs = (props: Record<string, any> = {}) =>
  render({
    render: () =>
      h(BApp, {}, () =>
        h(DTabs, props, () => [
          h(DTab, { title: 'First' }, () => h('p', { class: 'body-1' }, 'First body')),
          h(DTab, { title: 'Second' }, () => h('p', { class: 'body-2' }, 'Second body')),
        ]),
      ),
  });

describe('DTabs activates the first tab on mount (#119)', () => {
  it('gives the first pane active/show without an explicit `active`', async () => {
    const screen = renderTabs();
    await wait(150);

    const panes = [...screen.container.querySelectorAll('.tab-pane')];
    expect(panes).toHaveLength(2);
    expect(panes[0].classList.contains('active')).toBe(true);
    expect(panes[0].classList.contains('show')).toBe(true);
    expect(panes[1].classList.contains('active')).toBe(false);
  });

  it('marks the first nav link active', async () => {
    const screen = renderTabs();
    await wait(150);

    const links = [...screen.container.querySelectorAll('.nav-link')];
    expect(links[0].classList.contains('active')).toBe(true);
  });

  it('still switches tabs on click', async () => {
    const screen = renderTabs();
    await wait(150);

    const links = [...screen.container.querySelectorAll('.nav-link')] as HTMLElement[];
    await userEvent.click(links[1]);
    await wait(150);

    const panes = [...screen.container.querySelectorAll('.tab-pane')];
    expect(panes[1].classList.contains('active')).toBe(true);
    expect(panes[0].classList.contains('active')).toBe(false);
  });

  it('still honours the explicit `active` consumers were using as a workaround', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DTabs, {}, () => [
            h(DTab, { title: 'First', active: true }, () => h('p', 'First body')),
            h(DTab, { title: 'Second' }, () => h('p', 'Second body')),
          ]),
        ),
    });
    await wait(150);

    const panes = [...screen.container.querySelectorAll('.tab-pane')];
    expect(panes[0].classList.contains('active')).toBe(true);
  });

  /*
   * NOTE for anyone hitting this: an explicit `active` on a NON-first tab is
   * not honoured — raw BTabs+BTab also lands on index 0, so that's an upstream
   * limitation and not something the wrapper removal introduced. Only the
   * first-tab `active` (what consumers were using) works.
   */
});
