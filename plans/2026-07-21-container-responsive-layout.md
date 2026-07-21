# DXForm / DXTable — container-based responsive layout (B8)

Status: **PARTIALLY DONE 2026-07-21** — the composable and the `DXForm` half
shipped; the `DXTable` stacked-card half is **DEFERRED** (see below). Origin:
the consuming app's cutover — the product detail page and the editable
product-lines table, narrowed by the app sidebar (not the viewport).

## What shipped

- **`resources/js/composables/useContainerWidth.ts`** — a `ResizeObserver`
  composable, exported from the package index with its types
  (`ContainerWidthTarget`, `UseContainerWidthOptions`,
  `UseContainerWidthReturn`). Takes an element ref *or* a getter (a getter
  returning `null` observes nothing, which is how a component makes the
  observation conditional). Returns `containerRef`, `width`, `hasMeasured`,
  `isBelow`, `isNarrowerThan(px)`, `stop()`. Options: `threshold` (a number or a
  getter, so it can change at runtime), `hysteresis`, `initialWidth`, `box`,
  `debounce`.
  - SSR-safe: with no `ResizeObserver` the width stays at `initialWidth` (`0`),
    so `isBelow` is `true` — "assume the narrowest until measured". The stacked
    layout is legible at any width, and the server-rendered markup matches the
    first client render.
  - Observer disconnected on scope dispose; re-observes when the target ref
    changes; publishes at whole-pixel resolution and skips no-ops.
- **`DXForm`**: new `layout="auto"` plus `layoutThreshold` (default **640**).
  `vertical` (still the default) and `horizontal` keep their exact unconditional
  meaning — the observer is only attached in `auto` mode, so existing consumers
  pay nothing and render identically. Per-field `field.layout` overrides and
  `span: true` are unaffected.
  - 640 was measured, not guessed: at `labelCols: 3` the label's text area is
    `containerWidth / 4 - 18` px, so 640 gives 142px — enough for
    "Unit price (ex VAT)" (128px at the theme's label font) to stay on one line,
    with a 474px control column. Below ~584px that label wraps.
  - The crossing carries a 24px hysteresis band, because the stacked layout is
    taller: a form in an `overflow:auto` ancestor can gain a scrollbar when it
    stacks, lose ~15-17px of container, and flip back — forever. 24 > any
    scrollbar.
- **`tests/components/DXForm-ContainerLayout.test.ts`** — drives a wrapper's
  width across the threshold and asserts both the `dx-form--horizontal` class
  *and* the label/control geometry (`getBoundingClientRect()`: same row vs
  stacked), asserts the **viewport never changes** (so a pass cannot be a media
  query firing), and awaits real `ResizeObserver` deliveries rather than
  sleeping. Every assertion was watched fail against four deliberately broken
  variants first.
- Docs: `docs/src/pages/components/extended/DXForm.mdx` (props + a
  "Container-driven layout" section) and a `useContainerWidth` section in
  `docs/src/pages/guide/forms.md`.

## DXTable half — DEFERRED

`DXTable.vue` was being rewritten in parallel, so the stack-on-narrow /
card-per-row mode was left out rather than conflict with it. Nothing about the
composable blocks it. Adoption needs: a `stackedBelow`-style prop on `DXTable`
(threshold, off by default), the observer attached to `DXTableShell`'s root
rather than the `<DTable>` (the shell owns the width; the table can overflow
it), a card-per-row render alongside `tableModeBindings` that reuses the same
per-cell slot forwarding so custom `cell(<key>)` slots keep working in card
mode, and `DXTablePagination` unaffected. `hasMeasured` is there so the table
can avoid rendering rows twice on first paint.

## Problem

dfl's responsiveness is **viewport-based**: `DXForm`'s `labelCols` horizontal
grid and `DXTable`'s breakpoints are Bootstrap media queries, which only see the
**window** width. But an app-next page is narrowed by the persistent **sidebar**,
not the window — so on a laptop with the sidebar open, a horizontal form or a wide
table has little room yet dfl still renders the full-width horizontal layout,
cramping the label/input split and truncating inputs. The media query never fires
because the viewport is wide; only the *container* is narrow.

This is the classic media-query vs container-query gap. Legacy omnitend's
lt-ajax-form used a `ResizeObserver` to switch layout on the element's own width;
that was dropped in the cutover and the consuming app re-added it as a shared composable.

## Ask

Give `DXForm` (and ideally `DXTable`) a **container-based** responsive mode driven
by the component's own rendered width (a `ResizeObserver`, or CSS container
queries where support allows), not the viewport:

- **DXForm**: a `layout="auto"` (or `prefer-layout="horizontal"`) that renders
  horizontal when the form's container is wide enough and **stacks to vertical**
  below a container-width threshold (configurable, default ~a comfortable
  label+input width). Today `layout="horizontal"` is unconditional.
- **DXTable**: a stack-on-narrow / card-per-row mode when the table's container
  is below a threshold, instead of horizontal scroll only.

## Consuming-app reference implementation (retire on adoption)

`resources/js/lib-next/useContainerWidth.js` — a `ResizeObserver` composable that
reports the element's width and a boolean threshold crossing. It currently drives
three things, all of which this feature would fold upstream:

1. `OtForm` — horizontal → vertical when the form container is narrow.
2. `ot-product-product-lines` — the editable line table → stacked cards below
   576px.
3. `ot-sales` — column collapse (date/total folded into the sale-lines cell).

Happy to share the composable source. The core is: observe the root element's
`contentRect.width`, expose it reactively, and let the template pick the layout —
so consumers don't each hand-roll a `ResizeObserver`.

## Notes

- Container queries (`@container`) would cover the pure-CSS cases (label grid),
  but the table→cards transform needs a JS width signal anyway, so a
  `ResizeObserver`-backed composable exposed to the template is the more general
  primitive.
- This also subsumes part of the editor-modal story: a modal DXForm is
  container-narrow on small screens even when the viewport is wide.
