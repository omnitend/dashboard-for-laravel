<!--
  @component
  The circular user avatar shown in the dashboard navbar's user menu: a single
  initial on a solid disc, with an optional notification dot.

  It exists as its own component because `DXDashboardNavbar`'s `user-icon` slot
  is one consumers routinely *decorate* rather than replace — adding an unread
  badge, wrapping it in a link. The navbar's styles are scoped, so slot content
  (compiled in the consumer's scope) can't reuse them; without this component
  every override starts by re-implementing the avatar's CSS, which then drifts
  from the theme. Rendering it here means an override is one line and stays on
  theme.
-->
<template>
  <div class="dx-user-avatar">
    <!-- `.user-avatar` (not a `dx-`-prefixed name) because it's the documented
         theming hook consumers already override — see the theming guide. -->
    <span class="user-avatar">
      <!-- @slot Replaces the initial inside the disc (e.g. a photo or an icon). -->
      <slot>{{ resolvedInitial }}</slot>
    </span>

    <span
      v-if="badge"
      class="dx-user-avatar__badge"
      :class="`bg-${badgeVariant}`"
    >
      <span class="visually-hidden">{{ badgeLabel }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ColorVariant } from "bootstrap-vue-next";

const props = withDefaults(
  defineProps<{
    /** The user whose initial is shown. The first letter of `name` is used. */
    user?: { name: string; [key: string]: any } | null;

    /** Overrides the initial derived from `user.name` (e.g. two-letter initials). */
    initial?: string;

    /** Show a notification dot on the avatar (e.g. unread updates). */
    badge?: boolean;

    /** Colour of the notification dot. */
    badgeVariant?: ColorVariant;

    /**
     * Accessible text for the notification dot, announced to screen readers
     * (the dot itself is a colour-only signal). Ignored unless `badge` is set.
     */
    badgeLabel?: string;
  }>(),
  {
    user: null,
    initial: "",
    badge: false,
    badgeVariant: "danger",
    badgeLabel: "Unread notifications",
  },
);

const resolvedInitial = computed(() => {
  if (props.initial) return props.initial;
  return props.user?.name?.charAt(0).toUpperCase() ?? "";
});
</script>

<style scoped>
/* The disc, not the root, carries the size: the root is a positioning context
   for the badge, and giving it the disc's dimensions would clip the dot. */
.dx-user-avatar {
  position: relative;
  display: inline-flex;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bs-dark);
  color: var(--bs-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.dx-user-avatar__badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  /* Ring the dot in the bar's own background so it reads as a separate mark
     rather than a bite out of the disc's edge. */
  box-shadow: 0 0 0 2px var(--bs-body-bg);
}
</style>
