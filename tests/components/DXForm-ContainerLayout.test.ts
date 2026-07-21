/**
 * DXForm `layout="auto"` — container-driven (NOT viewport-driven) layout.
 *
 * The bug this guards: dfl's responsiveness was media-query based, so a form
 * narrowed by the dashboard sidebar (or sitting in a modal) kept its full-width
 * horizontal label/input split and cramped itself, because the WINDOW was wide.
 *
 * What makes these assertions real rather than decorative:
 *
 * - Finding the form proves nothing — the `.dx-form--horizontal` class AND the
 *   rendered geometry (does the label share a row with its control, or sit
 *   above it?) are checked together, via `getBoundingClientRect()`.
 * - The viewport is asserted UNCHANGED across every resize, so a pass cannot be
 *   a media query firing. Only the container moves.
 * - Resizes are awaited on a real `ResizeObserver` delivery, not a sleep.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, nextTick } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import { useContainerWidth } from '../../resources/js/composables/useContainerWidth';
import type { FieldDefinition } from '../../resources/js/types';

// Deliberately realistic label lengths — the 640px default threshold was
// derived from the width a ~20-character label needs at labelCols 3.
const fields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Product name' },
  { key: 'notes', type: 'text', label: 'Unit price (ex VAT)' },
];

const HOST = 'container-layout-host';

/**
 * Resolve once a `ResizeObserver` delivery for `element` has been dispatched,
 * then let Vue flush. A fresh observer's first delivery lands in the same
 * dispatch pass as the component's own (observers fire in creation order, and
 * the component's is older), so by the time this resolves the composable has
 * already published the new width.
 */
async function settleResize(element: Element): Promise<void> {
  // Let Vue's post-render effects run first — that is where the component
  // registers its own observer, and we need ours to be the younger one.
  await nextTick();
  await new Promise<void>((resolve) => {
    const observer = new ResizeObserver(() => {
      observer.disconnect();
      resolve();
    });
    observer.observe(element);
  });
  await nextTick();
  await nextTick();
}

function mountForm(props: Record<string, unknown>, initialWidth: number) {
  const screen = render({
    setup() {
      const form = useForm({ name: '', notes: '' });
      return () =>
        h('div', { class: HOST, style: `width:${initialWidth}px` }, [
          h(DXForm, { form, fields, showSubmit: false, ...props }),
        ]);
    },
  });
  const host = screen.container.querySelector(`.${HOST}`) as HTMLElement;
  const formEl = screen.container.querySelector('form') as HTMLElement;
  return { screen, host, formEl };
}

async function setHostWidth(host: HTMLElement, formEl: HTMLElement, width: number) {
  host.style.width = `${width}px`;
  await settleResize(formEl);
}

/** The label + control pair for a field, located by the label's text. */
function pairFor(root: Element, labelText: string) {
  const label = Array.from(root.querySelectorAll('label')).find(
    (candidate) => (candidate.textContent ?? '').trim().startsWith(labelText),
  );
  if (label === undefined) throw new Error(`no label "${labelText}"`);
  const group = label.closest('.mb-3') ?? label.parentElement;
  const input = group?.querySelector('input');
  if (input === null || input === undefined) throw new Error(`no input for "${labelText}"`);
  return { label, input };
}

/** True when label and control occupy the same row (label to the left). */
function sharesRow(label: Element, input: Element): boolean {
  const labelRect = label.getBoundingClientRect();
  const inputRect = input.getBoundingClientRect();
  const verticallyOverlaps =
    labelRect.top < inputRect.bottom && inputRect.top < labelRect.bottom;
  return verticallyOverlaps && labelRect.right <= inputRect.left + 1;
}

/** True when the control is stacked beneath its label. */
function isStacked(label: Element, input: Element): boolean {
  const labelRect = label.getBoundingClientRect();
  const inputRect = input.getBoundingClientRect();
  return labelRect.bottom <= inputRect.top + 1;
}

