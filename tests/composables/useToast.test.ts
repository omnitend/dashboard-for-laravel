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

  it('renders with no variant at all without error', async () => {
    const screen = renderWithToast((toast) => toast.create({ title: 'Plain' }));
    await flush();

    const el = screen.container.querySelector('.toast')!;
    expect(el).not.toBeNull();
  });
});
