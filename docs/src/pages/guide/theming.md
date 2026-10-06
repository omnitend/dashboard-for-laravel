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
- **`secondary` / `success` / `danger` / `warning` / `info` / `pending`
  buttons are _soft_** — a light same-hue tint background with a dark same-hue label. A
  soft light-red "Delete" still reads as danger without a heavy fill.
- **Disabled buttons are neutral.** Whatever the variant, a disabled button
  is light grey with a grey label (outline and link buttons: grey border or
  text, no fill), so it never looks pressable. Retune with
  `--dx-btn-disabled-bg`, `--dx-btn-disabled-color` and
  `--dx-btn-disabled-outline-border`.
- **Tertiary actions are ghosts** — the `link` variant is restyled as a quiet
  button: body-colour text, no underline, a faint hover surface.
- **All status colour is soft.** Badges and toasts use light tints, and alerts
  a paler step of the same tint with a border; never saturated fills.

### Semantic guidance

- **`primary` is the main action** — including Save. There is one bold button
  on a screen, and it's the thing the user came to do.
- **`success` (green) means a positive _outcome_, not "save".** A save's green
  reward belongs in a "Saved ✓" toast or badge after it succeeds, not on the
  button itself.
- **`danger` is for destructive actions** (delete, remove) and error states.
  It renders soft (light magenta + dark-magenta label), matching the rest of
  the system; the deep-magenta emphasis carries outlines and links.
- **Form errors are crimson** (`#c8102e`, 5.88:1 on white), not the danger
  magenta: an invalid field must read as "wrong" at a glance. Danger badges and
  buttons stay magenta.
- **Links are the brand navy** (`#151e2d`) and keep their underline, which is
  what marks them as links.
- **`pending` means waiting, and the next move is not yours** ("awaiting
  payment", "sent to printer, not yet confirmed"). It is a violet, distinct
  from `info`'s slate blue. It works everywhere a stock variant does
  (`variant="pending"` on badges and buttons, `outline-pending`,
  `.alert-pending`, `.text-pending`, `.bg-pending-subtle`, `.table-pending`,
  `.list-group-item-pending`, toasts), and the theme adds it to
  bootstrap-vue-next's variant types.

## Typography

The theme ships two typefaces, both under the SIL Open Font License and
bundled as woff2 files next to `theme.css` (each downloads only when text
renders in it):

- **Maven Pro** is the body face (`$font-family-sans-serif`).
- **Poppins** is the display face, published as `--dx-font-family-display`.
  The theme uses it for `h1`–`h4` (and `.h1`–`.h4`) only; use the token for
  your own display text, such as a product name:

```css
.product-title {
  font-family: var(--dx-font-family-display);
  font-weight: 500;
}
```

Bundled weights: Maven Pro 400, 500, 600 and 700; Poppins 500 and 600. Other
weights are synthesised by the browser.

Headings are compact and restrained, all at weight 500: `h1` 1.25rem, `h2`
1.15rem, `h3` and `h4` 1.05rem, `h5` and `h6` 1rem (body size). Table body
text is the body colour (`#212529`) and table headers are weight 500 in the
muted `--dx-table-header-color`.

## The token model

Each of the seven variants carries three colour roles, defined in one Sass map
(`$dx-variants` in `resources/css/theme.scss`):

| Token | Drives |
|---|---|
| **solid** (bg + text) | The `.btn-primary` fill and label, the switch-ON green, and large fills — `.progress-bar.bg-*` uses each variant's vivid solid, not the dark emphasis |
| **soft** (bg + text) | Soft buttons (`.btn-secondary` etc.), all badges (`.text-bg-*`), toast tints; alerts (`.alert-*`) take the soft text on the paler subtle tint |
| **emphasis** | Outline buttons (`.btn-outline-*`), coloured links (`.link-*`), text utilities (`.text-*`) — the shade that reads on a white background |

The map also records whether each variant's button renders **solid** or
**soft**. The fourth style in the system — the **ghost** (tertiary buttons,
`variant="link"` restyled to body-colour text with a faint hover surface) — is
a single global style, not a per-variant token: it has no entry in the map and
no colour of its own.

Two details make the system cohesive:

- **Button text is a same-hue tint**, not plain black or white — light-hue text
  on dark fills, dark-hue text on light tints.
- **The base `$theme-colors` carry each hue's _emphasis_ shade** — so
  `.text-success`, `.link-warning`, `.border-info` and outline buttons are
  legible on white without any extra overrides. The solid fills and soft tints
  are applied after the Bootstrap import, from the map.
- **Bootstrap's subtle family follows the soft tints.** `.bg-*-subtle` and the
  `.table-*` row variants are the soft tint mixed with white to 70% white,
  `.border-*-subtle` is the tint 10% darker, and `.text-*-emphasis` is the soft
  text, so a subtle surface is a paler step of the badge colour.
- **Alerts use the subtle tint, with a border.** `.alert-*` paints the 70%-white
  subtle background, the `border-*-subtle` shade as its border and the soft
  text. A large box in the full soft tint is too loud (warning's soft tint is
  its solid butter yellow).

All colour pairs are WCAG AA verified.

## The palette

| Variant | Solid fill | Solid text | Soft bg | Soft text | Emphasis | Button style |
|---|---|---|---|---|---|---|
| `primary` | `#151e2d` | `#e9f0f8` | `#e9f0f8` | `#151e2d` | `#151e2d` | **solid** |
| `secondary` | `#475569` | `#e6ebf2` | `#e6ebf2` | `#29374a` | `#475569` | soft |
| `success` | `#7bf25a` | `#153c04` | `#c3faaa` | `#153c04` | `#236b12` | soft |
| `danger` | `#e46ab9` | `#3d0a2f` | `#f9dff2` | `#61124c` | `#a3247f` | soft |
| `warning` | `#efd574` | `#121419` | `#efd574` | `#121419` | `#8a6d00` | soft |
| `info` | `#7fd7fd` | `#192547` | `#d5dcf0` | `#192547` | `#31586d` | soft |
| `pending` | `#b9a3f0` | `#2a1260` | `#e3d3fb` | `#3b1a80` | `#6a43c4` | soft |

Default link colour: `#151e2d` (brand navy, underlined). Form error colour:
`#c8102e` (crimson).

### Chart palette

Data-viz gets its own palette — eight light, vivid fills published as
`--dx-chart-1` … `--dx-chart-8`, a darker line shade per slot
(`--dx-chart-line-1` … `--dx-chart-line-8`) and one outline colour
(`--dx-chart-edge`), kept as their own lists rather than read from the semantic
UI colours.
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
outlines, badges, alerts, the subtle family) from this map, so a palette change is a map edit —
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

