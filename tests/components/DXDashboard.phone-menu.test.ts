/**
 * The phone menu's edges, beyond the basics in DXDashboard.phone.test.ts:
 * server rendering and hydration, a standalone DXDashboardSidebar, keyboard
 * focus, <KeepAlive>, several dashboards on one page, a custom `sm`
 * breakpoint, and links outside the sidebar's <nav>.
 *
 * NOTE: the phone rules live in theme.scss and reach the tests through the
 * BUILT dist/style.css (tests/setup.ts): `npm run build:lib` first.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { createSSRApp, createApp, defineComponent, h, KeepAlive, ref, nextTick, type App } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DModal from '../../resources/js/components/base/DModal.vue';
import { renderToString } from 'vue/server-renderer';
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';
import { sampleNavigation } from '../fixtures/navigationData';

const STORAGE_KEY = 'dx-dashboard-phone-menu-test';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };
const MENU_OPEN_CLASS = 'dx-dashboard-menu-open';

const settled = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

// Real link clicks would navigate the test frame away. Cancelled at the
// window, after the sidebar's own (bubbling) listener has seen the click.
const cancelNavigation = (event: MouseEvent) => event.preventDefault();

const dashboardProps = (overrides: Record<string, unknown> = {}) => ({
  navigation: sampleNavigation,
  currentUrl: '/dashboard',
  title: 'My App',
  dashboardId: 'phone-menu-test',
  storageKey: STORAGE_KEY,
  ...overrides,
});

const sidebarOf = (root: ParentNode) => root.querySelector('.dashboard-sidebar') as HTMLElement;
const isDisplayed = (element: HTMLElement) => getComputedStyle(element).display !== 'none';
const navbarToggle = (root: ParentNode) =>
  root.querySelector('.dashboard-navbar button[aria-label="Toggle sidebar"]') as HTMLElement;
const lockHeld = () => document.documentElement.classList.contains(MENU_OPEN_CLASS);

beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
  localStorage.removeItem(STORAGE_KEY);
  window.addEventListener('click', cancelNavigation);
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  window.removeEventListener('click', cancelNavigation);
  document.documentElement.classList.remove('sidebar-visible', MENU_OPEN_CLASS);
  document.documentElement.style.removeProperty('--dx-dashboard-phone-max-width');
});

describe('server rendering', () => {
  let app: App | null = null;
  let host: HTMLElement | null = null;

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
  });

  it('a scoped dashboard hydrates on a phone with the menu closed, and agrees with its state', async () => {
    // What a server sends: it has no window, so it renders the desktop
    // default with nothing stored (a scoped instance starts visible). Rendered
    // here at a desktop width with empty storage, which takes the same branch.
    await page.viewport(DESKTOP.width, DESKTOP.height);
    const serverHtml = await renderToString(createSSRApp(() => h(DXDashboard, dashboardProps())));
    expect(serverHtml).not.toContain('sidebar-hidden');

    await page.viewport(PHONE.width, PHONE.height);
    host = document.createElement('div');
    host.innerHTML = serverHtml;
    document.body.appendChild(host);

    // Before hydration the server's markup must not paint an open menu.
    expect(isDisplayed(sidebarOf(host))).toBe(false);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dashboard = ref<InstanceType<typeof DXDashboard> | null>(null);
    app = createSSRApp(() => h(DXDashboard, { ...dashboardProps(), ref: dashboard }));
    app.mount(host);
    await nextTick();
    await settled();
    const hydrationWarnings = warn.mock.calls.filter((call) => String(call[0]).includes('Hydration'));
    warn.mockRestore();

    expect(dashboard.value?.sidebarHidden).toBe(true);
    // The state and what is on screen agree.
    expect(isDisplayed(sidebarOf(host))).toBe(!dashboard.value?.sidebarHidden);
    expect(hydrationWarnings).toEqual([]);
    expect(lockHeld()).toBe(false);

    // And it still opens.
    navbarToggle(host).click();
    await settled();
    expect(isDisplayed(sidebarOf(host))).toBe(true);
    expect(Math.round(sidebarOf(host).getBoundingClientRect().width)).toBe(window.innerWidth);
  });
});

describe('a standalone DXDashboardSidebar on a phone', () => {
  it('keeps its rail behaviour and shows no close button it cannot honour', async () => {
    const screen = render(
      defineComponent({
        components: { DXDashboardSidebar },
        setup: () => ({ navigation: sampleNavigation }),
        template: `
          <div class="d-flex">
            <DXDashboardSidebar :navigation="navigation" current-url="/dashboard" />
            <main class="page-probe">Page</main>
          </div>`,
      }),
    );
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();

    const sidebar = sidebarOf(screen.container);
    expect(getComputedStyle(sidebar).position).not.toBe('fixed');
    expect(Math.round(sidebar.getBoundingClientRect().width)).toBeLessThan(window.innerWidth);
    const closeButton = screen.container.querySelector('.sidebar-close') as HTMLElement | null;
    expect(closeButton === null || closeButton.getBoundingClientRect().width === 0).toBe(true);
    expect(lockHeld()).toBe(false);
  });
});

describe('keyboard focus', () => {
  it('moves focus into the open menu, keeps Tab off the page and navbar, and returns it to the toggle on Escape', async () => {
    const screen = render(DXDashboard, {
      props: dashboardProps(),
      slots: { default: '<p>Page</p><button class="page-button">Behind</button>' },
    });
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();

    const toggle = navbarToggle(screen.container);
    const sidebar = sidebarOf(screen.container);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(sidebar.id);

    toggle.focus();
    await userEvent.keyboard('{Enter}');
    await settled();

    expect(isDisplayed(sidebar)).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.contains(document.activeElement)).toBe(true);

    // Tab and Shift+Tab well past the number of focusable things in the
    // menu: focus may leave the document (the browser's own chrome, as with
    // a native modal <dialog>) but never lands on what the menu covers.
    const layout = screen.container.querySelector('.dashboard-layout') as HTMLElement;
    const landedBehindMenu = () =>
      layout.contains(document.activeElement) && !sidebar.contains(document.activeElement);
    const focusableCount = sidebar.querySelectorAll('a[href], button').length;
    expect(focusableCount).toBeGreaterThan(2);
    let reachedSidebarAfterWrap = 0;
    for (let index = 0; index < focusableCount * 2 + 4; index++) {
      await userEvent.keyboard('{Tab}');
      expect(landedBehindMenu()).toBe(false);
      if (sidebar.contains(document.activeElement)) reachedSidebarAfterWrap++;
    }
    for (let index = 0; index < focusableCount * 2 + 4; index++) {
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      expect(landedBehindMenu()).toBe(false);
    }
    // Positive control: Tab really was moving through the menu.
    expect(reachedSidebarAfterWrap).toBeGreaterThan(focusableCount);

    await userEvent.keyboard('{Escape}');
    await settled();
    expect(isDisplayed(sidebar)).toBe(false);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(lockHeld()).toBe(false);
  });

  it('returns focus to the toggle when the close button closes it', async () => {
    const screen = render(DXDashboard, { props: dashboardProps(), slots: { default: '<p>Page</p>' } });
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();

    const toggle = navbarToggle(screen.container);
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    await settled();
    const closeButton = screen.container.querySelector('.sidebar-close') as HTMLElement;
    closeButton.focus();
    await userEvent.keyboard('{Enter}');
    await settled();

    expect(isDisplayed(sidebarOf(screen.container))).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });
});

describe('keyboard focus: what the menu covers', () => {
  it('rejects focus on the page and the navbar while open, and allows it after closing', async () => {
    const screen = render(DXDashboard, {
      props: dashboardProps(),
      slots: { default: '<p>Page</p><button class="page-button">Behind</button>' },
    });
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();
    const pageButton = screen.container.querySelector('.page-button') as HTMLElement;
    const toggle = navbarToggle(screen.container);

    // Positive control: focusable while the menu is closed.
    pageButton.focus();
    expect(document.activeElement).toBe(pageButton);

    toggle.click();
    await settled();
    pageButton.focus();
    expect(document.activeElement).not.toBe(pageButton);
    toggle.focus();
    expect(document.activeElement).not.toBe(toggle);

    await userEvent.keyboard('{Escape}');
    await settled();
    pageButton.focus();
    expect(document.activeElement).toBe(pageButton);
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
  });

  it('does not throw, and leaves no focus in the closed menu, when there is no toggle to return to', async () => {
    const screen = render(DXDashboard, { props: dashboardProps(), slots: { default: '<p>Page</p>' } });
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();
    navbarToggle(screen.container).click();
    await settled();
    const sidebar = sidebarOf(screen.container);
    expect(sidebar.contains(document.activeElement)).toBe(true);

    navbarToggle(screen.container).remove();
    // Vue reports a throwing watcher as a warning (and an error) rather than
    // letting it reach window.onerror.
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    await userEvent.keyboard('{Escape}');
    await settled();
    const reported = [...warn.mock.calls, ...error.mock.calls].map((call) => String(call[0]));
    warn.mockRestore();
    error.mockRestore();

    expect(reported.filter((message) => /Unhandled error|TypeError/.test(message))).toEqual([]);
    expect(isDisplayed(sidebar)).toBe(false);
    expect(sidebar.contains(document.activeElement)).toBe(false);
  });

  it('never focuses a tabindex="-1" link, and keeps Tab off the page', async () => {
    const screen = render(DXDashboard, {
      props: dashboardProps(),
      slots: {
        default: '<p>Page</p><button class="page-button">Behind</button>',
        'sidebar-footer': '<button class="footer-help">Help</button><a href="/skip" tabindex="-1" class="footer-skip">Skip</a>',
      },
    });
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();
    const sidebar = sidebarOf(screen.container);
    const layout = screen.container.querySelector('.dashboard-layout') as HTMLElement;
    const skip = screen.container.querySelector('.footer-skip') as HTMLElement;
    navbarToggle(screen.container).focus();
    await userEvent.keyboard('{Enter}');
    await settled();
    expect(sidebar.contains(document.activeElement)).toBe(true);

    for (const key of ['{Tab}', '{Shift>}{Tab}{/Shift}']) {
      for (let index = 0; index < 16; index++) {
        await userEvent.keyboard(key);
        expect(document.activeElement).not.toBe(skip);
        expect(layout.contains(document.activeElement) && !sidebar.contains(document.activeElement)).toBe(false);
      }
    }
  });

  it('lets a modal opened from the menu move Tab between its own controls', async () => {
    const showModal = ref(false);
    const screen = render(
      defineComponent({
        setup: () => () =>
          h(BApp, null, () => [
            h(DXDashboard, dashboardProps(), {
              default: () => h('p', 'Page'),
              'sidebar-footer': () =>
                h('button', { class: 'open-modal', onClick: () => (showModal.value = true) }, 'Settings'),
            }),
            h(
              DModal,
              { modelValue: showModal.value, 'onUpdate:modelValue': (value: boolean) => (showModal.value = value), title: 'Settings', noFooter: true },
              () => [h('button', { class: 'modal-first' }, 'First'), h('button', { class: 'modal-second' }, 'Second')],
            ),
          ]),
      }),
    );
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();
    navbarToggle(screen.container).click();
    await settled();
    (screen.container.querySelector('.open-modal') as HTMLElement).click();
    await settled();
    const first = await vi.waitFor(() => {
      // (bvn's `.show` class follows a fade transition this harness does not
      // always finish, so wait for the control to be rendered and laid out.)
      const button = document.querySelector('.modal .modal-first') as HTMLElement | null;
      if (!button || button.getClientRects().length === 0) throw new Error('modal not shown');
      return button;
    }, { timeout: 3000 });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const second = document.querySelector('.modal .modal-second') as HTMLElement;

    first.focus();
    expect(document.activeElement).toBe(first);
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(second);
    // The menu is still open underneath.
    expect(isDisplayed(sidebarOf(screen.container))).toBe(true);

    // Escape in the modal is the modal's: the menu stays open beneath it.
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => showModal.value).toBe(false);
    await settled();
    expect(isDisplayed(sidebarOf(screen.container))).toBe(true);
    // Positive control: Escape with focus back in the menu closes it.
    (sidebarOf(screen.container).querySelector('.sidebar-close') as HTMLElement).focus();
    await userEvent.keyboard('{Escape}');
    await settled();
    expect(isDisplayed(sidebarOf(screen.container))).toBe(false);
  });
});

describe('<KeepAlive>', () => {
  it('releases the scroll lock when the dashboard is deactivated', async () => {
    const showDashboard = ref(true);
    const OtherPage = defineComponent({ render: () => h('p', 'Other page') });
    const screen = render(
      defineComponent({
        setup: () => () =>
          h(KeepAlive, null, [
            showDashboard.value
              ? h(DXDashboard, { ...dashboardProps(), key: 'dashboard' }, { default: () => h('p', 'Page') })
              : h(OtherPage, { key: 'other' }),
          ]),
      }),
    );
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();

    navbarToggle(screen.container).click();
    await settled();
    expect(lockHeld()).toBe(true);

    showDashboard.value = false;
    await expect.element(screen.getByText('Other page')).toBeInTheDocument();
    await settled();
    expect(lockHeld()).toBe(false);
    expect(getComputedStyle(document.body).overflow).not.toBe('hidden');

    // Back again: closed, nothing inert, the page focusable.
    showDashboard.value = true;
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();
    expect(isDisplayed(sidebarOf(screen.container))).toBe(false);
    expect(screen.container.querySelector('[inert]')).toBeNull();
    const toggle = navbarToggle(screen.container);
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
  });
});

describe('several dashboards on one page', () => {
  it('keeps the scroll lock while any one menu is open', async () => {
    const first = render(DXDashboard, {
      props: dashboardProps({ dashboardId: 'first' }),
      slots: { default: '<p>First</p>' },
    });
    await expect.element(first.getByText('First')).toBeInTheDocument();
    await settled();
    navbarToggle(first.container).click();
    await settled();
    expect(lockHeld()).toBe(true);

    // A second, closed dashboard mounts and then unmounts.
    const host = document.createElement('div');
    document.body.appendChild(host);
    const second = createApp(() =>
      h(DXDashboard, dashboardProps({ dashboardId: 'second' }), { default: () => h('p', 'Second') }),
    );
    second.mount(host);
    await settled();
    expect(lockHeld()).toBe(true);
    second.unmount();
    host.remove();
    await settled();
    expect(lockHeld()).toBe(true);

    // Positive control: closing the open one releases it.
    await userEvent.keyboard('{Escape}');
    await settled();
    expect(lockHeld()).toBe(false);
  });
});

describe('two open menus', () => {
  it('keeps the scroll lock until the last open menu releases it', async () => {
    const mountOne = async (id: string) => {
      const screen = render(DXDashboard, {
        props: dashboardProps({ dashboardId: id }),
        slots: { default: `<p>${id}</p>` },
      });
      await expect.element(screen.getByText(id)).toBeInTheDocument();
      await settled();
      navbarToggle(screen.container).click();
      await settled();
      expect(isDisplayed(sidebarOf(screen.container))).toBe(true);
      return screen;
    };
    const first = await mountOne('first-open');
    const second = await mountOne('second-open');
    expect(lockHeld()).toBe(true);

    // Close one: the other still holds it.
    (first.container.querySelector('.sidebar-close') as HTMLElement).click();
    await settled();
    expect(isDisplayed(sidebarOf(first.container))).toBe(false);
    expect(lockHeld()).toBe(true);

    // Reopen it, then unmount the other: still held.
    navbarToggle(first.container).click();
    await settled();
    second.unmount();
    await settled();
    expect(lockHeld()).toBe(true);

    // The survivor releases it.
    (first.container.querySelector('.sidebar-close') as HTMLElement).click();
    await settled();
    expect(lockHeld()).toBe(false);
  });
});

describe('a custom sm breakpoint', () => {
  it('the default theme publishes the phone width the JS reads', () => {
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--dx-dashboard-phone-max-width').trim(),
    ).toBe('575.98px');
  });

  it('follows the width the theme publishes, not a hard-coded 576px', async () => {
    // A theme compiled with `sm: 700px` publishes 699.98px.
    document.documentElement.style.setProperty('--dx-dashboard-phone-max-width', '699.98px');
    await page.viewport(640, 844);
    localStorage.setItem(STORAGE_KEY, 'false');

    const screen = render(DXDashboard, { props: dashboardProps(), slots: { default: '<p>Page</p>' } });
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();

    // Phone behaviour: closed whatever is stored, and Escape closes it.
    expect(sidebarOf(screen.container).classList.contains('sidebar-hidden')).toBe(true);
    navbarToggle(screen.container).click();
    await settled();
    expect(lockHeld()).toBe(true);
    await userEvent.keyboard('{Escape}');
    await settled();
    expect(sidebarOf(screen.container).classList.contains('sidebar-hidden')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
  });
});

describe('a breakpoint that arrives after mount', () => {
  it('re-reads the published width when it next decides, so close and Escape work', async () => {
    await page.viewport(640, 844);
    localStorage.setItem(STORAGE_KEY, 'false');
    const screen = render(DXDashboard, { props: dashboardProps(), slots: { default: '<p>Page</p>' } });
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();
    // Desktop so far (the 575.98px fallback): the stored preference shows it.
    expect(sidebarOf(screen.container).classList.contains('sidebar-hidden')).toBe(false);

    // The theme's stylesheet (compiled with sm: 700px) arrives late.
    document.documentElement.style.setProperty('--dx-dashboard-phone-max-width', '699.98px');
    await userEvent.keyboard('{Escape}');
    await settled();
    expect(sidebarOf(screen.container).classList.contains('sidebar-hidden')).toBe(true);
    // A phone close is not a desktop preference.
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
  });
});

describe('links outside the <nav>', () => {
  const mountWithSlots = async () => {
    const screen = render(DXDashboard, {
      props: dashboardProps(),
      slots: {
        default: '<p>Page</p>',
        'sidebar-brand': '<a href="/home" class="brand-link">Home</a>',
        'sidebar-footer': '<a href="/help" class="footer-link">Help</a>',
      },
    });
    await expect.element(screen.getByText('Page')).toBeInTheDocument();
    await settled();
    navbarToggle(screen.container).click();
    await settled();
    expect(isDisplayed(sidebarOf(screen.container))).toBe(true);
    return screen;
  };

  it('closes the menu for a footer link', async () => {
    const screen = await mountWithSlots();
    await userEvent.click(screen.getByRole('link', { name: 'Help' }));
    await settled();
    expect(isDisplayed(sidebarOf(screen.container))).toBe(false);
    expect(lockHeld()).toBe(false);
  });

  it('closes the menu for a brand link', async () => {
    const screen = await mountWithSlots();
    await userEvent.click(screen.getByRole('link', { name: 'Home' }));
    await settled();
    expect(isDisplayed(sidebarOf(screen.container))).toBe(false);
  });

  it('positive control: a nav link closes it too', async () => {
    const screen = await mountWithSlots();
    await userEvent.click(screen.getByRole('link', { name: 'Customers' }));
    await settled();
    expect(isDisplayed(sidebarOf(screen.container))).toBe(false);
  });
});
