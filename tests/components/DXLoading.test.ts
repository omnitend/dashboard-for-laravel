import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { nextTick } from "vue";
import DXLoading from "../../resources/js/components/extended/DXLoading.vue";

describe("DXLoading", () => {
  it("shows an accessible, centered spinner and custom label after the delay", async () => {
    const screen = render(DXLoading, {
      props: { text: "Loading web shops…", delay: 30 },
    });

    expect(screen.container.querySelector('[role="status"]')).toBeNull();
    await expect.poll(() => screen.container.querySelector('[role="status"]')).not.toBeNull();

    const status = screen.container.querySelector('[role="status"]');
    expect(status?.textContent).toContain("Loading web shops…");
    expect(status?.classList.contains("text-center")).toBe(true);
    expect(status?.querySelector('.spinner-border[aria-hidden="true"]')).toBeTruthy();
  });

  it("can show immediately", async () => {
    const screen = render(DXLoading, { props: { delay: 0 } });
    await nextTick();

    expect(screen.container.querySelector('[role="status"]')?.textContent).toContain(
      "Loading…",
    );
  });

  it("does not show a spinner for a load completed before the delay", async () => {
    const scheduledTimers = vi.spyOn(globalThis, "setTimeout");
    const clearedTimers = vi.spyOn(globalThis, "clearTimeout");

    try {
      const screen = render(DXLoading, { props: { delay: 10_000 } });
      const timerIndex = scheduledTimers.mock.calls.findIndex(([, delay]) => delay === 10_000);
      expect(timerIndex).toBeGreaterThanOrEqual(0);

      const loaderTimer = scheduledTimers.mock.results[timerIndex].value;
      screen.unmount();
      expect(clearedTimers).toHaveBeenCalledWith(loaderTimer);
    } finally {
      scheduledTimers.mockRestore();
      clearedTimers.mockRestore();
    }
  });
});
