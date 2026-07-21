<!--
  @component
  Internal chrome wrapper for `DXTable`. Renders its content either inside a
  `DCard` (the default) or as a plain, borderless block on the page background
  (`:card="false"`). Extracted so `DXTable`'s ~460-line body and all its slots
  aren't duplicated across a card/plain `v-if`.

  Slots:
  - `#header` — the title / action row. In card mode it fills `DCard`'s header;
    in plain mode it renders above the table with a subtle bottom rule.
  - default — the table body (spinner/error/table/pagination).

  Card mode renders `DCard` in **`no-body`** mode so the table sits FLUSH against
  the card border. With a `.card-body` in between, a striped table's rows were
  inset by `--bs-card-spacer-x` (24px) and left a white gutter between the
  stripes and the border. Without it, DXTable's children — error alert, loading
  block, table, pagination — become direct children of `.card`, which is already
  a `flex-direction: column` container, so they still stack in order:

      .card
      ├─ .card-header          (padded by Bootstrap's card-cap padding)
      ├─ .table-responsive     ← FLUSH, rounded when it is at a card corner
      │   └─ table
      └─ .dx-table-pagination  (pads itself — see DXTablePagination.vue)

  Bootstrap 5 has no `.card > .table` rounding rules (that was BS4), so the
  flush table's square corners have to be rounded here. The rounding is applied
  to the TABLE REGION, never to the card: clipping the whole card would cut off
  any non-teleported positioned content a consumer puts in a slot (#166).
-->
<template>
  <DCard v-if="card" no-body class="dx-table-card">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <slot />
  </DCard>

  <div v-else class="dx-table-plain">
    <div v-if="$slots.header" class="dx-table-plain__header">
      <slot name="header" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import DCard from '../base/DCard.vue';

interface Props {
  /** Wrap the content in a `DCard`. When false, render plain/borderless. */
  card?: boolean;
}

withDefaults(defineProps<Props>(), {
  card: true,
});
</script>

<style scoped>
/*
  Plain variant: no card border/shadow/background — the table sits directly on
  the page. The header row gets a subtle bottom rule so it still reads as a
  distinct band above the table (mirrors the card header's separation without
  the full card chrome).
*/
.dx-table-plain__header {
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--bs-border-color);
}
</style>

<style>
/*
  GLOBAL, not scoped, on purpose: these rules target slot content supplied by
  `DXTable`, which is compiled in *DXTable's* scope. A scoped selector here would
  get this component's `data-v-*` appended to its last compound selector and so
  would match nothing — the same silent-inertness trap documented in CLAUDE.md.
  Every selector is namespaced under `.dx-table-card`, a class only this
  component applies, so nothing leaks into a consumer's own cards.
*/

/*
  Round the flush table region so its square corners follow the card border.

  This used to be `overflow: hidden` on the WHOLE card, which clipped every
  non-teleported positioned descendant — including a consumer's own
  `position: absolute` popover in a `#header` or `cell(<key>)` slot (#166).
  The clip now sits on the table region itself, and only on the corners the
  region actually occupies: `.card-header` and `.dx-table-pagination` round the
  corners themselves when they are present, so the radius is applied via
  `:first-child` / `:last-child` rather than unconditionally. Vue renders a
  false `v-if` as a comment node, which `:first-child` ignores, so the error
  alert and spinner branches don't disturb the match.

  These rules stay in this global block with the rest of the card-mode layout: a
  scoped rule WOULD reach DCard's root (the renderer walks the component-root
  chain), but that forwarding is the exact thing CLAUDE.md records as unreliable
  across build pipelines, and a silently-unclipped card is invisible in review.
  The lower specificity also leaves consumers free to override it.
*/
.dx-table-card > .table-responsive:first-child,
.dx-table-card > .table:first-child {
  border-top-left-radius: var(--bs-card-inner-border-radius);
  border-top-right-radius: var(--bs-card-inner-border-radius);
}

.dx-table-card > .table-responsive:last-child,
.dx-table-card > .table:last-child {
  border-bottom-left-radius: var(--bs-card-inner-border-radius);
  border-bottom-right-radius: var(--bs-card-inner-border-radius);
}

/*
  `.table-responsive` needs NO `overflow` of its own: Bootstrap already gives it
  `overflow-x: auto`, which computes `overflow-y` to `auto` as well, so it is
  already a clipping context and the radius above rounds that clip. Measured in
  a real browser (see DXTable-CardFlush.test.ts): without the radius a hit-test
  3px inside the card's corner lands on a `<th>`; with it, on the card.
  Do NOT add `overflow: hidden` here — it would kill the horizontal scrolling
  that makes a wide table usable, and the flush look would survive to hide it.

  A bare `<table>` (`:responsive="false"`) is a different story: it is not a
  clipping context, and `border-radius` on it leaves the collapsed-border cell
  backgrounds square (measured — the corner still hit-tests to a `<th>`). That
  one needs an explicit clip, scoped to the flush table so it is the table
  region and not the card that clips. Note this restores the pre-0.35 behaviour
  where a `:responsive="false"` table too wide for its card overflows visibly
  rather than being silently cut off — that mode opts out of a scroll container
  by definition.
*/
.dx-table-card > .table:first-child,
.dx-table-card > .table:last-child {
  overflow: hidden;
}

/*
  The error alert is a full-width child of the card now that there is no
  `.card-body`. Give it back the inset the card body used to provide, so it
  doesn't bleed into the card's rounded corners.
*/
.dx-table-card > .alert {
  margin: var(--bs-card-spacer-y) var(--bs-card-spacer-x);
}

/*
  Nothing may leave a trailing margin at the bottom of the card. bvn already
  zeroes `.table-responsive > .table`, but the responsive wrapper itself carries
  `margin-bottom: 1rem` (and an un-responsive `.table` carries Bootstrap's own),
  which used to be absorbed by the card body and now shows as a white band
  inside the clipped card whenever the table is the last child (no pager). The
  gap ABOVE the pager is unaffected — that margin only drops on the last child.
*/
.dx-table-card > :last-child {
  margin-bottom: 0;
}
</style>
