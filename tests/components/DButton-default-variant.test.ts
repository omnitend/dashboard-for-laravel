import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DButton from '../../resources/js/components/base/DButton.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// B15: DButton's DEFAULT variant is `secondary`, not `primary`. Under the
// soft-first house rule `primary` is THE single emphatic action per
// page/modal, so a variant-less button must be soft (secondary), never the
// solid navy primary. This is a deliberate breaking change (approved).
describe('DButton default variant', () => {
  it('renders the SECONDARY class and NOT primary when no variant is given', async () => {
    const screen = render(DButton, {
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = screen.container.querySelector('button');
    expect(button?.classList.contains('btn-secondary')).toBe(true);
    expect(button?.classList.contains('btn-primary')).toBe(false);
  });

  it('still renders primary when variant="primary" is set explicitly', async () => {
    const screen = render(DButton, {
      props: { variant: 'primary' },
      slots: { default: () => 'Save' },
    });
    await flush();
    const button = screen.container.querySelector('button');
    expect(button?.classList.contains('btn-primary')).toBe(true);
    expect(button?.classList.contains('btn-secondary')).toBe(false);
  });

  it('renders secondary when variant="secondary" is set explicitly', async () => {
    const screen = render(DButton, {
      props: { variant: 'secondary' },
      slots: { default: () => 'Cancel' },
    });
    await flush();
    const button = screen.container.querySelector('button');
    expect(button?.classList.contains('btn-secondary')).toBe(true);
    expect(button?.classList.contains('btn-primary')).toBe(false);
  });

  it('applies no variant class when variant is null', async () => {
    const screen = render(DButton, {
      props: { variant: null },
      slots: { default: () => 'Bare' },
    });
    await flush();
    const button = screen.container.querySelector('button');
    // `null` means "no variant class" — neither the new default nor primary.
    expect(button?.classList.contains('btn-secondary')).toBe(false);
    expect(button?.classList.contains('btn-primary')).toBe(false);
  });
});
