import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { nextTick } from "vue";
import DXLoading from "../../resources/js/components/extended/DXLoading.vue";
import builtCss from "../../dist/style.css?raw";

/** Parsed sRGB channels of a computed colour, for comparison. */
const channels = (colour: string) => colour.match(/[\d.]+/g)!.slice(0, 3).map(Number);

describe("DXLoading", () => {
  it("shows an accessible spinner and custom label after the delay", async () => {
    const screen = render(DXLoading, {
      props: { text: "Loading web shops…", delay: 30 },
    });

    expect(screen.container.querySelector('[role="status"]')).toBeNull();
    await expect.poll(() => screen.container.querySelector('[role="status"]')).not.toBeNull();

    const status = screen.container.querySelector('[role="status"]');
    expect(status?.textContent).toContain("Loading web shops…");
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

  // The soft look, modelled on Omni Tend's legacy loader: it waits 600 ms,
  // fades in, and sits on one line in grey rather than a navy spinner.
  describe("the soft look", () => {
    it("waits 600 ms by default", async () => {
      const screen = render(DXLoading);
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(screen.container.querySelector('[role="status"]')).toBeNull();
      await expect
        .poll(() => screen.container.querySelector('[role="status"]'), { timeout: 1000 })
        .not.toBeNull();
    });

    it("puts a small grey spinner beside grey display-face text", async () => {
      const screen = render(DXLoading, { props: { delay: 0, text: "Loading product…" } });
      await nextTick();
      const status = screen.container.querySelector<HTMLElement>(".dx-loading")!;
      const spinner = status.querySelector<HTMLElement>(".spinner-border")!;
      const text = status.querySelector<HTMLElement>(".dx-loading__text")!;

      // Small, and beside the text on one line (centres level, spinner first).
      expect(spinner.classList.contains("spinner-border-sm")).toBe(true);
      const spinnerRect = spinner.getBoundingClientRect();
      const textRect = text.getBoundingClientRect();
      expect(spinnerRect.right).toBeLessThanOrEqual(textRect.left);
      const centre = (rect: DOMRect) => rect.top + rect.height / 2;
      expect(Math.abs(centre(spinnerRect) - centre(textRect))).toBeLessThan(2);

      // Grey, not the navy primary: #adb5bd spinner, #6c757d text.
      expect(channels(getComputedStyle(spinner).color)).toEqual([173, 181, 189]);
      expect(channels(getComputedStyle(status).color)).toEqual([108, 117, 125]);
      expect(spinner.classList.contains("text-primary")).toBe(false);

      // A calmer spin than Bootstrap's 0.75 s a turn.
      expect(getComputedStyle(spinner).animationDuration).toBe("1.1s");

      // Display face at h2 size, with the sweep running and the fade-in.
      const textStyle = getComputedStyle(text);
      expect(textStyle.fontFamily).toContain("Poppins");
      expect(textStyle.fontSize).toBe("18.4px");
      expect(textStyle.animationName).toBe("dx-loading-sweep");
      expect(getComputedStyle(status).animationName).toBe("dx-loading-fade-in");
    });

    it("drops the sweep and the fade under reduced motion", () => {
      // The runner cannot emulate the media query, so this reads the built
      // rule: both animations off and the text back to plain colour.
      const block = builtCss.match(
        /@media ?\(prefers-reduced-motion: ?reduce\)\s*\{([^@]*?\.dx-loading[^@]*?)\}\s*\}/,
      );
      expect(block).not.toBeNull();
      expect(block![1]).toMatch(/\.dx-loading,\s*\.dx-loading__text\s*\{\s*animation:\s*none/);
      expect(block![1]).toMatch(/-webkit-text-fill-color:\s*currentColor/);
    });
  });
});
