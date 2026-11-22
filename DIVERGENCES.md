# Divergences from bootstrap-vue-next

This library wraps **bootstrap-vue-next** (bvn) and bundles a pinned version.
In a few places our public API intentionally differs from the underlying bvn
API — almost always because we *shield* consumers from a bvn breaking change so
that bumping bvn doesn't force every consuming app to migrate.

This file is the **ledger** of those intentional divergences. The plan is to
**converge on bvn's API in a future major version**, shipping a documented
migration path (ideally an automated codemod) so consumers can update
mechanically rather than by hand.

> **Maintainer rule:** whenever you add or remove a shield/divergence, update
> this file in the same change.

---

## Why we can't "support both with a deprecation"

The two formatter/handler styles below are **indistinguishable at runtime** —
`(value) => …` and `({ value }) => …` are both one-argument functions, and JS
gives no way to ask whether a parameter is destructured. `fn.length` only
disambiguates the multi-arg case (`length >= 2` is definitely the old
positional form); the common single-arg form is ambiguous, so auto-detection
would silently break the majority case. Hence: we keep a single, stable
(positional) contract now, and converge later via an **explicit, source-level
migration** (a codemod sees the actual AST, so it *can* disambiguate).

---

## Active divergences

### 1. Table field `formatter` signature

| | |
| --- | --- |
| **Our API** | positional `(value, key, item) => string` |
| **bvn API (≥ 0.43)** | single object `({ value, key, item }) => string` |
| **Shielded in** | `resources/js/components/base/DTable.vue` → `shieldedFields` computed |
| **Applies to** | `DTable` and `DXTable` field definitions (`field.formatter`) |
| **Introduced** | bvn 0.43; shield added when bumping bvn 0.40.8 → 0.45.6 (library 0.6.0) |

**Why:** bvn moved the formatter from positional args to a single object.
Without the shield, every consumer's `formatter: (value) => …` would silently
receive the whole `{ value, key, item }` object as `value` — producing
`$[object Object]` / `NaN` with **no TypeScript error** (the type is still
`(value, …) => string`). A silent runtime break is the worst kind.

**Convergence (future major):** delete the wrap in `shieldedFields` so field
formatters pass straight through to bvn. Consumers change:

```diff
- formatter: (value, key, item) => `$${value.toFixed(2)}`
+ formatter: ({ value, key, item }) => `$${value.toFixed(2)}`
```

**Codemod:** automatable at the source level. A jscodeshift / ast-grep
transform finds `formatter:` properties inside field-definition arrays/objects
and rewrites the first parameter to a destructured object
(`(value) =>` → `({ value }) =>`, `(value, key, item) =>` →
`({ value, key, item }) =>`), leaving the body untouched. The source codemod
can disambiguate the single-arg case that runtime detection cannot.

---

### 2. Table `row-clicked` event payload

| | |
| --- | --- |
| **Our API** | three positional args `(item, index, event)` |
| **bvn API (≥ 0.43)** | single object `{ item, index, event }` |
| **Shielded in** | `resources/js/components/base/DTable.vue` → `handleRowClicked` |
| **Applies to** | `DTable` `@row-clicked`; surfaced through `DXTable` (`rowClicked` event → `handleRowClick(item, index, event)`) |
| **Introduced** | bvn 0.43; shield added at library 0.6.0 |

**Why:** part of the same bvn 0.43 single-object refactor across table emits.
Re-emitting the historic positional shape preserves consumers' handlers.

**Convergence (future major):** re-emit bvn's object payload. Consumers change:

```diff
- <DXTable @row-clicked="(item, index, event) => open(item)" />
+ <DXTable @row-clicked="({ item, index, event }) => open(item)" />
```

**Codemod:** automatable — rewrite `@row-clicked` / `rowClicked` handler
signatures from positional to a destructured object.

---

### 3. `DButton` `icon` — glyph-name string vs bvn boolean

| | |
| --- | --- |
| **Our API** | `icon?: string` — a Bootstrap Icons glyph name (`icon="save"` → `<i class="bi bi-save">`) |
| **bvn API** | `icon?: boolean` — icon-button styling mode (inherited from `BLinkProps`) |
| **Shielded in** | `resources/js/components/base/DButton.vue` (declared prop + template) |
| **Applies to** | `DButton` |
| **Introduced** | issue #76 |

