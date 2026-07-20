# Refactor cluster sequencing plan (#130 #131 #134 #135 #136 #137)

**Date:** 2026-07-20
**Status:** Phases 1 & 2 COMPLETE (2026-07-20), all green — 575 tests,
typecheck clean, `docs:build` passing. Phase 3 (the breaking tail) deferred to
a deliberate major, pending James's calls on the three open decisions below.
Sequencing + risk framing for the six factoring/maintainability issues Codex
surfaced in the 2026-07-15 whole-repo review.

## Outcome (Phases 1 & 2)

- **#131** — `FieldDef` discriminated union + per-type members exported
  additively; `FieldDefinition` kept canonical; `editFields: any[]` →
  `FieldDefinition[]`; a zero-runtime compile-time drift guard
  (`_FieldDefStaysASubset`) asserts the union stays assignable to the permissive
  interface. Verified: the union rejects invalid combos; the guard fires on an
  incompatible prop type.
- **#130** — additive `DXTableSource` `source` prop; legacy 5-prop matrix
  resolved through `resolved*` computeds so both APIs drive identical logic;
  `clientSide + provider` warning added. Verified: all four modes go red on a
  wiring break (`tests/components/DXTable-Source.test.ts`).
- **#134** — `utils/formSchema.ts` (defaulting/cloning/predicate/visibility/
  submission), consumed by defineForm / useResourceEditor / DXForm / DXRepeater;
  18 red-first unit tests. Unifying the drifted rules made create/edit seeding
  type-aware (a CHANGELOG-noted behaviour change; no test regressed).
- **#135** — `DXField` → `DXFieldShell` + `DXNumericField`/`DXChoiceField` +
  `useAsyncOptions` (1183→896; autocomplete/switch-list/file kept inline by
  design); `DXRepeaterCards` extracted (cards styles moved with it; row-slot
  forwarding red-on-break verified); `useThemedChart` + Chart.js generics for
  the bar/line wrappers.
- **#136** — one `vue-docgen-api` manifest (`scripts/lib/component-manifest.mjs`)
  feeding llms.txt / api-reference.json / component-docs; regex parser + the
  `export {default as}`-only registry removed; `DTab`/`DCarousel` now present
  (`tests/docs/llms-txt.test.ts`).

Known follow-up: `tests/components/soft-badges.test.ts` is intermittently flaky
under full-suite load (passes isolated + on re-run) — a pre-existing
`getComputedStyle`/test-isolation wart, not from this work. Capture as an issue.

## Why a sequencing plan (not six independent fixes)

