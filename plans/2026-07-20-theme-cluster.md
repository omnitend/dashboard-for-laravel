# Theme cluster — #90 / #95 / #157 / #154 / #145

The remaining theme/design issues, tackled as one pass (triage order: quick
wins first, the one real design decision in the middle, the derivation last).

## 1. #90 — switch off-state (CLOSE, no code)

The issue's one remaining question (off-state colour + off≈disabled
affordance) shipped in **v0.31.0**: bare `.form-switch` OFF is a light-red
track with a red thumb (clearly interactive, clearly "off"), ON is vivid
green; `.switch-neutral` opts mixed-semantics switches back to grey/primary;
DXSwitch is the filled box. Distinct from disabled (opacity-muted). Close
citing the shipped design — it was decided via James's own decision artifacts.

## 2. #95 — sidebar density (James's call, from the issue comment)

Adopt greendragon's trialled values as the DEFAULT theme (back-compat not a
concern pre-1.0):

- nav group `margin-bottom`: `mb-3` → 0.25rem
- group headers: natural case at 0.875rem (drop `text-transform: uppercase`
  and the letter-spacing that existed for all-caps)
- nav-link vertical padding: 0.3rem
- group toggle + static label `min-height`: 2.5rem → 2rem

All in `DXDashboardSidebar.vue` (+ theme.scss if the toggle colour rule needs
touching). Screenshot-verify the rhythm.

## 3. #157 — muted DXTable headers

Header titles → muted grey (keep bold). Publish as a CSS token
(`--dx-table-header-color`, default `--bs-secondary-color`) so consumers can
re-loudened if wanted. DOM-verify against the built dist (scoped `:deep()`
rules on BVN internals are the known trap).

## 4. #154 — fill vs emphasis (the design decision)

The `$dx-variants` map ALREADY has the split the issue asks for: each variant
carries a vivid `solid-bg` (success = lime `#84cc16`, the switch-ON green)
distinct from the dark `emphasis` (`$success` `#4d7c0f`) that Bootstrap wires
into `.bg-success` / `.progress-bar`. Proposal: progress bars use the vivid
`solid-bg` fill (`.progress-bar.bg-{variant}` and the default `.progress-bar`
via `--bs-progress-bar-bg`), leaving `.bg-*` utilities and emphasis shades
untouched. Render a before/after for James before landing.

## 5. #145 — dark-surface chart palette

Add a `[data-bs-theme=dark]` block remapping `--dx-chart-1..8`: same hue
order (the CVD-derived order is load-bearing), lightness lifted so every step
is ≥3:1 against `#212529`. Validate with the dataviz skill's
`validate_palette.js` (adjacent-pair CVD separation + contrast) before
committing, and keep `tests/components/charts.test.ts`'s Sass-parsing
expectations in sync. No JS change (`getPalette()` reads the vars live).

## Outcome

All five landed in one pass:

- **#90 closed, no code** — the off-state question was already answered by
  0.31.0's shipped switch design.
- **#95** — dense natural-case sidebar defaults, per James's issue comment.
  Screenshot-verified (grey 0.875rem headers, tight rhythm).
- **#157** — muted headers via scoped `:deep(thead th)` +
  `--dx-table-header-color` token; guarded in `scoped-deep-styles.test.ts`
  with a scope-id + computed-colour assertion (red-first).
- **#154** — James chose the full vivid mapping (decision artifact:
  claude.ai/code/artifact/79a36fbe-50dd-4047-9643-f9cea4c9fa74).
  `.progress-bar.bg-*` → each variant's `solid-bg` (`!important` beats the
  `.bg-*` utility); in practice only success (olive→lime) and warning
  (dark→bright amber) change hex. Guarded in `soft-badges.test.ts`
  (red-first, incl. a default-bar-stays-navy assertion).
- **#145** — `$dx-chart-palette-dark` under `[data-bs-theme=dark]`: same hue
  slots, Tailwind-400 steps. Validated by reimplementing the documented
  method (OKLab ΔE ×100, Viénot protan/deutan) — the implementation
  reproduces the light palette's documented 13.8 benchmark as 14.1, so it's
  faithful; dark set scores min adjacent CVD ΔE 15.1, min normal 25.3,
  contrast 5.67–10.23:1 on `#212529`. Two red-first tests in
  `charts.test.ts` (computed vars under the attribute + Sass-source order
  sync).

Also fixed while in the theming doc: the palette table and prose were stale
from 0.31.0 (danger still listed as a solid button with the plum soft).
