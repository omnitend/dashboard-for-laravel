/**
 * The class on <html> that stops the page scrolling behind DXDashboard's open
 * phone menu (styled in theme.scss, below `sm` only).
 */
export const PAGE_SCROLL_LOCK_CLASS = 'dx-dashboard-menu-open';

// Every owner currently holding the lock. Several dashboards can share a page,
// so one releasing (closing, unmounting, a <KeepAlive> deactivation) must not
// unlock the page while another's menu is still open.
const lockOwners = new Set<object>();

const syncRootClass = (): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(PAGE_SCROLL_LOCK_CLASS, lockOwners.size > 0);
};

/** Hold the page scroll lock for `owner`. Idempotent. */
export const acquirePageScrollLock = (owner: object): void => {
  lockOwners.add(owner);
  syncRootClass();
};

/** Release `owner`'s hold; the page unlocks once no owner holds it. Idempotent. */
export const releasePageScrollLock = (owner: object): void => {
  if (!lockOwners.delete(owner)) return;
  syncRootClass();
};
