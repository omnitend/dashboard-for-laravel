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

      .card (overflow: hidden)
      ├─ .card-header          (padded by Bootstrap's card-cap padding)
      ├─ .table-responsive     ← FLUSH
      │   └─ table
      └─ .dx-table-pagination  (pads itself — see DXTablePagination.vue)

  Bootstrap 5 has no `.card > .table` rounding rules (that was BS4), so the
  clipping is done with `overflow: hidden` on the card: the flush table's square
  top corners then follow the card's radius whether or not a header is present.
  bvn's popups position `fixed` by default, so they are not clipped by it.
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
  Clip the card to its radius so the flush table's square corners follow the
  border. Kept in this global block with the rest of the card-mode layout: a
  scoped rule WOULD reach DCard's root (the renderer walks the component-root
  chain), but that forwarding is the exact thing CLAUDE.md records as unreliable
  across build pipelines, and a silently-unclipped card is invisible in review.
  The lower specificity also leaves consumers free to override it.

  KNOWN LIMITATION (#166): this clips the WHOLE card, so a consumer's own
  non-teleported `position: absolute` overlay in a slot is cut off at the card
  edge. dfl's own components are fine — DDropdown teleports to <body>, the
  filter menus are `fixed` — so the residual case is a hand-rolled popover.
  The fix is to move the radius clipping onto the flush table region, which
  `.table-responsive`'s `overflow-x: auto` complicates; see the issue.
*/
.dx-table-card {
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
