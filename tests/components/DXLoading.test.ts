import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { cdp } from "vitest/browser";
import { defineComponent, h } from "vue";
import DXLoading from "../../resources/js/components/extended/DXLoading.vue";

/** Parsed sRGB channels of a computed colour, for comparison. */
const channels = (colour: string) => colour.match(/[\d.]+/g)!.slice(0, 3).map(Number);

const statusOf = (container: Element) =>
  container.querySelector<HTMLElement>('.dx-loading[role="status"]');

/** Whether the loader's contents are revealed (visible, so in the a11y tree). */
const contentsShown = (status: HTMLElement) =>
  getComputedStyle(status.querySelector(".dx-loading__text")!).visibility === "visible";

const waitUntilShown = (status: HTMLElement) =>
  expect.poll(() => contentsShown(status), { timeout: 2000 }).toBe(true);

describe("DXLoading", () => {
  it("is a status box from the start, revealing its spinner and label after the delay", async () => {
    const screen = render(DXLoading, {
      props: { text: "Loading web shops…", delay: 30 },
    });

    // The live region is in the page at once, its contents hidden: content
    // added to a region already there is announced (#209 review).
    const status = statusOf(screen.container)!;
    expect(status).not.toBeNull();
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(contentsShown(status)).toBe(false);

    await waitUntilShown(status);
    expect(status.textContent).toContain("Loading web shops…");
    expect(status.querySelector('.spinner-border[aria-hidden="true"]')).toBeTruthy();
  });

  it("with no delay, still reveals its contents a task after the box", async () => {
    const screen = render(DXLoading, { props: { delay: 0 } });
    const status = statusOf(screen.container)!;
    expect(contentsShown(status)).toBe(false);
    await waitUntilShown(status);
    expect(status.textContent).toContain("Loading…");
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
      const status = statusOf(screen.container)!;
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(contentsShown(status)).toBe(false);
      await waitUntilShown(status);
    });

    it("holds its space while hidden, so nothing moves when it appears", async () => {
      const screen = render(DXLoading, { props: { delay: 100 } });
      const status = statusOf(screen.container)!;
      const hiddenHeight = status.getBoundingClientRect().height;
      // Positive control: the held space is the loader's, not just padding.
      expect(hiddenHeight).toBeGreaterThan(96 + 20);
      await waitUntilShown(status);
      expect(status.getBoundingClientRect().height).toBe(hiddenHeight);
    });

    it("puts a small grey spinner beside grey display-face text", async () => {
      const screen = render(DXLoading, { props: { delay: 0, text: "Loading product…" } });
      const status = statusOf(screen.container)!;
      await waitUntilShown(status);
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

    it("takes the light colours back inside a light section of a dark page", async () => {
      const Scoped = defineComponent(() => () =>
        h("div", { "data-bs-theme": "dark" }, [
          h("div", [h(DXLoading, { delay: 0 })]),
          h("div", { "data-bs-theme": "light" }, [h(DXLoading, { delay: 0 })]),
        ]),
      );
      const screen = render(Scoped);
      const [inDark, inLight] = Array.from(
        screen.container.querySelectorAll<HTMLElement>(".dx-loading"),
      );
      // Positive control: the dark scope does remap (#adb5bd text).
      expect(channels(getComputedStyle(inDark).color)).toEqual([173, 181, 189]);
      expect(channels(getComputedStyle(inLight).color)).toEqual([108, 117, 125]);
    });

    describe("under reduced motion", () => {
      afterEach(async () => {
        await cdp().send("Emulation.setEmulatedMedia", { features: [] });
      });

      it("drops the sweep and the fade, and slows the spinner to double", async () => {
        await cdp().send("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        // Positive control: the emulation took.
        expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);

        const screen = render(DXLoading, { props: { delay: 0 } });
        const status = statusOf(screen.container)!;
        await waitUntilShown(status);
        const text = status.querySelector<HTMLElement>(".dx-loading__text")!;
        const spinner = status.querySelector<HTMLElement>(".spinner-border")!;

        expect(getComputedStyle(status).animationName).toBe("none");
        expect(getComputedStyle(text).animationName).toBe("none");
        // Plain grey text, not a transparent fill over a gradient.
        expect(channels(getComputedStyle(text).webkitTextFillColor)).toEqual([108, 117, 125]);
        expect(getComputedStyle(spinner).animationDuration).toBe("2.2s");
      });
    });
  });
});
