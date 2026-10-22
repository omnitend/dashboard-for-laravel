import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { defineComponent, h } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

/*
 * A `tab-content(<key>)` slot replaces a tab's whole body. Field tabs wrap
 * their body in a top-spaced element; a custom body used to get none, so
 * with `:card-tabs="false"` its first line sat flush against the tab bar
 * while a field tab beside it had 1rem of space. In card mode `.card-body`
 * already pads the pane, so a custom body must get nothing extra there.
 *
 * Offsets are measured in the real browser: the gap between the bottom of
 * the tab bar and the top of the first content element of the shown pane.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async () => {
  for (let i = 0; i < 4; i += 1) await flush();
};

const fields: FieldDefinition[] = [{ key: 'name', type: 'text', label: 'Name' }];

const tabs: FormTab[] = [
  { key: 'general', label: 'General', fieldKeys: ['name'] },
  { key: 'history', label: 'History', fieldKeys: [] },
];

function mountForm(cardTabs: boolean) {
  const Host = defineComponent({
    setup() {
      const form = useForm({ name: 'Widget' });
      return () =>
        h(
          DXForm,
          { form, fields, tabs, cardTabs, showSubmit: false },
          {
            'tab-content(history)': () =>
              h('p', { class: 'history-first-line', style: 'margin: 0' }, 'First line'),
          },
        );
    },
  });
  return render(Host);
}

function shownPane(root: Element): HTMLElement {
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.tab-pane')).filter(
    (pane) => pane.classList.contains('active') && pane.offsetParent !== null,
  );
  expect(panes.length).toBe(1);
  return panes[0];
}

/** Gap from the tab bar's bottom edge to `target`'s top edge, in px. */
function gapBelowTabBar(root: Element, target: Element): number {
  const nav = root.querySelector('.nav')!;
  return target.getBoundingClientRect().top - nav.getBoundingClientRect().bottom;
}

async function selectTab(root: Element, title: string) {
  const button = Array.from(root.querySelectorAll<HTMLElement>('.nav-link')).find(
    (candidate) => candidate.textContent?.trim() === title,
  );
  expect(button, `nav button "${title}"`).toBeTruthy();
  await userEvent.click(button!);
  await settle();
}

describe('DXForm tab-content slot spacing', () => {
  it('gives a custom tab body the same top spacing as a field tab without a card', async () => {
    const { container } = mountForm(false);
    await settle();

    // The field tab's body: one wrapper whose top padding is the spacing.
    const fieldPane = shownPane(container);
    expect(fieldPane.querySelector('label'), 'field tab renders its field').toBeTruthy();
    const fieldWrapper = fieldPane.firstElementChild as HTMLElement;
    const fieldWrapperPaddingTop = parseFloat(getComputedStyle(fieldWrapper).paddingTop);
    expect(fieldWrapperPaddingTop).toBeGreaterThan(0);
    const fieldContentGap = gapBelowTabBar(container, fieldWrapper) + fieldWrapperPaddingTop;

    await selectTab(container, 'History');
    const customPane = shownPane(container);
    const firstLine = customPane.querySelector('.history-first-line')!;
    expect(firstLine, 'custom tab renders its slot').toBeTruthy();

    // The custom body's first line starts where the field body's content does.
    expect(gapBelowTabBar(container, firstLine)).toBeCloseTo(fieldContentGap, 1);
  });

  it('adds no extra spacing to a custom tab body inside a card', async () => {
    const { container } = mountForm(true);
    await settle();

    await selectTab(container, 'History');
    const customPane = shownPane(container);
    const firstLine = customPane.querySelector('.history-first-line')!;
    expect(firstLine, 'custom tab renders its slot').toBeTruthy();

    // Positive control: the card's own body padding is there...
    const cardBody = firstLine.closest<HTMLElement>('.card-body')!;
    expect(cardBody, 'card mode wraps the pane in a .card-body').toBeTruthy();
    const cardBodyPaddingTop = parseFloat(getComputedStyle(cardBody).paddingTop);
    expect(cardBodyPaddingTop).toBeGreaterThan(0);

    // ...and the first line starts exactly there, with nothing added on top.
    const offsetInsideCardBody =
      firstLine.getBoundingClientRect().top - cardBody.getBoundingClientRect().top;
    expect(offsetInsideCardBody).toBeCloseTo(cardBodyPaddingTop, 1);
  });
});
