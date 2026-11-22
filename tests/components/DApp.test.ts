import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DApp from '../../resources/js/components/base/DApp.vue';
import { useToast } from '../../resources/js/composables/useToast';

const flush = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/** A child that creates one toast once mounted, recording any error. */
const toastingChild = (outcome: { error?: unknown }) => ({
  setup() {
    try {
      const toast = useToast();
      return { toast };
    } catch (error) {
      outcome.error = error;
      return { toast: null };
    }
  },
  mounted(this: { toast: ReturnType<typeof useToast> | null }) {
    try {
      this.toast?.create({ body: 'From inside DApp', variant: 'success' });
    } catch (error) {
      outcome.error = error;
    }
  },
  render: () => null,
});

// Shown = BToast's own v-show plus the live-region role it sets while shown
// (see tests/composables/useToast.test.ts for why not the `.show` class).
const shownToastTexts = (container: Element) =>
  Array.from(container.querySelectorAll<HTMLElement>('.toast'))
    .filter((el) => getComputedStyle(el).display !== 'none' && el.getAttribute('role') !== null)
    .map((el) => el.textContent ?? '');

describe('DApp', () => {
  it('provides what useToast() needs and renders the toast it creates', async () => {
    const outcome: { error?: unknown } = {};
    const screen = render({ render: () => h(DApp, {}, () => h(toastingChild(outcome))) });
    await flush(300);

    expect(outcome.error).toBeUndefined();
    expect(shownToastTexts(screen.container)).toContain('From inside DApp');
  });

  // With `no-orchestrator` BApp provides no registry, so useToast() itself
  // throws. Only reachable if DApp forwards the attr.
  it('forwards attrs to BApp (no-orchestrator: useToast has no registry)', async () => {
    const outcome: { error?: unknown } = {};
    const screen = render({
      render: () => h(DApp, { noOrchestrator: true }, () => h(toastingChild(outcome))),
    });
    await flush(300);

    expect(String(outcome.error)).toContain('BApp, useRegistry or plugin must be installed');
    expect(screen.container.querySelector('.toast')).toBeNull();
  });
});
