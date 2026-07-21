# Theme / chrome polish — nav-tabs, header-less toast, soft-badge overridability

Status: DONE 2026-07-21. Origin: app-next cutover review (findings B4, B5, SA8).
Three small, independent CSS/theme fixes, each with a downstream interim to
retire.

All three landed in `resources/css/theme.scss`, guarded by
`tests/components/theme-chrome-polish.test.ts` (13 assertions; the theme is
compiled from **source** via `theme.scss?inline` so the guard tracks the file
you edit rather than whatever `dist/` happens to be on disk). Item 3's second
ask turned out to be **already satisfied** — see the note under it.

All three downstream interims can now be dropped.

---

## 1. nav-tabs inactive links are too heavy (greendragon B4, product page Q4)

**Problem.** `.nav-tabs .nav-link` inactive colour is the saturated link-blue
(`--bs-nav-link-color`), which reads heavy on a tabbed form (the product page's
Overview / Selling / Web Shop tabs). Legacy omnitend used **muted grey** inactive
tabs with a dark active tab — chrome recedes, content leads (same ethos as the
grey table headers, #157).

**Ask.** Soften `.nav-tabs` inactive links to a muted/secondary colour by default;
the active tab keeps its dark active-color.

**Downstream interim:** shell.css remaps `--bs-nav-link-color:
var(--bs-secondary-color)` on `.nav-tabs`.

**Done.** theme.scss now sets, on `.nav-tabs`:

```scss
--bs-nav-link-color: var(--bs-secondary-color);   // ~#585b5e, 6.83:1 on white
--bs-nav-link-hover-color: var(--bs-body-color);  // #212529, 16.1:1
```

Driven purely through Bootstrap's own `--bs-nav-*` tokens, so a consumer can
re-louden one tab set by resetting the same variable and `[data-bs-theme="dark"]`
remaps for free. The active tab is untouched — it keeps
`--bs-nav-tabs-link-active-color` (the near-black emphasis colour), which is now
the only strong colour in the row.

---

## 2. header-less toast is misaligned (greendragon B5, product page Q6)

**Problem.** A toast created with only a `body` (no `title`) renders
`.toast > .d-flex > (.toast-body + .btn-close)` where the flex row is
`align-items: normal` (not centred) and `.toast-body` keeps the reduced TOP
padding (`4px 12px 12px`) meant for sitting under a `.toast-header`. So the
message hugs the top while the close X sits centred — it reads as misaligned.
Every app-next toast hits this: the greendragon toast bridge always passes
`body`, never `title`.

**Ask.** For a header-less toast, centre the body/close row (`align-items:
center`) and use symmetric body padding.

**Downstream interim:** shell.css centres `.toast > .d-flex` and evens
`.toast-body` padding.

**Done**, scoped structurally to `.toast:not(:has(.toast-header))` so the
with-header case keeps its (correct) reduced top padding:

```scss
&:not(:has(.toast-header)) {
  > .d-flex { align-items: center; }
  .toast-body { padding-top: var(--bs-toast-padding-x); }
  .btn-close-custom { margin-block: 0; }
}
```

Two things the original write-up missed, both found while implementing:

- bvn renders the `.d-flex` wrapper whenever there is body content — **with or
  without a header** (the close button is what's conditional). So `:has()` is
  genuinely needed; an adjacent-sibling selector wouldn't work either, because
  with a header the body is nested inside that `.d-flex`, not a sibling of the
  header.
- bvn's own `.toast .btn-close-custom { margin: <pad> <pad> auto }` pins the X
  with an **auto margin**, which outranks `align-items` — centring alone left it
  where it was. Hence `margin-block: 0`.

`:has()` is supported in every evergreen browser (Chrome/Edge 105+, Safari 15.4+,
Firefox 121+); a browser without it just keeps today's slightly-off alignment.

---

## 3. soft `.text-bg-*` overrides are hard to override (greendragon SA8)

**Problem.** The soft-colour system's `.text-bg-secondary:not(.toast)` (and
siblings) set `background-color` with **`!important` at specificity 0,2,0** (the
`:not()` adds a class-weight). A consumer that needs a fully custom-coloured
badge — e.g. greendragon's `ot-sale-paid-by-badge`, which paints cash green /
card grey / etc. from a per-value palette — cannot override with a normal
`.my-badge { background: … !important }` (0,1,0 or 0,2,0): it *ties or loses* the
`!important` cascade and the pale soft colour wins. greendragon had to escalate
to a repeated-class 0,3,0 selector to win, which is a smell.

**Ask (either or both):**

- **Lower the specificity** of the soft `.text-bg-*` overrides (drop the
  `:not(.toast)` in favour of a mechanism that doesn't inflate specificity — e.g.
  scope the toast exception differently), so a single-class consumer rule with
  `!important` can override.
- **A variant-less badge.** `DBadge` always applies a `text-bg-<variant>` (default
  `secondary`), so a badge whose colour is entirely custom still inherits the soft
  grey and must fight it. A `variant="none"` (or `:variant="null"`) that emits
  **no** `text-bg-*` class would let a custom-coloured pill stand alone.

**Downstream interim:** a repeated-class (0,3,0) `!important` rule to beat
`.text-bg-secondary:not(.toast)`.

### Done — 1. specificity lowered with `:where()`

`:where()` contributes **zero** specificity while matching exactly what its
argument would, so the exclusion can stay and the selector still counts as one
class:

| | before | after |
|---|---|---|
| soft `.text-bg-*` | `.text-bg-secondary:not(.toast)` — **0,2,0** | `.text-bg-secondary:where(:not(.toast))` — **0,1,0** |
| progress fill | `.progress-bar.bg-success` — **0,2,0** | `:where(.progress-bar).bg-success` — **0,1,0** |

Both carry `!important`, so specificity was the only tiebreak and a consumer's
single-class `!important` rule tied-and-lost on source order. At 0,1,0 the
consumer's rule (loaded after the library's stylesheet) wins, as it should. We
still beat Bootstrap's own `.text-bg-*` / `.bg-*` helpers, which are 0,1,0
`!important` too but are imported **above** this block.

