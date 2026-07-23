# Checkbox optical centring + DXSwitch small size

Status: OPEN. Origin: greendragon /menus review round 2, 2026-07-23 (the
menu-product modal's per-line controls).

## 1. Checkbox/radio boxes read HIGH beside their labels (theme)

**Problem.** A `DFormCheckbox` (checkbox or plain switch) with a single-line
label renders its box visibly above the label's optical centre. Bootstrap's
`.form-check-input { margin-top: .25em }` is mathematically right for a 1em box
in a 1.5em line box, but **Poppins' tall ascent puts the text low in its line
box**, so the box reads high — the same optical-metrics issue as the dropdown
caret (B14). James: "the checkbox vertical centering seems like something that
should be fixed upstream".

**Ask.** Theme: nudge `.form-check-input`'s top margin to Poppins' optical
centre (start around `0.3em`–`0.35em`; judge against a rendered screenshot,
not the maths). Constraints:

- Must hold for BOTH single-line and multi-line labels — the margin approach
  (align to the first line) is the right mechanism; do NOT flex-centre the box
  against a whole multi-line label block.
- Check the switch variant too (`.form-switch .form-check-input`) — same
  margin, wider box.
- DXSwitch is unaffected (its box flex-centres internally); this is about the
  plain checkbox/switch renders.

**Downstream interim:** greendragon `ot-menu-product`'s `.ot-menu-price-toggle`
flex-centres one specific single-line checkbox. Retire on ship (and expect
other pages' checkboxes to visibly improve).

## 2. DXSwitch `size="sm"` (component)

**Problem.** DXSwitch's box matches full input height by design, which reads
heavy when repeated — e.g. once per product line in the menu-product modal.
greendragon needed a compact variant and had to hand-roll it, which also
tripped an attrs-forwarding footgun: DXSwitch forwards `$attrs` INWARD, so a
consumer's class lands on the `.form-check` box (not a wrapper), a descendant
selector silently matches nothing, and the theme's own
`.dx-switch .form-check[data-v]` rule outranks a plain class.

**Ask.** A `size?: "sm"` prop on DXSwitch: ~`font-size: 0.875rem`,
`min-height: auto`, `padding: 0.25rem 0.625rem` (the greendragon-trialled
values — a 31px box vs the standard 35px). While there, consider whether the
class/attrs forwarding should keep a stable outer hook (the `.dx-switch`
wrapper div doesn't receive consumer classes today).

**Downstream interim:** greendragon shell-global
`.dx-switch .ot-menu-visible-switch.ot-menu-visible-switch.form-check` rule in
`ot-menu-product.vue`. Retire on ship.
