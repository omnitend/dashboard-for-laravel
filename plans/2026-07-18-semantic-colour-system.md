# Semantic colour system (Omni Tend brand adoption)

_2026-07-18. Design pass, decided interactively against the Colour playground
(`/playground`) and verified with WCAG AA maths. This is the authoritative record
of the locked palette + how each token maps to CSS._

**Status: SHIPPED in v0.27.0** (commit `3453543`). Implemented via the
`$dx-variants` map in `theme.scss`; guarded by `tests/components/soft-badges.test.ts`
(all six badges + four button variants). Follow-ups tracked as GitHub issues
(DAlert example, theming-guide rewrite, chart palette; switch off-state under #90).

## The idea

**Soft-first, with the main action bold.** Emphasis comes from weight and place,
not loudness. Only the two most consequential actions get a bold solid fill; every
other action is soft or a ghost; all status colour lives in soft tints.

- **Primary = the Omni Tend brand.** Dark navy `#151e2d` fill, light-brand
  `#e9f0f8` text. The one bold, emphatic button.
- **danger stays red and solid** — destructive actions (bin/delete) need the red
  convention. A deliberate per-surface exception (its *badge* is Omni Tend pink).
- **success is freed from "save".** Save moves to **primary**; green/`success`
  now means an actual positive *outcome* (a "Saved ✓" toast/badge), not an action.
- **Button text is a same-hue tint**, not black/white (light-hue on dark fills,
  dark-hue on light fills) — the principle that makes the soft badges cohesive.
  danger is the one exception (white — a delete-red can't take a same-hue tint at AA).

## Locked palette (all pairs WCAG AA verified)

| variant | solid fill | solid text | AA | soft bg | soft text | AA | emphasis (on white) | AA | button |
|---|---|---|---|---|---|---|---|---|---|
| primary | `#151e2d` | `#e9f0f8` | 14.56 | `#e9f0f8` | `#151e2d` | 14.56 | `#151e2d` | 16.73 | **solid** |
| secondary | `#475569` | `#e6ebf2` | 6.33 | `#e6ebf2` | `#29374a` | 10.08 | `#475569` | 7.58 | soft |
| success | `#84cc16` | `#203b0e` | 6.28 | `#cdf9b2` | `#203b0e` | 10.51 | `#4d7c0f` | 4.99 | soft |
| danger | `#dc2626` | `#ffffff` | 4.83 | `#f5dff1` | `#59194a` | 10.05 | `#dc2626` | 4.83 | **solid** |
| warning | `#f59e0b` | `#512d05` | 5.66 | `#fce5c4` | `#512d05` | 9.92 | `#b45309` | 5.02 | soft |
| info | `#2563eb` | `#eef4ff` | 4.68 | `#deebff` | `#12376c` | 9.75 | `#2563eb` | 5.17 | soft |

- **Default link colour:** `#2563eb` (info-blue) — conventional, legible, in-palette.
- **Ghost / tertiary:** transparent, body-colour text, faint hover tint. (New Receipt, Cancel.)

## Token → CSS mapping

| token | drives |
|---|---|
| **solid** (bg + text) | `.btn-{primary,danger}` fill + label; the fill behind `.text-bg-*` before it's re-tinted |
| **soft** (bg + text) | soft buttons `.btn-{secondary,success,warning,info}`; all `.badge.text-bg-*`; `.alert-*`; toast tints; status |
| **emphasis** | `.btn-outline-*` border/label; `.link-*`; `.text-*` |
| **ghost** | tertiary buttons (`variant="link"` restyled: body colour, no underline, hover tint) |

## Implementation notes

- Drive it from ONE Sass map (`$dx-variants`) looped with `@each`, so every
  override (button, badge, alert, outline) reads a single source per variant.
- Buttons need explicit `--bs-btn-*` overrides (Bootstrap's `button-variant`
  auto-picks white/dark text; we override with the same-hue tint / soft pair,
  incl. hover/active/border/disabled states).
- Badges: `.badge.text-bg-{v}` — override needs `!important` (`.text-bg-*` is
  `!important` by design). Extend the existing success/danger override to all 6.
- `$link-color: #2563eb`; set `$*-text-emphasis` (or explicit `.text-*`/`.link-*`)
  to the emphasis shades.
- Ghost: a `.btn-link` restyle (drop underline, body colour, hover `--bs-light`).
- Consider aligning the **sidebar** (`$dark` `#0f172a`) to the brand navy
  `#151e2d` — near-identical; a follow-up, not required.

## Scope / risk

- **Breaking visual change** for every consumer (not an API break). Warrants a
  clear CHANGELOG "Changed" entry and at least a MINOR bump — this is the biggest
  visual shift the library has shipped.
- Verify the REAL `D*` components on the **Style guide** (`/showcase`) match the
  playground mocks after wiring — the playground previews are hand-painted
  approximations; the showcase renders the actual components.

## Guard

- Extend `tests/components/soft-badges.test.ts` to assert the painted colours for
  all six badge variants (DOM-level `getComputedStyle`), plus a button-variant
  test that `.btn-secondary` renders soft and `.btn-primary` renders the brand
  fill with same-hue text.