**Why:** #76 wanted a terse leading-icon API (`icon="save"`) matching the admin
apps being migrated onto this library. `icon` is the natural name, but bvn
already uses `icon` as a `boolean`. Because we declare `icon` as a prop it's
stripped from `$attrs`, so bvn's boolean icon-button mode is **unreachable**
through `DButton`. This is a type-incompatible takeover, not a pass-through.

**Convergence (future major):** to be decided — either rename our prop (e.g.
`leadingIcon`) and restore bvn's boolean `icon`, or keep the string form and
drop bvn's boolean mode deliberately. A codemod can rewrite `icon="name"` call
sites either way. Tracked alongside the icon-strategy spike (#77).

---

### 4. `DButton` `loading` / `loadingText` — anti-flash override of bvn's native loading

| | |
| --- | --- |
| **Our API** | `loading`/`loadingText` drive an **anti-flash** spinner (delayed show + minimum display), rendered by us |
| **bvn API** | `BButton` has native `loading`/`loadingText`/`loadingFill` that show a spinner **immediately** |
| **Shielded in** | `resources/js/components/base/DButton.vue` (declared props + spinner state machine) |
| **Applies to** | `DButton` |
| **Introduced** | issue #76 |

**Why:** #76 asked for the anti-flash behaviour (no spinner for sub-`spinnerDelay`
actions; a `minSpinnerTime` floor once shown) that bvn's immediate spinner
doesn't provide. Same prop names and types as bvn, but we intercept them so
bvn's native loading never fires — the behaviour differs. `loadingFill` is not
re-exposed. Unlike #1/#2 this is an *enhancement* of a same-typed prop, so it's
source-compatible with bvn; only the runtime timing differs.

**Convergence (future major):** decide whether the anti-flash timing becomes the
default everywhere or an opt-in, then either keep this override or delegate to
bvn. No consumer source change needed (types match); document the timing
behaviour in the changelog.

---

### 5. `DFormSelect` `null` option value — round-trips where bvn drops it

| | |
| --- | --- |
| **Our API** | a `select` option with `value: null` (and a `null` model) selects/round-trips correctly; emit stays `null` |
| **bvn API** | `BFormSelect` renders the option's value as a plain `value` attribute, so `null` is omitted → the browser uses the option **text** as its value and a `null` model matches nothing (renders blank) |
| **Shielded in** | `resources/js/components/base/DFormSelect.vue` (intercepts `options`/`modelValue`, maps `null` ↔ a private sentinel) |
| **Applies to** | `DFormSelect` |
| **Introduced** | issue #81 |

