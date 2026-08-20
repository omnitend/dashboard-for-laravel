# DModal: declare `modelValue` as a prop (attrs-only visibility breaks under @vue/compat)

Status: OPEN — **P1 for any consumer on a `@vue/compat` bundle.** Origin: a
consumer found that NONE of its ~50 modals opened, on any page, and had never
opened. 2026-08-20.

## Symptom

A consumer page renders:

```vue
<d-modal v-model="isOpen" title="Edit thing">…</d-modal>
```

and the modal never appears. No console error, no warning, nothing thrown. The
page underneath is fine; the click handler runs; reactive state updates (a
`:title` bound to the same state re-renders correctly). The modal element simply
stays `display: none`.

## What the evidence actually says

Measured on the consumer app across four pages, and against an older build to
rule out a recent regression:

1. **`:model-value="true"` written literally → the modal renders OPEN.** So the
   prop path works and `BModal` is fine.
2. **A bound value going `false` → `true` produces no change at all.** A
   `MutationObserver` on the modal element's `class`/`style` records *zero*
   mutations after the state flips. It is not opening-and-immediately-closing —
   the update never arrives.
3. Every other dfl component driven by `v-model` from the same pages works
   (`DFormInput`, `DFormSelect`, `DXTable`'s `v-model:filters`/`:sort-by`, and
   DXTable's OWN editor modal).
4. **Other attrs on the very same `DModal` DO update after mount.** A `:title`
   bound to reactive state re-renders, and an `:ok-title` that only resolves
   after an async fetch appears correctly. So this is not "attrs are frozen" —
   it is specific to the visibility model.

## Cause — what is established, and what is inference

Established: `DModal` declares no props (`<BModal v-bind="$attrs">`), so a
consumer's `modelValue` reaches `BModal` through the attrs spread rather than as
a declared prop on the wrapper; and in that arrangement it takes effect only at
mount, while sibling attrs on the same element keep updating (point 4).

Inference, offered as a lead rather than a diagnosis: the consumer compiles its
SFCs with `compatConfig: { MODE: 2 }` while dfl ships pre-compiled against real
Vue 3, and `v-model` handling is one of the things that differs across that
seam. Worth checking whether `BModal` seeds internal visibility state from
`modelValue` at setup and syncs through a watcher that the forwarded value does
not trigger — that would fit every observation above, including point 4.

Note the counter-example before concluding "attrs-only components are broken":
`DFormSelect` is also attrs-only and its `v-model` works. Whatever the
mechanism, the reliable remedy is the same — declare the model.

## Why it is worth fixing upstream rather than in the app

- It is silent by construction. A dead modal produces no error and no visual
  diff (the page it sits on renders normally), so a console gate, a screenshot
  diff and a smoke suite all pass. Only a human clicking the exact control finds
  it, which is how this one was found — months late.
- It affects a whole class of components, not one page: any consumer modal.
- `@vue/compat` is the standard migration path onto Vue 3, so any Vue-2 app
  adopting dfl incrementally hits this on day one and has no way to diagnose it.

## Ask

1. **Declare the model on `DModal`**: `modelValue` (boolean) + an
   `update:modelValue` emit, bound explicitly to `BModal` rather than arriving
   through `$attrs`. Everything else can keep flowing through `v-bind="$attrs"`.
2. **Audit the other attrs-only pass-throughs** for the same shape — any
   component that forwards a model purely through `$attrs` has this bug latent.
   A declared model on each is the general fix.
3. Optional but valuable: a note in the docs that a component's model should be
   a declared prop, precisely so it survives a compat-compiled consumer.

## Interim in the consumer

A house `OtModal` wrapper renders `<d-modal v-if="modelValue" :model-value="true" …>`
— mounting the modal only while it should be open, so the value read at mount is
always correct — and maps `update:model-value`/`hidden`/`close` back to the
consumer's `v-model`. A codemod swapped every `<d-modal>` for it (50 across 37
files). Cost: no open/close fade, and the body is re-created per open. The
wrapper is deleted the day DModal declares its model.

A browser check now asserts a representative modal of each shape actually
displays after a click — verified to go red against the pre-fix build. Worth
mirroring in dfl's own test suite in whatever form fits.