These issues are not independent. Two of them (#130, #131) change **exported
types**; one (#137) changes **exported component identity**. Both categories are
breaking for consumers and must land behind an additive→major staging. And the
"single source of truth" issues (#134, #135, #136) are easier and safer to do
*after* the types they operate on are made honest — you don't want to extract a
pure `formSchema` util (#134) keyed on `FieldDefinition` and then immediately
rewrite `FieldDefinition` into a discriminated union (#131), re-touching every
util signature.

So the ordering principle is: **make the types honest first (additive), then
deduplicate against the honest types, then defer the two breaking removals to a
major.** Every step below is non-breaking (additive or internal) except the
explicitly-marked MAJOR tail.

## Current ground truth (verified 2026-07-20, post-decomposition)

The line numbers in the issues predate the DXTable façade split (#123/#129) and
the 0.33.x work. Corrected anchors:

- **#130** mode computeds now at `DXTable.vue:708-711`
  (`isProviderMode`/`isInertiaMode`/`isClientSideMode`/`hasInertiaUrl`) — five
  independently-optional props (`items`/`provider`/`apiUrl`/`inertiaUrl`/
  `clientSide`) plus the new `apiAdapter` (0.33.1). The `source` union must
  account for the adapter seam.
- **#131** `FieldDefinition` is `types/index.ts:90-381` (~291 lines);
  `editFields?: any[]` is now `DXTable.vue:530` (comment still cites the
  circular-import excuse the issue rebuts).
- **#134** defaulting lives in **three** places: `defineForm.ts:36-93`
  (`getDefaultValueForType`), `useResourceEditor.ts:119-134` (`defaultValueFor`,
  used at :302/:308), and `DXRepeater.vue` (sub-field seeding). Visibility lives
  in **two**: `DXForm.vue:306-345` (`resolvePredicate` + `isFieldVisible` +
  `visibleFieldsFor`) and `useResourceEditor.ts:140` (explicitly "Kept in step
  with DXForm.isFieldVisible"). The decomposition MOVED DXTable's copies into
  `useResourceEditor.ts` — so the dup count is unchanged, just relocated.
- **#135** three extractions: `DXField.vue` (1183 lines) shell dup;
  `DXRepeater.vue` (531) cards dup; chart wrappers at
  `resources/js/components/charts/DX{Bar,Line,Doughnut}Chart.vue` (70/70/76
  lines) — Bar/Line near-identical, datasets/options typed `any`.
- **#136** three doc generators disagree: `generate-component-docs.mjs` (regex
  parser), `generate-api-manifest.mjs` (already `vue-docgen-api`),
  `generate-llms-txt.mjs` (matches only `export { default as … }`, so raw
  aliases like `DTab`/`DCarousel` are missing from `llms.txt`).
- **#137** most `D*` wrappers are pure `$attrs`+slot pass-through; raw re-exports
  already exist for vnode-scanning components (carousel/tabs). Tensions with the
  "wrap every BVN component" project rule — needs a deliberate decision.
- Existing homes: `resources/js/utils/` already exists (`api.ts`,
  `objectPath.ts`) — natural home for a new `formSchema.ts`. No test dir for
  pure utils yet under `tests/` for composables — add `tests/unit/`.

## Sequencing

### Phase 1 — Honest types, additive (#131 then #130)

Do #131 **before** #130 because the `source` union (#130) for the `inertia`/
`client` modes references field/item typing, and because #131 is the wider blast
radius — better to stabilise the field types first.

**1a. #131 — discriminated `FieldDefinition` union (additive).**
- Split the ~291-line interface into a union keyed on `type`, each variant
  permitting only its own options (`currencySymbol` only on `type:'currency'`,
  `fields` only on `type:'repeater'`, `component` only on `type:'component'`,
  `options` only on choice types, etc.).
- Export the strict union under a new name AND keep `FieldDefinition` as a
  permissive alias initially (tightening an exported type is breaking for TS
  consumers) — flip which is canonical in the major (Phase 3).
- Replace `editFields?: any[]` (`DXTable.vue:530`) with `import type` +
  `FieldDefinition[]`. Verify no runtime cycle (the issue's core claim — an
  `import type` is erased). `npm run typecheck` is the gate; **the test suite
  will not catch a `vue-tsc` regression** (pretest runs esbuild, not vue-tsc —
  local CLAUDE.md).
- Risk: some internal call sites currently rely on the permissive shape (e.g.
  reading `field.options` without narrowing). Expect to add `type` narrowing.
  Budget for churn across DXField/DXForm/DXRepeater/useResourceEditor.

**1b. #130 — discriminated `source` prop (additive).**
- Add `source?: DXTableSource` (`client`/`provider`/`api`/`inertia`), translate
  the legacy five-prop matrix into it internally, keep the legacy props working.
- Fold the `apiAdapter` seam in: it applies to `provider`/`api` modes — decide
  whether it's a field on those variants or stays a sibling prop (recommend
  sibling for now; it's transport-orthogonal).
- Replace the 708-711 computeds' *source* with the resolved discriminant; keep
  the computeds as derived getters so the rest of the façade is untouched.
- Add the runtime warning the issue notes is missing (`clientSide + provider`).

### Phase 2 — Deduplicate against the honest types (#134, #135, #136)

These are internal/non-breaking and can proceed **in parallel** once Phase 1
lands (disjoint file sets → safe for parallel worktree agents). #134 is the
highest-value (it's the #117/#122/#125 drift class) — do it first or as the
lead lane.

**2a. #134 — extract pure `formSchema` utils (`utils/formSchema.ts`) + unit
tests.** Move defaulting (the 3 sites), cloning, predicate resolution
(`resolvePredicate`), visibility (`when`/`show`), and submission-eligibility
(`submit !== false`) into pure functions. Then `defineForm` / `useResourceEditor`
/ `DXForm` / `DXRepeater` all consume them. **Red-first**: write the util unit
tests, then delete each inline copy and confirm behaviour unchanged. This is the
one with real bug-prevention value — the "keep in step" comments become dead.
Add `tests/unit/formSchema.test.ts` (node env, no browser needed).

**2b. #135 — three self-contained extractions.** (1) `DXFieldShell` +
`DXNumericField`/`DXChoiceField`/`useAsyncOptions` out of the 1183-line
`DXField.vue`, keeping `DXField` as the public dispatcher. (2) `DXRepeaterCards`
(or gate the `ResizeObserver` to table layout only). (3) `useThemedChart` +
`ChartData<TType>`/`ChartOptions<TType>` typing for the Bar/Line wrappers.
Each is independent; the chart one is smallest and a good warm-up.

**2c. #136 — one docs-metadata manifest via `vue-docgen-api`.** Make
`generate-api-manifest.mjs` (already uses it) the single source; have MDX docs,
`api-reference.json`, `docs-map.md`, and `llms.txt` all consume it; delete the
regex parser in `generate-component-docs.mjs` and the `export { default as … }`
registry in `generate-llms-txt.mjs`. **Test the fix**: assert raw aliases
(`DTab`, `DCarousel`) now appear in `llms.txt` — that's the concrete bug (#136's
evidence) and makes the change verifiable rather than a pure refactor. Watch the
`release.sh` regen path (AI docs are gitignored-but-shipped — local CLAUDE.md).

### Phase 3 — The two breaking removals (MAJOR — v0.34.0 or v1?)

Defer both to a deliberate major. They need a codemod and a migration guide,
and #137 needs a documented reversal of a project rule.

**3a. #131/#130 canonicalisation.** Make the strict `FieldDefinition` union and
the `source` prop canonical; remove the permissive alias and the legacy
data-source matrix. Ship a codemod (legacy props → `source`) + registration/
type tests.

**3b. #137 — raw BVN aliases for pass-through wrappers (the real decision).**
Export raw BVN aliases for genuinely pass-through components; keep SFC wrappers
only where behaviour/theming is added (`DButton`, `DTable`, `DFormSelect`,
`DAutocomplete`, …). **This is the open question, not a foregone conclusion** —
it directly contradicts the "wrap every BVN component" rule in CLAUDE.md and
DIVERGENCES.md. Decide the wrapper line deliberately with James before building:
the wrapper cost (a file each, scope-id/teleport gotchas, docs) vs. the benefit
(one consistent import surface, a place to add theming later without a breaking
move back to a wrapper). Component identity is observable (registration, slot
scanning) so it's breaking — needs registration/slot tests + codemod.

## Recommended immediate next step

Start Phase 1a (#131 field union) as a focused branch — it's the widest blast
radius, gates everything downstream, and `npm run typecheck` gives a hard,
fast correctness signal. Hold Phase 3 for an explicit "cut a major" decision.

## Open decisions for James

1. **Major-version framing**: is the breaking tail (#130/#131 canonical + #137)
   a v0.34.0 (still 0.x, looser semver) or the trigger to cut v1.0.0?
2. **#137 wrapper line**: where does "add behaviour/theming" begin? This reverses
   a standing project rule — needs sign-off before any code.
3. **Codemod investment**: worth building (jscodeshift/ts-morph) for legacy-prop
   → `source` and wrapper-import rewrites, or document manual migration given the
   small known consumer set (Omni Tend apps + greendragon)?
