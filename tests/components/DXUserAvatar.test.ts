import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXUserAvatar from '../../resources/js/components/extended/DXUserAvatar.vue';
import { sampleUser } from '../fixtures/navigationData';

describe('DXUserAvatar', () => {
  it('renders the initial of the user name', async () => {
    const screen = render(DXUserAvatar, { props: { user: sampleUser } });

    const disc = screen.container.querySelector('.user-avatar');
    expect(disc).toBeTruthy();
    expect(disc?.textContent?.trim()).toBe('J'); // First letter of "John"
  });

  it('prefers an explicit initial over the one derived from the user', async () => {
    const screen = render(DXUserAvatar, {
      props: { user: sampleUser, initial: 'JS' },
    });

    expect(screen.container.querySelector('.user-avatar')?.textContent?.trim()).toBe('JS');
  });

  it('renders an empty disc when there is no user', async () => {
    const screen = render(DXUserAvatar, { props: { user: null } });

    const disc = screen.container.querySelector('.user-avatar');
    expect(disc).toBeTruthy();
    expect(disc?.textContent?.trim()).toBe('');
  });

  it('renders no badge by default', async () => {
    const screen = render(DXUserAvatar, { props: { user: sampleUser } });

    expect(screen.container.querySelector('.dx-user-avatar__badge')).toBeNull();
  });

  it('renders the notification badge with accessible text when enabled', async () => {
    const screen = render(DXUserAvatar, {
      props: { user: sampleUser, badge: true, badgeLabel: '3 unread updates' },
    });

    const badge = screen.container.querySelector('.dx-user-avatar__badge');
    expect(badge).toBeTruthy();
    // A colour-only dot is invisible to a screen reader — the label carries it.
    expect(badge?.querySelector('.visually-hidden')?.textContent).toBe('3 unread updates');
  });

  it('colours the badge by variant', async () => {
    const screen = render(DXUserAvatar, {
      props: { user: sampleUser, badge: true, badgeVariant: 'success' },
    });

    const badge = screen.container.querySelector('.dx-user-avatar__badge');
    expect(badge?.classList.contains('bg-success')).toBe(true);
  });

  /**
   * The whole reason the component exists (#98): the navbar's `user-icon` slot
   * is one consumers decorate rather than replace, and the navbar's styles are
   * scoped — so slot content could never reuse them. The avatar's own scope-id
   * has to land on the disc for an override to stay on theme.
   */
  it('carries its own scope-id onto the disc, so slot overrides keep the styling', async () => {
    const screen = render(DXUserAvatar, { props: { user: sampleUser } });

    const disc = screen.container.querySelector('.user-avatar') as HTMLElement;
    const scopeAttr = Array.from(disc.attributes).find((attr) =>
      attr.name.startsWith('data-v-'),
    );
    expect(scopeAttr).toBeTruthy();

    // And the styling actually applies (not just the class name).
    const styles = getComputedStyle(disc);
    expect(styles.borderRadius).toBe('50%');
    expect(styles.width).toBe('32px');
  });
});
