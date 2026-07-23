---
layout: ../../layouts/DashboardLayout.astro
title: Theming
---

# Theming

The library ships a custom Bootstrap 5 theme built around a **soft-first
semantic colour system**. This guide explains the system's rules, the tokens
behind it, and how to customise it.

Two pages let you see the system live:

- **[Style guide](/showcase)** — every variant rendered on the real components
- **[Colour playground](/playground)** — experiment with palette changes interactively

## The soft-first idea

Emphasis comes from **weight and place, not loudness**. Most dashboards drown
their one important action in a sea of saturated buttons; this theme inverts
that:

- **Only `primary` is a bold solid button** (the brand navy) — one loud action
  per screen. Everything else stays quiet.
- **`secondary` / `success` / `danger` / `warning` / `info` buttons are
  _soft_** — a light same-hue tint background with a dark same-hue label. A
  soft light-red "Delete" still reads as danger without a heavy fill.
- **Tertiary actions are ghosts** — the `link` variant is restyled as a quiet
  button: body-colour text, no underline, a faint hover surface.
- **All status colour is soft.** Badges, alerts, and toasts use light tints,
  never saturated fills.

### Semantic guidance

- **`primary` is the main action** — including Save. There is one bold button
  on a screen, and it's the thing the user came to do.
- **`success` (green) means a positive _outcome_, not "save".** A save's green
  reward belongs in a "Saved ✓" toast or badge after it succeeds, not on the
  button itself.
- **`danger` is for destructive actions** (delete, remove) and error states.
  Since v0.31.0 it renders soft (light red + dark-red label), matching the
  rest of the system; the emphasis red still carries outlines and links.
- **Links are info-blue** (`#2563eb`), independent of the near-black brand
  primary — a navy link would read as bold text, not a link.

## The token model

Each of the six variants carries three colour roles, defined in one Sass map
(`$dx-variants` in `resources/css/theme.scss`):

| Token | Drives |
|---|---|
| **solid** (bg + text) | The `.btn-primary` fill and label, the switch-ON green, and large fills — `.progress-bar.bg-*` uses each variant's vivid solid, not the dark emphasis |
| **soft** (bg + text) | Soft buttons (`.btn-secondary` etc.), all badges (`.text-bg-*`), alerts (`.alert-*`), toast tints |
| **emphasis** | Outline buttons (`.btn-outline-*`), coloured links (`.link-*`), text utilities (`.text-*`) — the shade that reads on a white background |

The map also records whether each variant's button renders **solid** or
**soft**. The fourth style in the system — the **ghost** (tertiary buttons,
`variant="link"` restyled to body-colour text with a faint hover surface) — is
a single global style, not a per-variant token: it has no entry in the map and
no colour of its own.

Two details make the system cohesive:

