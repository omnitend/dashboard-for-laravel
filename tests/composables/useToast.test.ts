import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
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

  it('renders with no variant at all without error', async () => {
    const screen = renderWithToast((toast) => toast.create({ title: 'Plain' }));
    await flush();

    const el = screen.container.querySelector('.toast')!;
    expect(el).not.toBeNull();
  });
});