**Audit of the rest of the `@each $name, $v in $dx-variants` loop:** those two
were the only specificity-inflating selectors. `.btn-#{$name}`,
`.btn-outline-#{$name}` and `.alert-#{$name}` are all plain 0,1,0 and set only
custom properties (no `!important`), so a consumer overriding either the
`--bs-btn-*`/`--bs-alert-*` variable or the property itself already wins.
Elsewhere in theme.scss the only other `!important` rules are the `.shadow*`
utilities, which are 0,1,0 and mirror Bootstrap's own.

### Already satisfied — 2. the variant-less badge

**No new prop was added, and none is needed.** bvn's `useColorVariantClasses`
emits ``[`text-bg-${variant}`]: variant !== null``, and `BBadge`'s prop default
is `secondary` — so `<DBadge :variant="null">` **already** renders with no
`text-bg-*` class today. The trap is that `undefined` does *not* work: Vue
substitutes the prop default for `undefined`, so only an explicit `null` opts
out. Adding a `variant="none"` would have been a second spelling for something
that already exists.

Action taken instead: documented on the DBadge docs page
(`docs/src/pages/components/base/DBadge.mdx`, "Custom colours: opting out of the
variant") and pinned by three assertions in the guard test — `null` → no
`text-bg-*`, no variant → `text-bg-secondary`, `undefined` → `text-bg-secondary`.

**Also documented (SA8's first bug, consumer-side):** a component whose template
**root is `<DBadge>`** cannot style it with a *scoped* rule — the `data-v` id
doesn't reach the child component's rendered root across the built-bundle
boundary, so the rule ships but matches nothing. That gotcha is now called out at
the end of the same docs section.
