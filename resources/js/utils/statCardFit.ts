/*
 * DXStatCard's value fit (internal, not exported from the package).
 *
 * Fit to content (#213): a numeric value is 1.75rem unless it would overflow
 * its box, and then just small enough to fit, down to the 1.125rem floor.
 *
 * One measurement suffices: the value's natural (max-content) width scales
 * linearly with its font size (the value has no px letter-spacing or
 * padding; slot content sized in em scales with it), so the fitted size is
 * `current * box / natural`. Slot content with fixed-size parts (px
 * padding) is not linear, which the verify passes below correct.
 *
 * Every card due a fit joins one queue, flushed in phases (write the
 * measuring width on all, read all, write all sizes), so a dashboard of 20
 * cards costs one forced layout per pass, not one per card.
 */

/** One card's fit: its elements, and the box width it was last fitted to. */
export interface FitTarget {
  box: HTMLElement;
  value: HTMLElement;
  /** Only numeric values are fitted; text wraps instead. */
  isNumeric: () => boolean;
  fittedBoxWidth: number;
}

const FIT_SIZE_PROPERTY = "--dx-stat-card-fit-size";
const MAX_SIZE_REM = 1.75;
const FLOOR_SIZE_REM = 1.125;
/** How far past the box (px) a verify pass tolerates before shrinking again. */
const OVERFLOW_TOLERANCE_PX = 0.25;
/** How far short of the box (px) a verify pass tolerates before growing again. */
const UNDERFILL_TOLERANCE_PX = 0.5;
/** One proportional step, plus up to two corrections. */
const MAX_PASSES = 3;

const queuedTargets = new Set<FitTarget>();
const registeredTargets = new Set<FitTarget>();
let microtaskQueued = false;
let frameQueued = false;

function flushFits(): void {
  microtaskQueued = false;
  frameQueued = false;
  const targets = Array.from(queuedTargets).filter((target) => target.value.isConnected);
  queuedTargets.clear();
  if (targets.length === 0) return;

  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const maxSize = MAX_SIZE_REM * rootFontSize;
  const floorSize = FLOOR_SIZE_REM * rootFontSize;

  const numericTargets: FitTarget[] = [];
  for (const target of targets) {
    if (target.isNumeric()) {
      numericTargets.push(target);
    } else {
      target.value.style.removeProperty(FIT_SIZE_PROPERTY);
      target.fittedBoxWidth = -1;
    }
  }
  if (numericTargets.length === 0) return;

  // Write: lay every value out at its natural width. The box is inline-size
  // contained, so this never changes the box's own width.
  for (const target of numericTargets) target.value.style.width = "max-content";

  // Read (one layout), then write the sizes. Later passes revisit only the
  // values that missed the box (slot content with fixed-size parts, which
  // a proportional step under- or overshoots; sub-pixel rounding) and are
  // not already pinned at the cap or the floor in that direction.
  let pending = numericTargets;
  for (let pass = 0; pass < MAX_PASSES && pending.length > 0; pass += 1) {
    const readings = pending.map((target) => ({
      target,
      boxWidth: target.box.getBoundingClientRect().width,
      naturalWidth: target.value.getBoundingClientRect().width,
      fontSize: parseFloat(getComputedStyle(target.value).fontSize),
    }));
    const nextPending: FitTarget[] = [];
    for (const { target, boxWidth, naturalWidth, fontSize } of readings) {
      target.fittedBoxWidth = boxWidth;
      // Hidden (display: none) or empty: nothing to fit until it shows.
      if (boxWidth <= 0 || naturalWidth <= 0 || !(fontSize > 0)) continue;
      if (pass > 0) {
        const overflow = naturalWidth - boxWidth;
        if (overflow <= OVERFLOW_TOLERANCE_PX && overflow >= -UNDERFILL_TOLERANCE_PX) continue;
        if (overflow > 0 && fontSize <= floorSize) continue;
        if (overflow < 0 && fontSize >= maxSize) continue;
      }
      const ideal = (fontSize * boxWidth) / naturalWidth;
      // Rounded down to 1/100px, so rounding never pushes it over the box.
      const size = Math.max(floorSize, Math.min(maxSize, Math.floor(ideal * 100) / 100));
      if (Math.abs(size - fontSize) < 0.01) continue;
      target.value.style.setProperty(FIT_SIZE_PROPERTY, `${size}px`);
      nextPending.push(target);
    }
    pending = nextPending;
  }

  for (const target of numericTargets) target.value.style.removeProperty("width");
}

/**
 * Queue a fit. "microtask" runs before the next paint, for mounts, content
 * changes and font loads. "frame" is for ResizeObserver callbacks: a fit
 * inside the observer's delivery (microtasks run there too) changes the
 * box's HEIGHT, which the browser reports as a "ResizeObserver loop" error,
 * so a resize refits in the next frame.
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
// font load refits every mounted card. One listener serves all cards.
function refitAll(): void {
  for (const target of registeredTargets) queueFit(target, "microtask");
}

export function registerTarget(target: FitTarget): void {
  registeredTargets.add(target);
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts) return;
  if (registeredTargets.size === 1) fonts.addEventListener("loadingdone", refitAll);
  if (fonts.status !== "loaded") void fonts.ready.then(refitAll);
}

export function unregisterTarget(target: FitTarget): void {
  registeredTargets.delete(target);
  queuedTargets.delete(target);
  if (registeredTargets.size > 0 || typeof document === "undefined" || !document.fonts) return;
  document.fonts.removeEventListener("loadingdone", refitAll);
}
