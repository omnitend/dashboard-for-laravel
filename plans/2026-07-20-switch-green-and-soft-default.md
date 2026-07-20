# Switch green-on/red-off default (#158) + soft `.text-bg-*` as default

Two related theme-system changes, both from James's steer (2026-07-20).

## Part A — soft `.text-bg-*` is the default across the board (relates to #154)

**Problem:** dfl 0.27's soft-first system only softens `.text-bg-*` on `.badge`
(the `$dx-variants` loop rule `.badge.text-bg-#{$name}`). Everywhere else
`.text-bg-success` is still Bootstrap's bold solid dark green. Measured on
greendragon: a "kegs in stock" `.input-group-text.text-bg-success` renders
`rgb(77,124,15)` (solid dark) while the "current" `.badge.text-bg-success`
renders `rgb(205,249,178)` (soft) — a stock bar can't match the badge without
hardcoding.

**Decision (James):** don't add a separate `.bg-*-soft` utility — make the soft
version the DEFAULT. Broaden the badge rule so **every** `.text-bg-#{$name}`
element gets the soft tint, not just `.badge`.

**Change:** in the `$dx-variants` loop, `.badge.text-bg-#{$name}` →
`.text-bg-#{$name}:not(.toast)`. Keep `!important` (beats Bootstrap's
`.text-bg-*` helper). Exclude `.toast` because toasts intentionally use a
FAINTER 50%-white mix via `--bs-toast-bg` (large surface) — the broad
`!important` bg would clobber that.

**Not in scope:** `.bg-success` / `.progress-bar.bg-success` (a progress fill
needs to stay readable, not go faint) — that's #154's call, left separate.

**Guard:** extend `soft-badges.test.ts` — assert a non-badge
`.text-bg-success` (e.g. `.input-group-text`) is now the soft bg, and a
`.toast.text-bg-success` keeps its fainter mix.

## Part B — switch default: green-on / red-off, neutral override (#158)

**Decision (James):** the DEFAULT switch style is **green when ON / red when
OFF** out of the box (an active switch — "Product is current", "Stock tracked",
"Visible" — reads success when on), with a **neutral override** for
semantically-mixed switches ("contains alcohol", allergen toggle, "hidden on web
shop") rather than success being opt-in. Reverses the current DXSwitch decision
("green is reserved for success, generic on = primary").

**Scope:** both the bare `.form-switch` (theme.scss, global) AND `DXSwitch`
(the filled-box toggle, which `DXField type:'switch'` renders).

### B1 — bare `.form-switch` (theme.scss)
- ON (`:checked`): success green track/border.
- OFF (unchecked): red (danger) track/border tint.
- Neutral opt-out class (e.g. `.switch-neutral`) restoring grey-off / primary-on
  for a bare switch that shouldn't imply good/bad.

### B2 — `DXSwitch.vue`
- New `onVariant` prop, default `'success'`. Values: `success` (green-on /
  red-off), `neutral` (today's primary-on / grey-off — no valence),
  and pass-through others if cheap (`primary`, `danger`).
- Drive the box bg/border + track colour from the variant via classes on
  `.dx-switch` (replace the hardcoded `--bs-primary*` on-state).

### B3 — `DXField.vue`
- Forward a `switchVariant` (or `onVariant`) field option → `DXSwitch`'s
  `onVariant`, so a form field can opt a switch to neutral.

**Guard:** DXSwitch/DXField test — default renders success classes; `neutral`
renders the neutral classes; DOM-level (not just prop) so the wiring is real.

**Visual:** screenshot a filmstrip — default switch on+off, neutral switch
on+off, and an `.input-group-text.text-bg-success` next to a
`.badge.text-bg-success` (Part A) — before finalising. Red-off on every default
switch is bold; eyeball it.

## Delivery
Two commits (Part A, Part B). Minor bump; CHANGELOG both as behaviour changes
(soft `.text-bg-*` default; switch default colour). DIVERGENCES.md if the switch
default is a deliberate divergence from bvn/Bootstrap.

## Outcome

Done, 2026-07-20 (unreleased on main).

- **Part A** (ae8bb0b): broadened the `$dx-variants` soft rule
  `.badge.text-bg-#{$name}` → `.text-bg-#{$name}:not(.toast)`. A non-badge
  `.text-bg-success` (input-group-text) now matches the badge green; toast keeps
  its fainter mix. Guarded in `soft-badges.test.ts` (verified red vs the old
  badge-only rule). `.bg-*`/progress left for #154.
- **Part B** (806f7fd): switch default green-on / red-off with a `neutral`
  override.
  - theme.scss: bare `.form-switch` green ON / red OFF (white thumb both);
    `.switch-neutral` restores grey-off / primary-on. Published
    `--dx-<variant>-soft-bg/-soft-text/-solid-bg/-emphasis` on `:root`.
  - DXSwitch: `onVariant` prop (`success` default | `neutral`); box is a
    soft-green panel (success) or primary panel (neutral); neutral tags the
    inner form-switch `switch-neutral`.
  - DXField / FieldDefinition: `switchVariant` field option → DXSwitch.
  - `DXSwitch.test.ts` asserts the ACTUAL painted toggle colour (green ON / red
    OFF / neutral primary) — 3/4 verified red vs pre-change. 495 tests green.
- Visually confirmed both parts via headless-Chrome screenshots (bare switch
  filmstrip + DXSwitch docs page). Not a DIVERGENCES.md entry — a theme default,
  not a bvn API shield.
- Docs: DXSwitch example + mdx (intro + `onVariant` prop); CHANGELOG both parts;
  `switchVariant` in the FieldDefinition type.

**James's decisions (2026-07-20, via interactive artifact):**
- OFF shade → **light red** (over solid red / outline / grey). Bare `.form-switch`
  now paints a light-red OFF track (red thumb) / vivid-green ON track.
- Form → **the Omni Tend "filled box"**: `DXSwitch` (and `DXField type:'switch'`)
  fills the WHOLE box green (on) / light red (off) with a **neutral grey pill**,
  not a coloured toggle. Reworked accordingly; the pill overrides the global
  green/red within the box. `--dx-switch-on-*/-off-*/-pill` tokens drive it.
- Label uses **`textWhenTrue`/`textWhenFalse`** so the text names each state
  ("Product is current" ↔ "Product is not current") — reflected in the docs
  example.
- DXSwitch tests rewritten to assert the box channel-dominance (green/red) +
  neutral pill (11 tests, green). Visually confirmed against the Omni Tend
  screenshot. Artifact: claude.ai/code/artifact/d2590187-afe8-4bed-b3b7-4f91f9af4e43

`.bg-*`/progress-bar success shade remains #154 (separate).