describe('DXForm container-driven layout', () => {
  let viewport: { width: number; height: number };

  beforeEach(() => {
    viewport = { width: window.innerWidth, height: window.innerHeight };
  });

  const expectViewportUnchanged = () => {
    // If this ever drifts, a "container query works" pass could really be a
    // media query firing — the whole point of the feature would be unproven.
    expect(window.innerWidth).toBe(viewport.width);
    expect(window.innerHeight).toBe(viewport.height);
  };

  it('renders horizontal in a wide container and stacks when the container narrows', async () => {
    const { screen, host, formEl } = mountForm({ layout: 'auto' }, 900);
    await settleResize(formEl);

    // Wide container → horizontal.
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(true);
    let pair = pairFor(screen.container, 'Product name');
    expect(sharesRow(pair.label, pair.input)).toBe(true);
    expect(isStacked(pair.label, pair.input)).toBe(false);

    // Narrow the CONTAINER only — the window never moves.
    await setHostWidth(host, formEl, 400);
    expect(formEl.getBoundingClientRect().width).toBeCloseTo(400, 0);
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(false);
    pair = pairFor(screen.container, 'Product name');
    expect(isStacked(pair.label, pair.input)).toBe(true);
    expect(sharesRow(pair.label, pair.input)).toBe(false);
    expectViewportUnchanged();

    // …and back again.
    await setHostWidth(host, formEl, 900);
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(true);
    pair = pairFor(screen.container, 'Product name');
    expect(sharesRow(pair.label, pair.input)).toBe(true);
    expectViewportUnchanged();

    screen.unmount();
  });

  it('honours a custom layoutThreshold', async () => {
    // Same 800px container, two thresholds — so the assertion can only pass if
    // `layoutThreshold` is genuinely consulted, not because vertical happens to
    // be the default.
    const atDefault = mountForm({ layout: 'auto' }, 800);
    await settleResize(atDefault.formEl);
    const raised = mountForm({ layout: 'auto', layoutThreshold: 900 }, 800);
    await settleResize(raised.formEl);

    expect(atDefault.formEl.getBoundingClientRect().width).toBeCloseTo(800, 0);
    expect(raised.formEl.getBoundingClientRect().width).toBeCloseTo(800, 0);

    // 800 >= 640 → horizontal.
    expect(atDefault.formEl.classList.contains('dx-form--horizontal')).toBe(true);
    const wide = pairFor(atDefault.screen.container, 'Product name');
    expect(sharesRow(wide.label, wide.input)).toBe(true);

    // 800 < 900 → stacked, same container width.
    expect(raised.formEl.classList.contains('dx-form--horizontal')).toBe(false);
    const stacked = pairFor(raised.screen.container, 'Product name');
    expect(isStacked(stacked.label, stacked.input)).toBe(true);
    expectViewportUnchanged();

    atDefault.screen.unmount();
    raised.screen.unmount();
  });

  it('applies hysteresis so the boundary cannot oscillate', async () => {
    // Threshold 640, band 24: the crossing back to horizontal needs >= 664.
    const { screen, host, formEl } = mountForm({ layout: 'auto' }, 400);
    await settleResize(formEl);
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(false);

    // 650 is above the threshold but inside the band — still stacked.
    await setHostWidth(host, formEl, 650);
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(false);

    // Clear of the band — flips.
    await setHostWidth(host, formEl, 700);
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(true);

    // Coming back down, 650 is still >= threshold, so it stays horizontal:
    // the band is one-way, which is what stops the flip-flop.
    await setHostWidth(host, formEl, 650);
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(true);
    expectViewportUnchanged();

    screen.unmount();
  });

  it('leaves layout="horizontal" unconditional, even in a narrow container', async () => {
    const { screen, host, formEl } = mountForm({ layout: 'horizontal' }, 900);
    await settleResize(formEl);
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(true);

    await setHostWidth(host, formEl, 320);
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(true);
    const pair = pairFor(screen.container, 'Product name');
    expect(sharesRow(pair.label, pair.input)).toBe(true);
    expectViewportUnchanged();

    screen.unmount();
  });

  it('leaves the default (vertical) layout unconditional, even in a wide container', async () => {
    const { screen, formEl } = mountForm({}, 1100);
    await settleResize(formEl);

    expect(formEl.classList.contains('dx-form--horizontal')).toBe(false);
    const pair = pairFor(screen.container, 'Product name');
    expect(isStacked(pair.label, pair.input)).toBe(true);
    expectViewportUnchanged();

    screen.unmount();
  });

  it('keeps per-field layout overrides and span fields working under auto', async () => {
    const overrideFields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Product name', layout: 'horizontal' },
      { key: 'notes', type: 'text', label: 'Unit price (ex VAT)' },
    ];
    const screen = render({
      setup() {
        const form = useForm({ name: '', notes: '' });
        return () =>
          h('div', { class: HOST, style: 'width:400px' }, [
            h(DXForm, {
              form,
              fields: overrideFields,
              showSubmit: false,
              layout: 'auto',
            }),
          ]);
      },
    });
    const formEl = screen.container.querySelector('form') as HTMLElement;
    await settleResize(formEl);

    // Form resolved to vertical (narrow container) …
    expect(formEl.classList.contains('dx-form--horizontal')).toBe(false);
    const overridden = pairFor(screen.container, 'Product name');
    const inherited = pairFor(screen.container, 'Unit price (ex VAT)');
    // … but the field that asked for horizontal still gets it.
    expect(sharesRow(overridden.label, overridden.input)).toBe(true);
    expect(isStacked(inherited.label, inherited.input)).toBe(true);
    expectViewportUnchanged();

    screen.unmount();
  });
});

describe('useContainerWidth', () => {
  it('reports the observed element width and answers arbitrary thresholds', async () => {
    const readings: Array<{ width: number; below: boolean; narrower: boolean }> = [];

    const screen = render({
      setup() {
        const { containerRef, width, isBelow, isNarrowerThan, hasMeasured } =
          useContainerWidth({ threshold: 500 });
        return () => {
          readings.push({
            width: width.value,
            below: isBelow.value,
            narrower: isNarrowerThan(300),
          });
          return h('div', {
            ref: containerRef,
            class: HOST,
            style: 'width:800px',
            'data-measured': String(hasMeasured.value),
          });
        };
      },
    });

    const host = screen.container.querySelector(`.${HOST}`) as HTMLElement;
    await settleResize(host);

    // First render happens before any measurement: width starts at 0 (the
    // documented "assume narrowest" SSR default), so `isBelow` is true.
    expect(readings[0]).toEqual({ width: 0, below: true, narrower: true });

    const measured = readings[readings.length - 1];
    expect(measured.width).toBe(800);
    expect(measured.below).toBe(false);
    expect(measured.narrower).toBe(false);
    expect(host.dataset.measured).toBe('true');

    host.style.width = '250px';
    await settleResize(host);
    const narrow = readings[readings.length - 1];
    expect(narrow.width).toBe(250);
    expect(narrow.below).toBe(true);
    expect(narrow.narrower).toBe(true);

    screen.unmount();
  });
});
