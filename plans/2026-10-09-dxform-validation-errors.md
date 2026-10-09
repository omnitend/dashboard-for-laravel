# DXForm: validation errors that are always visible (#194, remainder)

Date: 2026-10-09. Builds on PR #198 (#194 items 4 and 5: no tab jump when an
error clears; error tab picked from visible fields). This plan covers the rest
of #194 and the active-tab state the review of #198's first version exposed.

## The problem, in the user's words

"A 422 can be invisible." After a failed save the user must always be able to
see every message the server returned, near where they clicked Save, and the
form must take them to the first problem. Today:

1. Field errors suppress the form-level alert (`useForm.shouldShowMessage`
   requires `hasErrors === false`), so an error for a key with no rendered
   field, or a nested key, shows nowhere.
2. The alert sits at the top of the form, off screen on long or tabbed forms.
3. Fixing the last field error brings the generic message back.
4. Nested keys (`lines.0.price`) and media keys (`image_media.<uuid>`) don't
   resolve to their field, so tab selection misses them and labels are raw.
5. A submit button outside DXForm (DXTable's modal footer) has no summary
   beside it.
6. DXTable's create/edit modals toast only the first error for 5 s.
7. The active tab is index-based and fights bvn, which tracks tabs by id:
   errors present at mount never select their tab, an initial
   `v-model:active-tab` other than 0 is reset (every `DTab` carries
   `:active="index === 0"`), and the attempted patch (branch
   `wip/194-tab-state`) broke on reorder, hidden earlier tabs, parent-rejected
   updates and tab keys in ids.

**Done means**: for every 422 shape (unrendered keys, mixed, nested only,
message only, hidden-field keys), exactly one visible validation summary next
to the submit control lists every message with a readable label, survives
edits, and clears on the next submit or a success; the form is on the first
tab holding a visible error, scrolled to it. A metric that improves while a
message is still unseen does not count.

## Design: three owners

Each concern gets exactly one owner; nothing else writes its state.

### 1. `useForm` owns "what the last submit failed with"

DXForm never submits by itself (it emits `submit`; consumers and DXTable call
`form.post()`), so only `useForm` sees every submit.

- New state `form.submitFailure: { message: string; errors: ValidationErrors } | null`.
  Set in `submit()`'s catch from `errorsFromLaravel(err)` (a copy, not the live
  `errors` object). Cleared when a submit starts and on success. **Not**
  touched by `clearError`, `clearErrors`, `setErrors` or edits.
