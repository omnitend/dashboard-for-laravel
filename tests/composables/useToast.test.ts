import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import { useToast } from '../../resources/js/composables/useToast';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// useToast() must be called from a component nested under BApp (it injects
// the orchestrator registry) — a sibling that merely renders BApp itself
// doesn't satisfy that.
//
// Vue Test Utils (under vitest-browser-vue's `render`) stubs Transition and
// TransitionGroup by default, and BToast shows and hides through a
// Transition: with the stubs an orchestrated toast never gets `.show` and
// never emits `hidden`. These tests turn the stubs off so the real
// show/hide/remove path runs.
const REAL_TRANSITIONS = { global: { stubs: { transition: false, 'transition-group': false } } };

const renderWithToast = (create: (toast: ReturnType<typeof useToast>) => void) => {
  const Trigger = {
    setup() {
      create(useToast());
      return () => null;
    },
  };
  return render(
    {
      render: () => h(BApp, {}, () => h(Trigger)),
    },
    REAL_TRANSITIONS,
  );
};

describe('useToast', () => {
  it('translates a themed variant into a toast-{variant} class, not BVN\'s variant prop', async () => {
    const screen = renderWithToast((toast) =>
      toast.create({ title: 'Saved', variant: 'success' }),
    );
    await flush();

    const el = screen.container.querySelector('.toast')!;
    expect(el.classList.contains('toast-success')).toBe(true);
    expect(el.classList.contains('text-bg-success')).toBe(false);
  });

  it('leaves an unthemed variant untouched (falls through to BVN default styling)', async () => {
    const screen = renderWithToast((toast) =>
      toast.create({ title: 'Note', variant: 'primary' }),
    );
    await flush();

    const el = screen.container.querySelector('.toast')!;
    expect(el.classList.contains('text-bg-primary')).toBe(true);
    expect(el.classList.contains('toast-primary')).toBe(false);
  });

  it('preserves a caller-supplied toastClass alongside the themed class', async () => {
    const screen = renderWithToast((toast) =>
      toast.create({ title: 'Saved', variant: 'danger', toastClass: 'my-custom-class' }),
    );
    await flush();

    const el = screen.container.querySelector('.toast')!;
    expect(el.classList.contains('toast-danger')).toBe(true);
    expect(el.classList.contains('my-custom-class')).toBe(true);
  });

  // bvn 0.45 defaulted a created toast's modelValue to 5000 (shown, 5 s
  // countdown); 1.x creates it hidden until `.show()`. The documented
  // `toast.create({ body, variant })` must still show a toast (#249).
  const visibleToasts = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.toast')).filter(
      (el) => el.classList.contains('show') && getComputedStyle(el).display !== 'none',
    );
  const settle = () => new Promise((resolve) => setTimeout(resolve, 400));

  it('create() with no modelValue shows the toast', async () => {
    renderWithToast((toast) => toast.create({ title: 'Shown by default', variant: 'success' }));
    await settle();

    expect(visibleToasts().map((el) => el.textContent)).toContain('Shown by default');
  });

  it('create() with modelValue false stays hidden (positive control)', async () => {
    renderWithToast((toast) => toast.create({ title: 'Kept hidden', modelValue: false }));
    await settle();

    expect(document.querySelector('.toast')).not.toBeNull();
    expect(visibleToasts().map((el) => el.textContent)).not.toContain('Kept hidden');
  });

  it('show(obj) still shows a toast (removed from bvn in 0.46)', async () => {
    renderWithToast((toast) => toast.show({ title: 'Via show', variant: 'info' }));
    await settle();

    expect(visibleToasts().map((el) => el.textContent)).toContain('Via show');
  });

  it('create(obj, options) passes the options through (bvn 1.x takes obj.options)', async () => {
    let options: unknown;
    renderWithToast((toast) => {
      const controller = toast.create({ title: 'Opts' }, { resolveOnHide: true });
      options = toast.store.value.toast.get(controller.id)?.value.options;
    });
    await flush();

    expect(options).toEqual({ resolveOnHide: true });
  });

  // bvn 0.45 destroyed a toast once hidden (unless `keep`); 1.x keeps it in
  // the store and the DOM until the calling component unmounts, so a
  // long-lived page piled up hidden toasts. Each toast here counts down
  // for real (200 ms) and hides through its real transition.
  const SHORT_MS = 200;

  it('removes a toast from the store and the DOM once it has hidden', async () => {
    let toastApi: ReturnType<typeof useToast> | undefined;
    const screen = renderWithToast((toast) => {
      toastApi = toast;
      toast.create({ body: 'Brief', modelValue: SHORT_MS });
    });
    await flush();
    expect(toastApi!.store.value.toast.size).toBe(1);

    await expect.poll(() => toastApi!.store.value.toast.size, { timeout: 4000 }).toBe(0);
    expect(screen.container.querySelector('.toast')).toBeNull();
  });

  // Each of the next two waits for the caller's onHidden first (the
  // positive control: the toast really hid), then reads the store. bvn 1.2.4
  // calls a toast's onHidden twice per hide (raw bvn too), so the counts
  // are "at least once".
  it('keeps a hidden toast when created with { keep: true } (bvn 0.45 option)', async () => {
    let toastApi: ReturnType<typeof useToast> | undefined;
    let hiddenCalls = 0;
    renderWithToast((toast) => {
      toastApi = toast;
      toast.create(
        { body: 'Kept', modelValue: SHORT_MS, onHidden: () => { hiddenCalls += 1; } },
        { keep: true },
      );
    });

    await expect.poll(() => hiddenCalls, { timeout: 4000 }).toBeGreaterThan(0);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(toastApi!.store.value.toast.size).toBe(1);
  });

  it("calls the caller's own onHidden as well", async () => {
    let hiddenCalls = 0;
    let toastApi: ReturnType<typeof useToast> | undefined;
    renderWithToast((toast) => {
      toastApi = toast;
      toast.create({ body: 'Brief', modelValue: SHORT_MS, onHidden: () => { hiddenCalls += 1; } });
    });

    await expect.poll(() => hiddenCalls, { timeout: 4000 }).toBeGreaterThan(0);
    await expect.poll(() => toastApi!.store.value.toast.size, { timeout: 4000 }).toBe(0);
  });

  it('obj.options wins over the second argument', async () => {
    let options: unknown;
    renderWithToast((toast) => {
      const controller = toast.create(
        { title: 'Opts', options: { resolveOnHide: false } },
        { resolveOnHide: true },
      );
      options = toast.store.value.toast.get(controller.id)?.value.options;
    });
    await flush();

    expect(options).toMatchObject({ resolveOnHide: false });
  });

  // Toasts default to bottom-end, not bvn's top-end: top-end covered the
  // navbar's right-hand controls (user menu, page actions), and reaching for
  // them hovered the toast, which pauses its countdown, so it stayed until
  // its × was clicked (DIVERGENCES.md #11).
  it('defaults to the bottom-end position', async () => {
    let position: unknown;
    renderWithToast((toast) => {
      const controller = toast.create({ body: 'Where am I?' });
      position = toast.store.value.toast.get(controller.id)?.value.props.position;
    });
    await flush();

    expect(position).toBe('bottom-end');
    const lastToast = document.querySelector<HTMLElement>('.toast-container.bottom-0.end-0 .toast');
    expect(lastToast).not.toBeNull();
    // The last toast drops the between-toast gap, so the stack sits the
    // container's padding from the bottom edge, like its side (theme.scss).
    expect(getComputedStyle(lastToast!).marginBottom).toBe('0px');
  });

  it('an explicit position still wins', async () => {
    let position: unknown;
    renderWithToast((toast) => {
      const controller = toast.create({ body: 'Up here', position: 'top-end' });
      position = toast.store.value.toast.get(controller.id)?.value.props.position;
    });
    await flush();

    expect(position).toBe('top-end');
  });

  it('renders with no variant at all without error', async () => {
    const screen = renderWithToast((toast) => toast.create({ title: 'Plain' }));
    await flush();

    const el = screen.container.querySelector('.toast')!;
    expect(el).not.toBeNull();
  });
});