The sidebar has two colour schemes, chosen with DXDashboard's `sidebarVariant`
(or DXDashboardSidebar's `variant`): **`light`**, the default, and **`dark`**,
the navy rail. Every colour, the typeface and the weights come from a
`--dx-sidebar-*` custom property. The light values are published on `:root`;
the dark ones are set on `.dashboard-sidebar--dark`. To rebrand, override them
in a stylesheet loaded after `theme.css`:

```css
/* Light (default) sidebar: a blue active item instead of green */
:root {
  --dx-sidebar-active-bg: #dbe8ff;
  --dx-sidebar-active-color: #10264d;
}

/* Dark sidebar: a different navy */
.dashboard-sidebar--dark {
  --dx-sidebar-bg: #0f2240;
}
```

| Token | Light default | Used for |
|---|---|---|
| `--dx-sidebar-bg` | `#ffffff` | The pane |
| `--dx-sidebar-color` | `#121419` | Brand initial and title |
| `--dx-sidebar-edge-width`, `--dx-sidebar-edge-color` | `0`, `#e6e9f0` | A line along the pane's right edge (none by default in both schemes) |
| `--dx-sidebar-header-border-width` | `0` | The line under the brand row (dark: `1px`) |
| `--dx-sidebar-separator-color` | `#e6e9f0` | The line above the footer, and under the header where it has one |
| `--dx-sidebar-group-color` | `#121419` | Group header text |
| `--dx-sidebar-group-bg` | `#f5f8fe` | Group header pill (dark: transparent) |
| `--dx-sidebar-group-hover-bg` | `#ebf0fb` | Collapsible group header on hover |
| `--dx-sidebar-link-color` | `#6b7182` | Links (4.87:1 on white) |
| `--dx-sidebar-link-hover-color`, `--dx-sidebar-link-hover-bg` | `#363e4d`, `#f9f9fc` | Links on hover |
| `--dx-sidebar-active-color`, `--dx-sidebar-active-bg` | `#121419`, `#c3faaa` | The current page's link |
| `--dx-sidebar-focus-ring` | `#6b7182` | Keyboard focus outline on links and group headers |
| `--dx-sidebar-divider-color` | secondary | Dividers between groups in the collapsed rail |
| `--dx-sidebar-scrollbar-track`, `-thumb`, `-thumb-hover` | translucent black | The nav's scrollbar |
| `--dx-sidebar-font-family` | `var(--dx-font-family-display)` | Menu typeface (dark: the page's) |
| `--dx-sidebar-link-font-size` | `0.9375rem` | Link size (dark: the page's) |
| `--dx-sidebar-link-font-weight` | `500` | Link weight (dark: the page's) |
| `--dx-sidebar-active-font-weight` | `600` | Current link weight (dark: 500) |
| `--dx-sidebar-group-font-weight` | `600` | Group header weight |

Two shell tokens sit beside these. `--dx-dashboard-header-height` (64px) is
the height of both the sidebar header and the navbar, so their bottom edges
always meet; change it there, never on either element. `--dx-dashboard-gutter-x`
is the page and navbar side gutter: 20px, and 16px below 576px (the full-screen
modal's edge).

Keep text tokens at 4.5:1 or better against the background they sit on. The
light defaults are pinned by tests: links 4.87:1, the active item 15.4:1 and
group headers 17.3:1. The legacy admin's link grey `#7c8293` is 3.84:1 and
fails WCAG AA.

A dark brand logo is needed on the light pane: a custom `sidebar-brand` slot
that shows a white logo becomes invisible on it.

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