- **Button text is a same-hue tint**, not plain black or white — light-hue text
  on dark fills, dark-hue text on light tints. (`danger` is the one exception:
  white, because a delete-red can't carry a same-hue tint at AA contrast.)
- **The base `$theme-colors` carry each hue's _emphasis_ shade** — so
  `.text-success`, `.link-warning`, `.border-info` and outline buttons are
  legible on white without any extra overrides. The solid fills and soft tints
  are applied after the Bootstrap import, from the map.

All colour pairs are WCAG AA verified.

## The palette

| Variant | Solid fill | Solid text | Soft bg | Soft text | Emphasis | Button style |
|---|---|---|---|---|---|---|
| `primary` | `#151e2d` | `#e9f0f8` | `#e9f0f8` | `#151e2d` | `#151e2d` | **solid** |
| `secondary` | `#475569` | `#e6ebf2` | `#e6ebf2` | `#29374a` | `#475569` | soft |
| `success` | `#84cc16` | `#203b0e` | `#cdf9b2` | `#203b0e` | `#4d7c0f` | soft |
| `danger` | `#dc2626` | `#ffffff` | `#f8d4d4` | `#7a1a1a` | `#dc2626` | soft |
| `warning` | `#f59e0b` | `#512d05` | `#fce5c4` | `#512d05` | `#b45309` | soft |
| `info` | `#2563eb` | `#eef4ff` | `#deebff` | `#12376c` | `#2563eb` | soft |

Default link colour: `#2563eb` (info-blue).

### Chart palette

Data-viz gets its own palette — eight vivid hues published as `--dx-chart-1` …
`--dx-chart-8`, separate from the semantic UI colours (whose emphasis shades are
too muted for series, and whose status meanings shouldn't leak into "series 2").
The chart components read these variables at runtime, so overriding them
rethemes every chart. Under `data-bs-theme="dark"` the theme remaps the same
eight slots to lighter, dark-surface-validated steps (same hue order — it
encodes colour-vision-deficiency separation), so charts follow the theme with
no configuration. See the [Charts documentation](/components/extended/DXChart#chart-palette)
for the full palette and rationale.

## Customising the theme

### Small tweaks: runtime CSS variables (recommended)

The theme drives components through Bootstrap's CSS variables, so most
customisation needs no Sass at all — just override the variables in your own
stylesheet, loaded **after** `theme.css`:

```css
/* Rebrand the primary button */
.btn-primary {
  --bs-btn-bg: #1a2a45;
  --bs-btn-border-color: #1a2a45;
  --bs-btn-color: #eaf1fb;
  --bs-btn-hover-bg: #2c4066;
  --bs-btn-hover-border-color: #2c4066;
}

/* Adjust a soft button's tint */
.btn-info {
  --bs-btn-bg: #e3f0ff;
  --bs-btn-border-color: #e3f0ff;
}

/* Adjust an alert's tint */
.alert-success {
  --bs-alert-bg: #d8f7c4;
  --bs-alert-color: #203b0e;
}

/* Re-louden DXTable's (deliberately muted) header labels */
:root {
  --dx-table-header-color: var(--bs-body-color);
}
```

DXTable header labels default to a muted slate (`#7c8293`) so the table's
*content* is the loud layer; override `--dx-table-header-color` to darken them.

**Badges are the exception**: Bootstrap's `.text-bg-*` helper sets its colours
with `!important` by design (and the theme's soft re-tint does too), so a badge
override must also use `!important`:

```css
.badge.text-bg-info {
  background-color: #e3f0ff !important;
  color: #12376c !important;
}
```

### Full rebrand: compiling from source

For a wholesale palette change, compile the theme from its SCSS source. The
package exports it:

```scss
@import '@omnitend/dashboard-for-laravel/theme.scss';
```

The source defines everything in **one map — `$dx-variants`** — plus the base
`$theme-colors`. To rebrand, copy `theme.scss` into your project and edit:

1. **The base colours** (`$primary`, `$secondary`, …) — remember these carry
   each hue's _emphasis_ shade (readable on white, ≥ 4.5:1), not the fill.
2. **The `$dx-variants` map** — each variant's `solid-bg` / `solid-text` /
   `soft-bg` / `soft-text` / `emphasis`, and whether its `button` is `"solid"`
   or `"soft"`.

```scss
$dx-variants: (
  "primary": (solid-bg: #151e2d, solid-text: #e9f0f8, soft-bg: #e9f0f8,
              soft-text: #151e2d, emphasis: #151e2d, button: "solid"),
  // ... one entry per variant
);
```

A single loop after the Bootstrap import applies the whole system (buttons,
outlines, badges, alerts) from this map, so a palette change is a map edit —
there is no second place to update.

**Check contrast when you change colours.** Every pair in the shipped palette
clears WCAG AA (4.5:1); keep yours there too. The
[Colour playground](/playground) helps you preview combinations before
committing.

**Note:** compiling from source gives you only the Bootstrap theme — the Vue
components' scoped styles live in the built `dist/style.css`. If you go this
route, you're maintaining a fork of the theme; prefer runtime CSS variables
unless you truly need a full rebrand.

## Using colour in your own components

**Never hardcode colour values.** Use the CSS variables from Bootstrap or the
theme so your components pick up palette changes automatically:

```vue
<style scoped>
/* Good */
.custom-component {
  background-color: var(--bs-primary);
  color: var(--bs-white);
  border-color: var(--bs-border-color);
}
</style>
```

```vue
<style scoped>
/* Bad */
.custom-component {
  background-color: #4f46e5; /* Never do this! */
  color: #ffffff;
}
</style>
```

Commonly used variables:

```css
/* Colours (each variant's emphasis shade — readable on white) */
--bs-primary --bs-secondary --bs-success --bs-danger
--bs-warning --bs-info --bs-light --bs-dark --bs-white

/* Navigation */
--bs-nav-link-color --bs-nav-link-hover-color --bs-nav-link-active-color

/* Borders & spacing */
--bs-border-color --bs-border-radius --bs-gutter-x --bs-gutter-y
```

Note that `--bs-success`, `--bs-warning` etc. resolve to the **emphasis**
shades — correct for text and borders on light backgrounds. If you need a
variant's soft tint or solid fill in your own CSS, take the value from the
palette table above (or the `$dx-variants` map if compiling from source).

## Dark mode

Bootstrap 5.3 includes built-in dark mode support:

```html
<html data-bs-theme="dark">
  <!-- Your app -->
</html>
```

Toggle it dynamically:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const darkMode = ref(false)

const toggleDarkMode = () => {
  darkMode.value = !darkMode.value
  document.documentElement.setAttribute(
    'data-bs-theme',
    darkMode.value ? 'dark' : 'light'
  )
}
</script>

<template>
  <DButton @click="toggleDarkMode">
    Toggle Dark Mode
  </DButton>
</template>
```

## Component-specific styling

### DashboardSidebar

The sidebar uses the brand navy (`$dark`) with CSS variables for links:

```css
.sidebar {
  background-color: var(--bs-dark);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-link {
  color: var(--bs-nav-link-color);
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
```

### DashboardNavbar

The user avatar can be restyled via its stable `.user-avatar` class:

```css
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bs-dark);
  color: var(--bs-white);
}
```

## Tips

- **Use CSS variables** — avoid hardcoding colour values
- **Respect the soft-first rules** — one bold `primary` action per screen;
  reach for soft variants and ghosts before solid fills
- **Keep pairs at WCAG AA** (4.5:1) when changing colours
- **Test dark mode** — components should work in both modes
- **Check the [Style guide](/showcase)** after any palette change — it renders
  every variant on the real components

## Troubleshooting

### Styles not applying

Make sure you've imported the theme CSS:

```typescript
import '@omnitend/dashboard-for-laravel/theme.css'
```

### Component styles missing

You must import `theme.css` (built CSS), not `theme.scss` (source). The built
file contains both the Bootstrap theme **and** the Vue components' scoped
styles. See the [Installation guide](/guide/installation#import-styles) for
details.

### A badge colour override isn't taking effect

Badge variants go through Bootstrap's `.text-bg-*` helper, which is
`!important` by design. Your override needs `!important` too (see
[Customising the theme](#customising-the-theme) above).

### Dark mode not working

Ensure you're setting the `data-bs-theme` attribute on the `<html>` element:

```html
<html data-bs-theme="dark">
```

## Next Steps

- [Style guide](/showcase) — every variant on the real components
- [Colour playground](/playground) — experiment with the palette
- [Component Reference](/components/) — browse styled components
- [Examples](/examples/common-patterns) — see theming in action
