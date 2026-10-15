/*
 * DXStatCard's value fit (internal, not exported from the package).
 *
 * Fit to content (#213): a numeric value is 1.75rem unless it would overflow
 * its box, and then the largest size (to 0.25px) at which it fits, down to
 * the 1.125rem floor.
 *
 * Measure and check: every candidate size is applied and the value's real
 * rendered width compared with the box. Nothing assumes the width is
 * proportional to the font size, because it is not: Linux Chromium rounds
 * glyph advances per size, so the width rises in steps of several pixels,
 * and slot content can have fixed-size parts (px padding, a fixed-width
 * marker). The search tries 1.75rem, then the proportional estimate, then
 * halves the remaining interval, always keeping the largest size that fitted
 * and the smallest that did not, so the result fits by construction.
 *
 * Every card due a fit joins one queue, flushed in rounds: write a candidate
 * size on every unfinished card, then read them all (one forced layout per
 * round, not one per card). A short value is done after round one; a long
 * one takes at most MAX_ROUNDS.
 */

/** One card's fit: its elements, and the box width it was last fitted to. */
export interface FitTarget {
  box: HTMLElement;
  value: HTMLElement;
  /** Only numeric values are fitted; text wraps instead. */
  isNumeric: () => boolean;
  /** -1 when the next resize entry must refit whatever its width. */
  fittedBoxWidth: number;
}

const FIT_SIZE_PROPERTY = "--dx-stat-card-fit-size";
const MAX_SIZE_REM = 1.75;
const FLOOR_SIZE_REM = 1.125;
/** The fit's precision: sizes are tried on a 0.25px grid. */
const SIZE_STEP_PX = 0.25;
/** Layout rounding (1/64px) never counts as overflow. */
const FIT_EPSILON_PX = 0.02;
/** 1.75rem, the estimate, then halving 10px down to 0.25px (6 halvings). */
const MAX_ROUNDS = 8;

interface Search {
  target: FitTarget;
  boxWidth: number;
  /** Largest size known to fit (or the floor, which is used regardless). */
  fitting: number;
  /** Smallest size known to overflow. */
  overflowing: number;
  /** The size written this round. */
  candidate: number;
  /** The size the value had before this fit, kept if it cannot be measured. */
  previousSize: string;
  measurable: boolean;
}

const queuedTargets = new Set<FitTarget>();
const registeredTargets = new Set<FitTarget>();
let microtaskQueued = false;
let frameQueued = false;

const snapDown = (size: number): number => Math.floor(size / SIZE_STEP_PX) * SIZE_STEP_PX;

/** The next size to try, strictly between the bounds, or null when settled. */
function nextCandidate(search: Search, estimate: number | null): number | null {
  const low = search.fitting + SIZE_STEP_PX;
  const high = search.overflowing - SIZE_STEP_PX;
  if (low > high + 0.001) return null;
  const ideal = estimate ?? (search.fitting + search.overflowing) / 2;
  return Math.min(high, Math.max(low, snapDown(ideal)));
}