- Also expose `form.submitCount` (incremented when a submit fails) so watchers
  can react to "a submit failed", including a `preserveErrors` resubmit that
  returns the same set (the documented gap in #198).
- `shouldShowMessage` keeps its current meaning (back-compat for consumers
  rendering their own alert).

### 2. A pure resolver owns "which field does this error key belong to"

New `resources/js/utils/formErrorTargets.ts` (no Vue), used by tab selection,
scrolling and the summary, so they can never disagree:

```ts
resolveErrorTargets(errors, { fields, tabs, isFieldVisible, isTabVisible })
  → Array<{ errorKey, messages, fieldKey | null, tabKey | null, label }>
```

- Owner of an error key, in order: a field whose `errorKeys` pattern matches
  (new field option, `string[]`, `*` matches one dot segment, e.g.
  `['lines.*', 'lines.*.*']`); a field whose key equals it; a field whose key
  is a dot prefix of it (repeaters, media maps). Hidden fields and fields on
  hidden tabs never own an error (they fall through to "unowned").
- Labels: the field's resolved label; for a nested key under a repeater whose
  sub-field definitions are known, the sub-field label plus "(line N)" (index
  + 1), e.g. "Price (line 1)"; otherwise the field label alone. An unowned key
  is humanised (`delivery_date` → "Delivery date").
- Message prefixing (from the issue's handover): a row omits "Label: " when
  the message already contains the label (case-insensitive), keeps it when the
  message contains a raw key (`_` or `.`) or when two rows share a message.

### 3. DXForm owns the active tab, tracked by key

- Internal `activeTabKey` is the single source of truth. The public
  `v-model:active-tab` stays an **index** (no API break); it is derived from
  the key and emitted when the key's index changes (including when tabs
  reorder or an earlier tab hides).
- One decision function, run whenever visible tabs, the failure count, or the
  incoming prop change: a newly failed submit (`submitCount` changed) or
  errors present at mount → the first visible tab owning an error (via the
  resolver); else the current key if still visible; else the first visible
  tab. Writes once per decision. An error *clearing* never moves the tab
  (#198's behaviour stays).
- An incoming prop index the parent sets wins; a parent that rejects or
  normalises an emitted index wins after the flush (controlled behaviour).
  Uncontrolled (no binding) works from the key alone.
- DTabs is bound by pane id; ids are opaque and stable per tab key
  (`${useId()}-tab-${n}`, `n` assigned once per key), never derived from the
  key text or position. `:active` is removed.

## Visible output

- **`DXFormErrorSummary`** (new, exported): props `form`, `fields`, `tabs`,
  `context`. Reads `form.submitFailure`, renders one `DAlert` (danger, the
  subtle tint per the colour system) titled with the message, listing each
  target row; a row is a button that selects its tab and scrolls to and
  focuses its field. Renders nothing when `submitFailure` is null. A
  message-only 422 shows just the message.
- **DXForm prop `errorSummary: 'footer' | 'top' | false`, default
  `'footer'`.** Footer renders it directly above the submit button (flat and
  tabbed layouts), never inside a tab pane. When a summary is shown, DXForm's
  existing top alert does not render for that failure (one alert, never two).
  `false` restores today's alert exactly.
  Default rationale: the invisible 422 is a real bug in every tabbed form;
  per the project's "defaults follow battle-tested usage" rule the safe output
  is on by default, recorded in the CHANGELOG, and this ships as a **minor**.
- **Scrolling**: after the decision selects a tab for a failed submit,
  wait for the pane to mount (tabs can be lazy), then `scrollIntoView({ block:
  'nearest' })` the first owned field (DXField root gains
  `data-dx-field-key`). No focus on auto-scroll (avoids phone keyboards);
  clicking a summary row does focus.
- **DXTable modals**: DXTableEditorModal renders `DXFormErrorSummary` in the
  modal footer beside Save, with the inner DXForm on `errorSummary: false`.
  `useResourceEditor` stops toasting the first error for validation failures
  (status 422); non-validation failures keep their toast. Check first: its
  `onError` treats its argument as an errors map, but `useForm` passes the
  `ApiError`; confirm what `Object.values(...).flat()[0]` actually reads.

## Tests (each watched red before its fix)

From the issue, plus the tab cases from `wip/194-tab-state`'s test file
(reuse those tests; do not reuse that implementation). All 422s go through
`form.post()` with a stubbed `fetch` returning a real `Response`.

- Error shapes: only unrendered keys; mixed; only nested keys under a span
  field claimed with `errorKeys`; `errors: {}`; a key on a hidden field. Each:
  exactly one visible alert, beside the submit control, listing every message.
- Editing: the alert survives field edits, the generic message never comes
  back, a successful retry clears it, a new submit clears it before the
  response.
- Tabs: errors at mount; initial index; out-of-range index; all tabs hidden
  and shown; same-tick shrink + error in both orders with a parent-bound
  model; reorder; earlier tab hidden; parent rejects / normalises / acks late;
  clicks; whitespace tab keys produce valid `aria-controls`; `goToErrorTab()`.
- Scroll: the first errored field is in the viewport after a failure on a
  lazy tab (assert with `getBoundingClientRect` against the viewport, not
  presence).
- Summary row click selects the tab and focuses the field (`document.activeElement`).
- `preserveErrors` resubmit with the same set re-selects the error tab.
- DXTable create with three errors: all three visible after 5 s (fake timers).
- Resolver: unit tests for ownership order, globs, labels, prefixing rule.

## Execution

Stacked on #198 (`fix/194-error-tab-min`); rebase on main once #198 merges.

1. In parallel, in separate worktrees:
   - **Lane T (tabs)**: owner 3, DXForm tab state by key. Touches DXForm's
     tab template/logic only. Uses `submitCount` via a stub until lane E lands
     (the parent wires it).
   - **Lane E (errors)**: owners 1 and 2 plus `DXFormErrorSummary` and the
     `errorKeys` field option. Touches `useForm.ts`, `types/index.ts`, new
     files. Does not touch DXForm.
2. **Integration (one writer)**: wire the summary into DXForm (prop, footer,
   one-alert rule), the decision function onto `submitCount` and the
   resolver, scrolling, DXTable modal footer and `useResourceEditor`.
3. Review (Codex, xhigh) with a lane brief; round 2 lists round 1's fixes.
4. Docs: DXForm page (error summary, `errorKeys`, tabs by key), CHANGELOG
   (minor, behaviour change called out), CLAUDE.md DXForm notes.

Stop rule: if a review round again finds new regressions in tab state, stop
and revisit this design with James rather than patch.
