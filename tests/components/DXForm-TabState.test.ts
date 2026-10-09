import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { KeepAlive, defineComponent, h, ref, type Ref } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

/*
 * #194: DXForm owns the active tab, tracked by KEY. The public
 * `v-model:active-tab` stays an index derived from that key.
 *
 * Assertions read the SHOWN pane (active and laid out), the indexes DXForm
 * emitted, and, where a parent binds the model, the parent's own ref. Errors
 * arrive as a real 422 from `form.post()` with `fetch` stubbed.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async () => {
  for (let i = 0; i < 4; i += 1) await flush();
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function stubValidationFailures(...errorSets: Array<Record<string, string[]>>) {
  const queue = [...errorSets];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const errors = queue.shift() ?? {};
    return new Response(
      JSON.stringify({ message: 'The given data was invalid.', errors }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    );
  });
}

function shownPane(root: Element): HTMLElement {
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.tab-pane')).filter(
    (pane) => pane.classList.contains('active') && pane.offsetParent !== null,
  );
  expect(panes.length).toBe(1);
  return panes[0];
}

const shownLabels = (root: Element): string[] =>
  Array.from(shownPane(root).querySelectorAll('label')).map(
    (label) => label.textContent?.trim() ?? '',
  );

const navButtons = (root: Element) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('.nav-link'));

const navButton = (root: Element, text: string): HTMLButtonElement => {
  const button = navButtons(root).find((candidate) => candidate.textContent?.trim() === text);
  expect(button, `nav button "${text}"`).toBeTruthy();
  return button!;
};

/** The nav button whose tab is selected, by its own aria state. */
const selectedNavText = (root: Element): string[] =>
  navButtons(root)
    .filter((button) => button.getAttribute('aria-selected') === 'true')
    .map((button) => button.textContent?.trim() ?? '');

const fields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'sku', type: 'text', label: 'SKU' },
  { key: 'description', type: 'text', label: 'Description' },
];

const threeTabs: FormTab[] = [
  { key: 'general', label: 'General', fieldKeys: ['name'] },
  { key: 'details', label: 'Details', fieldKeys: ['sku'] },
  { key: 'extra', label: 'Extra', fieldKeys: ['description'] },
];

const makeForm = () => useForm({ name: 'Widget', sku: '', description: '' });

type BoundForm = ReturnType<typeof useForm<any>>;

/**
 * Mount DXForm under a parent that binds `v-model:active-tab` to its own ref.
 * `accept` decides what the parent does with an emitted index (default: take it).
 */
function mountBound(options: {
  form: BoundForm;
  tabs: Ref<FormTab[]> | FormTab[];
  initialIndex: number;
  accept?: (emitted: number, boundIndex: Ref<number>) => void;
  extraProps?: Record<string, unknown>;
}) {
  const boundIndex = ref(options.initialIndex);
  const emissions: number[] = [];
  const formComponent = ref<any>(null);
  const tabsSource = options.tabs;
  const Parent = defineComponent({
    setup: () => () =>
      h(DXForm, {
        ref: formComponent,
        form: options.form,
        fields,
        tabs: Array.isArray(tabsSource) ? tabsSource : tabsSource.value,
        showSubmit: false,
        ...options.extraProps,
        activeTab: boundIndex.value,
        'onUpdate:activeTab': (index: number) => {
          emissions.push(index);
          if (options.accept) options.accept(index, boundIndex);
          else boundIndex.value = index;
        },
      }),
  });
  const screen = render(Parent);
  return { screen, boundIndex, emissions, formComponent };
}

