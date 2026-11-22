import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp, BvTriggerableEvent } from 'bootstrap-vue-next';
import { useToast } from '../../resources/js/composables/useToast';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// useToast() must be called from a component nested under BApp (it injects
// the orchestrator registry) — a sibling that merely renders BApp itself
// doesn't satisfy that.
const renderWithToast = (create: (toast: ReturnType<typeof useToast>) => void) => {
  const Trigger = {
    setup() {
      create(useToast());
      return () => null;
    },
  };
  return render({
    render: () => h(BApp, {}, () => h(Trigger)),
  });
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
  //
  // "Shown" is BToast's own v-show (display) plus the live-region role it
  // sets only while shown. Not the `.show` class: in this harness an
  // orchestrated toast's fade-in never completes (bvn 0.45.6 too, so it is
  // not this upgrade), so `.show` is absent from shown toasts as well.
  const visibleToasts = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.toast')).filter(
      (el) => getComputedStyle(el).display !== 'none' && el.getAttribute('role') !== null,
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
  // long-lived page piled up hidden toasts. In this harness an orchestrated
  // toast emits `hide` but never `hidden` (its leave transition never
  // completes, bvn 0.45.6 too), so these tests deliver the `hidden` event
  // the orchestrator would, through the handler on the store item. The
  // docs demo pins the real path in a browser.
  const hideThroughStore = async (
    toastApi: ReturnType<typeof useToast>,
    id: string | symbol,
  ) => {
    const props = toastApi.store.value.toast.get(id)!.value.props;
    props.onHidden?.(new BvTriggerableEvent('hidden'));
    await new Promise((resolve) => setTimeout(resolve, 50));
  };

  it('removes a toast from the store once it has hidden', async () => {
    let toastApi: ReturnType<typeof useToast> | undefined;
    let id: string | symbol = '';
    renderWithToast((toast) => {
      toastApi = toast;
      id = toast.create({ body: 'Brief', modelValue: false }).id;
    });
    await flush();
    expect(toastApi!.store.value.toast.size).toBe(1);

    await hideThroughStore(toastApi!, id);

    expect(toastApi!.store.value.toast.size).toBe(0);
  });

  it('keeps a hidden toast when created with { keep: true } (bvn 0.45 option)', async () => {
    let toastApi: ReturnType<typeof useToast> | undefined;
    let id: string | symbol = '';
    renderWithToast((toast) => {
      toastApi = toast;
      id = toast.create({ body: 'Kept', modelValue: false }, { keep: true }).id;
    });
    await flush();

    await hideThroughStore(toastApi!, id);

    expect(toastApi!.store.value.toast.size).toBe(1);
  });

  it("calls the caller's own onHidden as well", async () => {
    const hidden: string[] = [];
    let toastApi: ReturnType<typeof useToast> | undefined;
    let id: string | symbol = '';
    renderWithToast((toast) => {
      toastApi = toast;
      id = toast.create({
        body: 'Brief',
        modelValue: false,
        onHidden: () => hidden.push('caller'),
      }).id;
    });
    await flush();

    await hideThroughStore(toastApi!, id);

    expect(hidden).toEqual(['caller']);
  });

  it('a prevented hidden event keeps the toast', async () => {
    let toastApi: ReturnType<typeof useToast> | undefined;
    let id: string | symbol = '';
    renderWithToast((toast) => {
      toastApi = toast;
      id = toast.create({
        body: 'Stays',
        modelValue: false,
        onHidden: (event) => event.preventDefault(),
      }).id;
    });
    await flush();

    await hideThroughStore(toastApi!, id);

    expect(toastApi!.store.value.toast.size).toBe(1);
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

  it('renders with no variant at all without error', async () => {
    const screen = renderWithToast((toast) => toast.create({ title: 'Plain' }));
    await flush();

    const el = screen.container.querySelector('.toast')!;
    expect(el).not.toBeNull();
  });
});