**Why:** legacy Bootstrap-Vue (BS4) handled a `null` option value; bvn's
`BFormSelect` does not. A "None"/"no selection" option stored as `null` is very
common, so without this every consumer repeats a sentinel workaround. Same prop
names/types as bvn (`options`, `modelValue`) — this is a same-typed behavioural
enhancement (like #4), source-compatible with bvn; only the `null`-handling
runtime behaviour differs. The sentinel is internal and never leaves the
component (the consumer's model and emitted value stay `null`).

**Known limitation:** the sentinel is decoded on the model/emit boundary but
**not** inside bvn's `option` scoped slot — a consumer using
`<template #option="{ value }">` receives the private sentinel string (not
`null`) for the null option. Nothing in this library uses that slot, and
decoding it would mean special-casing the slot name in the forwarder (against
the "don't enumerate known slots" rule), so it's left as-is until a consumer
needs it.

**Convergence (future major):** if a future bvn fixes `null` option handling
natively, drop the encode/decode in `DFormSelect` and pass straight through. No
consumer source change needed (types match); document in the changelog.
(Radios likely need the same treatment — tracked in #81.)

**Re-checked at bvn 1.2.4 (#249): candidate to converge.** The model
round-trip described above does NOT fail in raw bvn, in 1.2.4 or 0.45.6:
`BFormSelect` uses Vue's `vModelSelect`, which matches on the option's
`_value`, so a raw `null` option is selected for a `null` model and emits
`null` when chosen (probed both versions). What the shield still changes is
the DOM: raw bvn renders the `null` option with no `value` attribute, so a
native form post or `new FormData(form)` sends the option's text; ours sends
the private sentinel. Neither is a useful posted value, so converging costs
consumers nothing they rely on. Decide in the convergence major.

---

### 6. `DAlert` `modelValue` default — visible by default instead of bvn's hidden

| | |
| --- | --- |
| **Our API** | `modelValue` defaults to `true`, so a bare static `<DAlert variant="info">…</DAlert>` renders visible |
| **bvn API** | `BAlert` defaults `modelValue` to `false`, so a bare static alert renders **nothing** |
| **Shielded in** | `resources/js/components/base/DAlert.vue` (declared `modelValue` prop, default `true`, re-bound explicitly) |
| **Applies to** | `DAlert` (NOT `DToast` — see below) |
| **Introduced** | issue #144 |

**Why:** BAlert's hidden-by-default is a footgun for the common case — a static,
always-shown alert — which then renders nothing with no error (it bit our own
docs repeatedly). Same prop name and type as bvn (`boolean | number`, where a
number is the auto-dismiss duration in ms), so it's source-compatible; only the
default differs. Every call site that passes `v-model`/`:model-value` is
unaffected — only the bare-static case (which was always a bug) changes. Like
#4/#5 this is a same-typed behavioural enhancement. `emits` is left undeclared
so an `update:modelValue` listener still flows through `$attrs` to `BAlert` and
`v-model` dismissal round-trips.

**Not `DToast`:** toasts are shown imperatively (via `useToast().create(…)`),
not by statically placing a `<DToast>` with a truthy model — so hidden-by-default
is semantically correct there and is left as bvn ships it.

**Convergence (future major):** if a future bvn makes alerts visible by default
(or the wrapper is dropped), remove the default. No consumer source change
needed (types match); document in the changelog.

---

### 7. `DFormFile` `v-model` set to `null` (or `[]`) also clears the native input

| | |
| --- | --- |
| **Our API** | setting the model to `null`, or to `[]` with `multiple`/`directory`, clears the selection, the file-name text **and** the native input (the wrapper sets the input's `value` to `''`) |
| **bvn API** | `BFormFile`'s model watcher clears its file list and, on `null` only, the `plain` input; in the custom control the hidden `input[type=file]` keeps the files, and `[]` leaves the `plain` input holding them too |
| **Shielded in** | `resources/js/components/base/DFormFile.vue` (a watch on BFormFile's own `modelValue` prop) |
| **Applies to** | `DFormFile` |
| **Introduced** | issue #221 |

**Why:** with bvn alone, a form that clears its file field by setting the
model to `null` (or `[]`) shows "No file chosen" but still posts the old
files in a plain submit or `new FormData(form)`. Same prop and type as bvn;
only the runtime behaviour differs, and only towards what the UI already
shows. The wrapper empties the input itself rather than calling bvn's
`reset()`, which would also set the model to `null` and echo an extra
`update:modelValue` back to the parent. Clearing `value` is what bvn's
`reset()` does to the input (through vueuse's `useFileDialog`), so choosing
the same file again still fires `change`.

**Convergence (future major):** if bvn's watcher starts clearing the native
input on `null` and `[]`, drop the watch. No consumer source change needed.

**Re-checked at bvn 1.2.4 (#249): still needed.** The watcher is unchanged:
`null` clears the file list and the `plain` input only, `[]` clears neither.

---

### 8. `DFormFile` ignores dropped files while disabled

| | |
| --- | --- |
| **Our API** | a disabled `DFormFile` (the `disabled` prop, or inside a disabled `DFormGroup`/`<fieldset>`) shows no drop overlay and ignores a dropped file; the browser does not open the file either |
| **bvn API** | `BFormFile`'s drop handler checks only `noDrop`, so a disabled control shows the overlay, sets the model to the dropped `File` and puts it in the hidden input |
| **Shielded in** | `resources/js/components/base/DFormFile.vue`: capture-phase `dragenter`/`dragover`/`dragleave`/`drop` listeners on BFormFile's root stop the events while the native input is `:disabled`, which covers both the `disabled` prop and a disabled fieldset (which attrs cannot see) |
| **Applies to** | `DFormFile` |
| **Introduced** | issue #221 |

**Why:** a disabled field must not change. The listeners sit on BFormFile's
root, an ancestor of the drop zone where vueuse's `useDropZone` listens, so
the capture phase reaches them first (a bubble-phase listener on the root
would run after the drop zone's: pinned by the fieldset drop tests).
`dragleave` is stopped too, or `useDropZone`'s enter/leave counter drifts and
the overlay sticks once the control is enabled again. Only behaviour
changes; no prop or type does.

**Convergence (future major):** if bvn's drop handler starts checking
`disabled` (and the fieldset), drop the listeners. No consumer source change
needed.

**Re-checked at bvn 1.2.4 (#249): still needed.** `useDropZone`'s `onDrop`
still checks only `noDrop`.

---

### 9. `DFormCheckbox` `uncheckedValue` defaults to `false`

| | |
| --- | --- |
| **Our API** | an unticked `DFormCheckbox` emits `false` unless the consumer passes `unchecked-value` |
| **bvn API (≥ 0.46)** | `BFormCheckbox`'s `uncheckedValue` defaults to "no value" (`undefined` in 1.2.4; the 0.46.0 notes say `null`), so an unticked box emits `undefined` |
| **Shielded in** | `resources/js/components/base/DFormCheckbox.vue` (`uncheckedValue: false` spread before `$attrs`) |
| **Applies to** | `DFormCheckbox`, so `DXSwitch` and `DXField`'s `checkbox`/`switch` types too |
| **Introduced** | bvn 0.46; shield added when bumping bvn 0.45.6 → 1.2.4 (library 0.49.0, #249) |

**Why:** a boolean field that unticks to `undefined` drops out of a JSON
body, and to `null` fails Laravel's `boolean` rule; `form.data.flag === false`
checks break too. Every boolean field in a consuming app would need
`unchecked-value` added. The default is set as an attr, not a declared prop:
the consumer's attrs spread after it, so their value wins in either spelling,
an explicit `:unchecked-value="undefined"` opts into bvn's behaviour, and
Vue's Boolean prop casting never turns `unchecked-value=""` into `true`.
Inside a `DFormCheckboxGroup` the default is inert (the model is an array).
One side effect: bvn's `useDefaults` prefers a passed prop over app-wide
defaults, so a `BFormCheckbox.uncheckedValue` set through `DApp`/`BApp`
`defaults` (or `createBootstrap`) no longer reaches `DFormCheckbox`; set
`unchecked-value` on the component instead.
Pinned by `tests/components/checkbox-unchecked-value.test.ts`.

**Convergence (future major):** drop the default. Consumers who post booleans
add `:unchecked-value="false"` (a codemod can add it to every `DFormCheckbox`
and `DXSwitch` with a `v-model` and no `unchecked-value`), or DXField
normalises its own boolean types.

---

### 10. `useToast()`: `create` shows the toast and removes it once hidden; `show` and the `options` argument kept

| | |
| --- | --- |
| **Our API** | bvn 0.45's: `create(obj)` with no `modelValue` shows the toast for 5 s; a hidden toast is removed from the store unless `{ keep: true }`; `show(obj)` is an alias of `create`; `create(obj, options)` takes the orchestrator options as a second argument |
| **bvn API (≥ 0.46)** | `create(obj)` registers the toast **hidden** until `.show()` is called on the returned controller; a hidden toast stays in the store (and the DOM) until the calling component's scope is disposed; `keep` is gone; `show` is gone; options go in `obj.options` |
| **Shielded in** | `resources/js/composables/useToast.ts` (`prepareParam`) |
| **Applies to** | this library's `useToast` (bvn's own `useToast` is not re-exported under that name) |
| **Introduced** | bvn 0.46 (the orchestrator refactor; not called out in bvn's changelog); shield added at library 0.49.0 (#249) |

**Why:** the documented call, `toast.create({ body, variant })`, would show
nothing with no error, and every toast a long-lived page (an Inertia
persistent layout, a DXTable's editor) showed would stay in the DOM. bvn 0.45
defaulted `modelValue` to 5000 and its orchestrator destroyed a toast on
`hidden` unless `keep`; the shield restores both for a plain-object param:
it chains an `onHidden` after the caller's own (a `preventDefault()` there
keeps the toast, as in 0.45) and destroys the toast a microtask later.

**Not shielded:**
- A ref param is passed through untouched (it always was, so its variant is
  not themed either): no default duration, no folded options, no removal. A
  `reactive()` param is copied, so later changes to it do not reach the toast
  (0.45 and raw 1.x both tracked it).
- `create` returns bvn 1.x's controller rather than 0.45's awaitable
  `PromiseWithComponent`, so `await toast.create(...)` no longer waits for the
  toast to close; use `await toast.create(...).show()`. TypeScript does not
  catch a bare `await` of a non-promise, so this fails silently.
- Toast order: 1.x renders toasts in insertion order (newest last) and never
  reads `appendToast`; 0.45 put the newest first unless appending. Restoring
  it would mean reordering bvn's rendering, so it is documented instead.

`hide`/`hideAll` (bvn 1.2) pass through. Pinned by
`tests/composables/useToast.test.ts`; the removal tests deliver the `hidden`
event through the store item's handler because this harness never completes
an orchestrated toast's leave transition, so removal in a real browser is
checked by hand on the DToaster docs demo.

**Convergence (future major):** drop the default, the removal, the alias and
the second argument. Consumers change `create(obj)` to `create(obj).show()`
(or set `modelValue`), `show(obj)` to `create(obj).show()` and
`create(obj, options)` to `create({ ...obj, options })`, all mechanical for a
codemod; the removal needs either `controller.destroy()` after `show()`
settles, or an upstream fix.

---

## Components that are NOT wrapped (raw bvn passthrough)

These are exported directly as the underlying bvn component (not a `D*`
wrapper), so they follow bvn's API exactly and carry **no wrapper-stability
guarantee** — a bvn change to them flows straight through to consumers.

- `DCarousel` → `BCarousel`, `DCarouselSlide` → `BCarouselSlide`
  (bvn 0.45 registers carousel slides by scanning slot vnodes for the slide
  component type, which a wrapper component in between breaks. See
  `resources/js/index.ts`.)

---

## Notes for a future convergence release

- Roll all convergences into **one major version** so consumers migrate once.
- Ship a **codemod** (jscodeshift or ast-grep) plus a migration guide with
  before/after examples. The test suite (`tests/`) and the playground are the
  guardrails — convergence is mechanical with clear instructions.
- On convergence, remove the converged entry from this file and document the
  break in `CHANGELOG.md`.

---

## `DAutocomplete` — the clear (✕) is hidden when there is nothing to clear

**bvn:** `BAutocomplete`'s `hasSelection` excludes only `null` and `undefined`,
so an **empty string counts as a selection** and the clear button renders on an
empty field.

**Ours:** `DAutocomplete` treats `''` (and an empty array, for `multiple`) as *no
value* and forces `no-clear-button` in that state.

**Why:** `DXTable` renders this control for every `select` column filter, so a
freshly loaded table showed a ✕ on every empty filter — reading as "these have a
value you should clear" when they don't, and putting an inert button in the tab
order (#108). A consumer's explicit `no-clear-button` still wins; the shield only
ever *hides* the button, never forces it on.

**Convergence:** drop the shield if bvn tightens `hasSelection` to exclude the
empty string.

---

---

## `DTab` is a raw re-export of `BTab`, not a wrapper

**bvn:** `BTabs` decides which tab to activate on mount by scanning its slot
vnodes for the `BTab` component type (its initial-selection branch is gated on
`tabElementsArray.length > 0`).

**Ours:** `DTab` re-exports `BTab` directly — the same exception `DCarousel` /
`DCarouselSlide` already carry, and for the same reason.

**Why:** a wrapper component in between hides `BTab` from that scan, so `BTabs`
found no tabs to select and **no pane got `active`/`show`**: the tab nav rendered
and every body was invisible until the user clicked one (#119). Bisected —
`BTabs`+`BTab` and `DTabs`+`BTab` both activate the first tab; `BTabs`+`DTab`
does not, so it is the *child* wrapper, and only the child, that has to go.
`DTabs` stays a wrapper.

**Known upstream limitation** (not caused by this): an explicit `active` on a
NON-first tab is not honoured — raw `BTabs`+`BTab` also lands on index 0.

**Convergence:** none needed — the API is identical, since `DTab` was a pure
passthrough.

---

# Upstream bootstrap-vue-next defects (to triage / report)

Found while porting during the 0.24–0.26 run. We carry a shield or a workaround
for each; **reporting them upstream is how we eventually drop those shields.**
Not yet reported — captured here so the evidence isn't lost.

### 1. An empty-string option value blanks the ENTIRE option list

`BAutocomplete` (and anything built on the same combobox) renders **no options at
all** if *any* option's `value` is `''` — not just that entry, the whole list.

```text
options [{value: '',       text: 'All statuses'}, {value: 'pending', …}]  ->  []
options [{value: '__all__', text: 'All statuses'}, {value: 'pending', …}]  ->  ['All statuses', 'pending']
```

The obvious encoding of a "no filter" / "All x" option therefore silently empties
the dropdown. **Our shield:** `DXTable`'s `FILTER_ALL_VALUE` sentinel, translated
back to `''` on the way out. Pinned by a contrast test in
`tests/components/DAutocomplete.test.ts`. **Still present in bvn 1.2.4**
(#249: the contrast test still passes); 1.0.2's "BFormSelect preserves an
empty-string modelValue" fix is a different component.

### 2. `BTable` captures its slot set at mount

A `cell(<key>)` slot that comes into existence *after* mount never reaches the
cells — the column renders raw values as though no slot existed. Verified against
**raw `BTable`**, so it isn't a wrapper artefact. Breaks data-driven columns
(column set known only once a fetch resolves).

**Our shield:** the inner table is keyed on the forwarded slot-name set, so it
remounts when the column set changes (#114).

### 3. `BAutocomplete` doesn't re-derive its display text when async options arrive

It resolves the input's display text from `modelValue` **at mount** and never
re-derives it when `options` change. With an `optionsLoader` the field sits there
showing the raw id (`51` instead of `Waitrose`) — and a long list is precisely the
case that loads async.

**Our shield:** `DXField` holds a `searchable` select until its options resolve
(#105).

### 4. `BTabs` identifies its tabs by scanning slot vnodes (wrapper-hostile)

`BTabs` decides which tab to activate by scanning its slot vnodes for the `BTab`
component type (gated on `tabElementsArray.length > 0`), so **any wrapper between
them hides the tabs** and no pane gets `active`/`show`. Same shape as
`BCarousel`/`BCarouselSlide`.

**Our shield:** `DTab` is a raw re-export of `BTab` (see above). Related upstream
limitation found alongside it: an explicit `active` on a **non-first** tab is not
honoured — raw `BTabs`+`BTab` also lands on index 0.

### 5. `BFormFile` ignores its `BFormGroup`, keeps a file the model cleared, and takes drops while disabled

Three gaps found reviewing `DFormFile` (bvn 0.45.6):

- `BFormFile` never injects the form-group key, so a `BFormGroup`'s `state`
  and `disabled` do not reach it (`BFormInput` and friends read both). The key
  (`formGroupKey`) is not exported from any public bvn entry, so a wrapper
  cannot read it without depending on a private string. **Our workaround:**
  documented; consumers set `state` on `DFormFile` too. (`disabled` still
  reaches it natively: a `BFormGroup` always renders a `<fieldset>`, which
  disables the button and the native input.)
- Its `modelValue` watcher clears the file list and the `plain` input but not
  the hidden input of the custom control, so a `null` model still submits the
  old file (and on `[]` it clears neither input). **Our shield:** active
  divergence #7.
- Its drop handler (vueuse `useDropZone`'s `onDrop`) checks only `noDrop`,
  never `disabled`, so a disabled control (the prop or a disabled fieldset)
  shows the drop overlay and accepts a dropped file into the model and the
  hidden input. **Our shield:** active divergence #8.

Related, styling only: the state class sits on `.b-form-file-control`, deep
inside the root, so Bootstrap's `.is-invalid ~ .invalid-feedback` cannot show
a sibling feedback. **Our workaround:** a `:has()` rule in `theme.scss`.