describe('DXForm tab state by key (#194)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial index', () => {
    it('shows the tab named by an initial activeTab', async () => {
      // Would this pass with the bug present? No: every DTab carried
      // `active` for index 0, which reset the selection to the first tab.
      const screen = render(DXForm, {
        props: { form: makeForm(), fields, tabs: threeTabs, showSubmit: false, activeTab: 1 },
      });
      await settle();

      expect(shownLabels(screen.container)).toEqual(['SKU']);
      expect(selectedNavText(screen.container)).toEqual(['Details']);
      expect(screen.emitted('update:activeTab')).toBeUndefined();
    });

    it('shows the tab named by a parent-bound initial index, emitting nothing', async () => {
      const { screen, boundIndex, emissions } = mountBound({
        form: makeForm(),
        tabs: threeTabs,
        initialIndex: 2,
      });
      await settle();

      expect(shownLabels(screen.container)).toEqual(['Description']);
      expect(boundIndex.value).toBe(2);
      expect(emissions).toEqual([]);
    });

    it('falls back to the first tab when the initial activeTab is out of range', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields, tabs: threeTabs, showSubmit: false, activeTab: 7 },
      });
      await settle();

      expect(shownLabels(screen.container)).toEqual(['Name']);
      expect(screen.emitted('update:activeTab')).toEqual([[0]]);
    });
  });

  it('shows a tab again when every tab is hidden and then returns', async () => {
    const form = useForm({ name: 'Widget', sku: '', description: '', showTabs: true });
    const tabs: FormTab[] = threeTabs.map((tab) => ({
      ...tab,
      when: (model: Record<string, unknown>) => model.showTabs === true,
    }));
    const screen = render(DXForm, {
      props: { form, fields, tabs, showSubmit: false },
    });
    await settle();
    await userEvent.click(navButton(screen.container, 'Details'));
    await settle();
    expect(shownLabels(screen.container)).toEqual(['SKU']);

    form.data.showTabs = false;
    await settle();
    expect(navButtons(screen.container).length).toBe(0);

    form.data.showTabs = true;
    await settle();
    // The same tab comes back, shown, with exactly one tab selected.
    expect(shownLabels(screen.container)).toEqual(['SKU']);
    expect(selectedNavText(screen.container)).toEqual(['Details']);
  });

  describe.each([
    ['shrink then error', ['shrink', 'error'] as const],
    ['error then shrink', ['error', 'shrink'] as const],
  ])('a parent-bound activeTab when tabs shrink and an error lands in one tick (%s)', (_label, order) => {
    it('selects the error tab, emitting its new index once', async () => {
      // Competing writers (a range fallback and an error watcher) used to emit
      // [1, 0] here, whichever mutation came first.
      const form = useForm({ name: 'Widget', sku: '', description: '', hideGeneral: false });
      const tabs: FormTab[] = [
        {
          key: 'general',
          label: 'General',
          fieldKeys: ['name'],
          when: (model: Record<string, unknown>) => model.hideGeneral !== true,
        },
        { key: 'details', label: 'Details', fieldKeys: ['sku'] },
        { key: 'extra', label: 'Extra', fieldKeys: ['description'] },
      ];
      const { screen, boundIndex, emissions } = mountBound({ form, tabs, initialIndex: 0 });
      await settle();
      await userEvent.click(navButton(screen.container, 'Extra'));
      await settle();
      // Positive control: the click selected Extra and the parent took it.
      expect(shownLabels(screen.container)).toEqual(['Description']);
      expect(boundIndex.value).toBe(2);
      emissions.length = 0;

      for (const step of order) {
        if (step === 'shrink') form.data.hideGeneral = true;
        else form.setErrors({ description: ['The description is required.'] });
      }
      await settle();

      expect(navButtons(screen.container).length).toBe(2);
      expect(shownLabels(screen.container)).toEqual(['Description']);
      expect(boundIndex.value).toBe(1);
      expect(emissions).toEqual([1]);
    });
  });

  it('stays on the same tab when tabs reorder with the same count, emitting its new index', async () => {
    const tabs = ref<FormTab[]>([...threeTabs]);
    const { screen, boundIndex, emissions } = mountBound({
      form: makeForm(),
      tabs,
      initialIndex: 0,
    });
    await settle();
    await userEvent.click(navButton(screen.container, 'Details'));
    await settle();
    expect(shownLabels(screen.container)).toEqual(['SKU']);
    expect(boundIndex.value).toBe(1);
    emissions.length = 0;

    tabs.value = [threeTabs[1], threeTabs[0], threeTabs[2]];
    await settle();

    expect(navButtons(screen.container).map((b) => b.textContent?.trim())).toEqual([
      'Details',
      'General',
      'Extra',
    ]);
    expect(shownLabels(screen.container)).toEqual(['SKU']);
    expect(selectedNavText(screen.container)).toEqual(['Details']);
    expect(emissions).toEqual([0]);
    expect(boundIndex.value).toBe(0);
  });

  it('stays on the same tab when an earlier tab hides, emitting its new index', async () => {
    const form = useForm({ name: 'Widget', sku: '', description: '', hideGeneral: false });
    const tabs: FormTab[] = [
      {
        ...threeTabs[0],
        when: (model: Record<string, unknown>) => model.hideGeneral !== true,
      },
      threeTabs[1],
      threeTabs[2],
    ];
    const { screen, boundIndex, emissions } = mountBound({ form, tabs, initialIndex: 0 });
    await settle();
    await userEvent.click(navButton(screen.container, 'Extra'));
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);
    expect(boundIndex.value).toBe(2);
    emissions.length = 0;

    form.data.hideGeneral = true;
    await settle();

    expect(shownLabels(screen.container)).toEqual(['Description']);
    expect(emissions).toEqual([1]);
    expect(boundIndex.value).toBe(1);

    // And back: General returns in front, the selection stays on Extra.
    form.data.hideGeneral = false;
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);
    expect(emissions).toEqual([1, 2]);
    expect(boundIndex.value).toBe(2);
  });

  it('keeps a tab’s ids, and the focus on its button, when an earlier tab hides', async () => {
    // Ids derived from position would move to another tab here: bvn keys its
    // nav items by pane id, so the focused button would be torn down.
    const form = useForm({ name: 'Widget', sku: '', description: '', hideGeneral: false });
    const tabs: FormTab[] = [
      { ...threeTabs[0], when: (model: Record<string, unknown>) => model.hideGeneral !== true },
      threeTabs[1],
      threeTabs[2],
    ];
    const screen = render(DXForm, { props: { form, fields, tabs, showSubmit: false } });
    await settle();
    await userEvent.click(navButton(screen.container, 'Extra'));
    await settle();
    const extraButton = navButton(screen.container, 'Extra');
    const extraPaneId = extraButton.getAttribute('aria-controls');
    const extraButtonId = extraButton.id;
    // Positive control: the click left focus on the tab it selected.
    expect(document.activeElement).toBe(extraButton);
    expect(shownPane(screen.container).id).toBe(extraPaneId);

    form.data.hideGeneral = true;
    await settle();

    const extraButtonAfter = navButton(screen.container, 'Extra');
    expect(extraButtonAfter.id).toBe(extraButtonId);
    expect(extraButtonAfter.getAttribute('aria-controls')).toBe(extraPaneId);
    expect(shownPane(screen.container).id).toBe(extraPaneId);
    expect(document.activeElement).toBe(extraButtonAfter);
  });

  describe('a parent that binds the index', () => {
    it('keeps its own tab when it rejects a click, and a second click asks again', async () => {
      const { screen, boundIndex, emissions } = mountBound({
        form: makeForm(),
        tabs: threeTabs,
        initialIndex: 0,
        accept: () => {
          /* rejects every change */
        },
      });
      await settle();

      await userEvent.click(navButton(screen.container, 'Details'));
      await settle();
      expect(emissions).toEqual([1]);
      expect(boundIndex.value).toBe(0);
      expect(shownLabels(screen.container)).toEqual(['Name']);
      expect(selectedNavText(screen.container)).toEqual(['General']);

      // bvn's own index moved to the clicked tab; the request must still go out.
      await userEvent.click(navButton(screen.container, 'Details'));
      await settle();
      expect(emissions).toEqual([1, 1]);
      expect(shownLabels(screen.container)).toEqual(['Name']);
    });

    it('shows the tab the parent normalises a click to', async () => {
      const { screen, boundIndex, emissions } = mountBound({
        form: makeForm(),
        tabs: threeTabs,
        initialIndex: 0,
        // "Details" is not available yet: send the user to Extra instead.
        accept: (index, bound) => {
          bound.value = index === 1 ? 2 : index;
        },
      });
      await settle();

      await userEvent.click(navButton(screen.container, 'Details'));
      await settle();

      expect(emissions).toEqual([1]);
      expect(boundIndex.value).toBe(2);
      expect(shownLabels(screen.container)).toEqual(['Description']);
      expect(selectedNavText(screen.container)).toEqual(['Extra']);
    });

    it('follows a late acknowledgement', async () => {
      const { screen, boundIndex, emissions } = mountBound({
        form: makeForm(),
        tabs: threeTabs,
        initialIndex: 0,
        accept: (index, bound) => {
          setTimeout(() => {
            bound.value = index;
          }, 300);
        },
      });
      await settle();

      await userEvent.click(navButton(screen.container, 'Extra'));
      await settle();
      // Controlled: until the parent answers, its index is what shows.
      expect(emissions).toEqual([2]);
      expect(boundIndex.value).toBe(0);
      expect(shownLabels(screen.container)).toEqual(['Name']);

      await wait(400);
      await settle();
      expect(boundIndex.value).toBe(2);
      expect(shownLabels(screen.container)).toEqual(['Description']);
      expect(emissions).toEqual([2]);
    });

    it('moves to a tab the parent sets', async () => {
      const { screen, boundIndex, emissions } = mountBound({
        form: makeForm(),
        tabs: threeTabs,
        initialIndex: 0,
      });
      await settle();

      boundIndex.value = 2;
      await settle();
      expect(shownLabels(screen.container)).toEqual(['Description']);
      expect(emissions).toEqual([]);
    });
  });

  it('selects a clicked tab when nothing binds the index', async () => {
    const screen = render(DXForm, {
      props: { form: makeForm(), fields, tabs: threeTabs, showSubmit: false },
    });
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Name']);

    await userEvent.click(navButton(screen.container, 'Extra'));
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);
    expect(screen.emitted('update:activeTab')).toEqual([[2]]);

    await userEvent.click(navButton(screen.container, 'Details'));
    await settle();
    expect(shownLabels(screen.container)).toEqual(['SKU']);
    expect(screen.emitted('update:activeTab')).toEqual([[2], [1]]);
  });

  it('moves between tabs with the arrow keys, keeping focus on the selected tab', async () => {
    const screen = render(DXForm, {
      props: { form: makeForm(), fields, tabs: threeTabs, showSubmit: false },
    });
    await settle();
    const general = navButton(screen.container, 'General');
    general.focus();
    // Roving tabindex: only the selected tab is in the tab order.
    expect(
      navButtons(screen.container).map((b) => b.getAttribute('tabindex') === '-1'),
    ).toEqual([false, true, true]);

    await userEvent.keyboard('{ArrowRight}');
    await settle();
    expect(shownLabels(screen.container)).toEqual(['SKU']);
    expect(document.activeElement).toBe(navButton(screen.container, 'Details'));

    await userEvent.keyboard('{End}');
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);
    expect(document.activeElement).toBe(navButton(screen.container, 'Extra'));

    await userEvent.keyboard('{ArrowRight}');
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);

    await userEvent.keyboard('{Home}');
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Name']);
    expect(screen.emitted('update:activeTab')).toEqual([[1], [2], [0]]);
  });

  it('gives tabs keyed with spaces and near-duplicates valid, resolvable ids', async () => {
    const form = makeForm();
    const tabs: FormTab[] = [
      { key: 'general info', label: 'One', fieldKeys: ['name'] },
      { key: 'general  info', label: 'Two', fieldKeys: ['sku'] },
      { key: 'General info', label: 'Three', fieldKeys: ['description'] },
    ];
    const screen = render(DXForm, {
      props: { form, fields, tabs, showSubmit: false },
    });
    await settle();

    const buttons = navButtons(screen.container);
    expect(buttons.length).toBe(3);
    const paneIds = buttons.map((button) => button.getAttribute('aria-controls') ?? '');
    expect(new Set(paneIds).size).toBe(3);
    for (const [index, button] of buttons.entries()) {
      const paneId = paneIds[index];
      // An id with whitespace is invalid HTML and breaks aria-controls lookups.
      expect(paneId).toMatch(/^\S+$/);
      const pane = document.getElementById(paneId);
      expect(pane, `pane for ${button.textContent}`).not.toBeNull();
      expect(screen.container.contains(pane)).toBe(true);
      expect(pane!.getAttribute('role')).toBe('tabpanel');
      expect(document.getElementById(pane!.getAttribute('aria-labelledby') ?? '')).toBe(button);
    }

    await userEvent.click(buttons[1]);
    await settle();
    expect(shownLabels(screen.container)).toEqual(['SKU']);
    expect(shownPane(screen.container).id).toBe(paneIds[1]);
    await userEvent.click(buttons[2]);
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);
  });

  it('keeps the selected tab across a KeepAlive deactivate and reactivate', async () => {
    const form = makeForm();
    const showForm = ref(true);
    const Other = defineComponent({ render: () => h('p', 'elsewhere') });
    const Parent = defineComponent({
      setup: () => () =>
        h(KeepAlive, null, [
          showForm.value
            ? h(DXForm, { key: 'form', form, fields, tabs: threeTabs, showSubmit: false })
            : h(Other, { key: 'other' }),
        ]),
    });
    const screen = render(Parent);
    await settle();
    await userEvent.click(navButton(screen.container, 'Extra'));
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);

    showForm.value = false;
    await settle();
    expect(screen.container.querySelector('.tab-pane')).toBeNull();

    showForm.value = true;
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);
    expect(selectedNavText(screen.container)).toEqual(['Extra']);
  });

  it('selects the error tab after a failed submit and the clicked tab after that', async () => {
    stubValidationFailures({ description: ['The description is required.'] });
    const form = makeForm();
    const { screen, boundIndex, emissions } = mountBound({ form, tabs: threeTabs, initialIndex: 0 });
    await settle();

    await expect(form.post('/api/products')).rejects.toBeTruthy();
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);
    expect(boundIndex.value).toBe(2);

    await userEvent.click(navButton(screen.container, 'General'));
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Name']);
    expect(emissions).toEqual([2, 0]);
  });
});