function flushFits(): void {
  microtaskQueued = false;
  frameQueued = false;
  const targets: FitTarget[] = [];
  for (const target of queuedTargets) {
    if (target.value.isConnected) {
      targets.push(target);
    } else {
      // Detached (a deactivated <KeepAlive>): it comes back with a box of
      // the width it left with, which a resize entry would skip, so it
      // forgets that width and refits on return.
      target.fittedBoxWidth = -1;
    }
  }
  queuedTargets.clear();
  if (targets.length === 0) return;

  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const maxSize = MAX_SIZE_REM * rootFontSize;
  const floorSize = FLOOR_SIZE_REM * rootFontSize;

  // Round one: every numeric value at 1.75rem, laid out at its natural
  // width (the box is inline-size contained, so this never changes the
  // box's own width).
  let searches: Search[] = [];
  for (const target of targets) {
    if (!target.isNumeric()) {
      target.value.style.removeProperty(FIT_SIZE_PROPERTY);
      target.fittedBoxWidth = -1;
      continue;
    }
    const previousSize = target.value.style.getPropertyValue(FIT_SIZE_PROPERTY);
    target.value.style.width = "max-content";
    target.value.style.setProperty(FIT_SIZE_PROPERTY, `${maxSize}px`);
    searches.push({
      target,
      boxWidth: 0,
      fitting: floorSize,
      overflowing: maxSize,
      candidate: maxSize,
      previousSize,
      measurable: true,
    });
  }
  const allSearches = searches;

  for (let round = 0; round < MAX_ROUNDS && searches.length > 0; round += 1) {
    // Read every card (one layout; the boxes too in round one) ...
    const widths = searches.map((search) => {
      if (round === 0) search.boxWidth = search.target.box.getBoundingClientRect().width;
      return search.target.value.getBoundingClientRect().width;
    });
    const unfinished: Search[] = [];
    searches.forEach((search, index) => {
      const naturalWidth = widths[index]!;
      if (round === 0) {
        // In layout px, as the ResizeObserver reports it: `boxWidth` is in
        // transformed px, which differ under a `transform: scale()` ancestor
        // and made every fit's own height change read as a new width. The
        // box has no padding or border, so its computed width is its content
        // width.
        search.target.fittedBoxWidth = parseFloat(getComputedStyle(search.target.box).width);
        // Hidden (display: none) or empty: nothing to fit until it shows.
        if (search.boxWidth <= 0 || naturalWidth <= 0) {
          search.measurable = false;
          return;
        }
      }
      if (naturalWidth <= search.boxWidth + FIT_EPSILON_PX) search.fitting = search.candidate;
      else search.overflowing = search.candidate;
      if (search.fitting >= maxSize) return;
      // ... then write the next candidate on each one still searching.
      // The proportional estimate first: exact where the width scales
      // with the size (macOS), a good first split where it does not.
      const estimate = round === 0 ? (maxSize * search.boxWidth) / naturalWidth : null;
      const candidate = nextCandidate(search, estimate);
      if (candidate === null) return;
      search.candidate = candidate;
      search.target.value.style.setProperty(FIT_SIZE_PROPERTY, `${candidate}px`);
      unfinished.push(search);
    });
    searches = unfinished;
  }

  for (const search of allSearches) {
    const { value } = search.target;
    const size = search.measurable ? `${search.fitting}px` : search.previousSize;
    if (size) value.style.setProperty(FIT_SIZE_PROPERTY, size);
    else value.style.removeProperty(FIT_SIZE_PROPERTY);
    value.style.removeProperty("width");
  }
}

/**
 * Queue a fit. "microtask" runs before the next paint, for mounts, content
 * changes, reactivation and font loads. "frame" is for ResizeObserver
 * callbacks: a fit inside the observer's delivery (microtasks run there
 * too) changes the box's HEIGHT, which the browser reports as a
 * "ResizeObserver loop" error, so a resize refits in the next frame.
 */
export function queueFit(target: FitTarget, timing: "microtask" | "frame"): void {
  queuedTargets.add(target);
  if (timing === "microtask") {
    if (microtaskQueued) return;
    microtaskQueued = true;
    queueMicrotask(() => {
      if (microtaskQueued) flushFits();
    });
    return;
  }
  if (frameQueued || microtaskQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => {
    if (frameQueued) flushFits();
  });
}

// Web fonts (the figures face, the body face) swap in after first paint and
// change the value's width without changing the box's, so each finished
// batch of font loads refits every mounted card. One listener serves all
// cards; it is attached at the first registration, so a load already under
// way then still ends in a `loadingdone` it hears.
function refitAll(): void {
  for (const target of registeredTargets) queueFit(target, "microtask");
}

export function registerTarget(target: FitTarget): void {
  registeredTargets.add(target);
  if (registeredTargets.size > 1 || typeof document === "undefined" || !document.fonts) return;
  document.fonts.addEventListener("loadingdone", refitAll);
}

export function unregisterTarget(target: FitTarget): void {
  registeredTargets.delete(target);
  queuedTargets.delete(target);
  if (registeredTargets.size > 0 || typeof document === "undefined" || !document.fonts) return;
  document.fonts.removeEventListener("loadingdone", refitAll);
}
