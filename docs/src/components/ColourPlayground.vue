<script setup lang="ts">
import { reactive, computed, ref } from 'vue';

/*
 * A live colour tuner for the design pass. Each semantic variant has a SOLID
 * pair (button fill + its text) and a SOFT pair (status tint bg + its text).
 * The previews are painted DIRECTLY from these reactive values rather than the
 * real `.btn-*`/`.badge` classes, because Bootstrap bakes each variant's hex
 * into its component rules at build time — a runtime CSS-variable override
 * wouldn't reliably move them. We're judging colour, so representative shapes
 * are enough, and this stays fully live with no rebuild.
 *
 * Seeded with the palette Codex (gpt-5.6-sol) proposed: one rule — solid =
 * actions, soft = status — with each variant's solid and soft in the same hue,
 * and success/danger anchored on Omni Tend's brand tints.
 */

interface Pair {
  solidBg: string;
  solidText: string;
  softBg: string;
  softText: string;
  // The "readable on a light page" shade: outline button border/label, coloured
  // links (.link-{variant}), .text-{variant}. A mid-dark shade that keeps the
  // hue (so outlines are distinguishable) while clearing AA on white.
  emphasis: string;
}

const order = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'] as const;
type Variant = (typeof order)[number];

// Button text is a SAME-HUE tint of the fill (light-hue on dark fills, dark-hue
// on light fills), not pure black/white — the same principle that makes the soft
// badges cohesive. AA-verified. danger is the one exception: on a red dark enough
// to be a proper "delete" red, no same-hue pink tint clears AA (the lightest that
// reads is essentially white), so danger keeps white text.
const seed: Record<Variant, Pair> = {
  // primary IS the Omni Tend brand: a dark navy fill (#151e2d) with light-brand
  // text (#e9f0f8) — bold in presence, calm in hue. Soft is the reverse.
  primary: { solidBg: '#151e2d', solidText: '#e9f0f8', softBg: '#e9f0f8', softText: '#151e2d', emphasis: '#151e2d' },
  secondary: { solidBg: '#475569', solidText: '#e6ebf2', softBg: '#e6ebf2', softText: '#29374a', emphasis: '#475569' },
  success: { solidBg: '#84cc16', solidText: '#203b0e', softBg: '#cdf9b2', softText: '#203b0e', emphasis: '#4d7c0f' },
  danger: { solidBg: '#dc2626', solidText: '#ffffff', softBg: '#f5dff1', softText: '#59194a', emphasis: '#dc2626' },
  warning: { solidBg: '#f59e0b', solidText: '#512d05', softBg: '#fce5c4', softText: '#512d05', emphasis: '#b45309' },
  info: { solidBg: '#2563eb', solidText: '#eef4ff', softBg: '#deebff', softText: '#12376c', emphasis: '#2563eb' },
};

const clone = (source: Record<Variant, Pair>): Record<Variant, Pair> =>
  Object.fromEntries(order.map((v) => [v, { ...source[v] }])) as Record<Variant, Pair>;

const variants = reactive(clone(seed));

// Soft-first button rule: only emphasis (primary/brand) and urgency (danger)
// get a bold SOLID button. Everything else is a SOFT button — secondary is a
// real action; success/warning/info are status colours that rarely act as a
// button, and when they do they stay soft, never a loud fill.
const solidButtonVariants = new Set<Variant>(['primary', 'danger']);
const isSolidButton = (v: Variant) => solidButtonVariants.has(v);
const buttonStyle = (v: Variant) =>
  isSolidButton(v)
    ? { background: variants[v].solidBg, color: variants[v].solidText }
    : { background: variants[v].softBg, color: variants[v].softText };

// --- WCAG contrast ---
const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const ratio = (bg: string, fg: string) => {
  const a = luminance(bg);
  const b = luminance(fg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

// Which of white/dark Bootstrap would auto-pick for a solid fill (higher contrast).
const autoText = (bg: string) => (ratio(bg, '#ffffff') >= ratio(bg, '#0f172a') ? 'white' : 'dark');

// Outline buttons and coloured links use the explicit `emphasis` shade.
const outlineColor = (v: Variant) => variants[v].emphasis;

// --- Filled switch (#158) ---
// The DXSwitch "filled box" fills the whole control green (on) / light red (off)
// with a neutral pill. Its tokens are `color.mix`ed from the base success/danger
// solids in theme.scss, so mirror that maths here to keep the switch preview
// live: tune the success or danger SOLID above and the switch tracks it.
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) =>
  '#' + rgb.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
// color.mix($a, $b, $weightA%) on opaque colours = weighted average.
const mix = (a: string, b: string, weightA: number) => {
  if (!isHex(a) || !isHex(b)) return a;
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const w = weightA / 100;
  return toHex([ar * w + br * (1 - w), ag * w + bg * (1 - w), ab * w + bb * (1 - w)]);
};
const WHITE = '#ffffff';
const BLACK = '#000000';
const switchFills = computed(() => {
  const on = variants.success.solidBg;
  const off = variants.danger.solidBg;
  return {
    onBg: mix(on, WHITE, 50),
    onWell: mix(on, WHITE, 30),
    onLine: mix(on, WHITE, 15),
    onInk: variants.success.softText,
    offBg: mix(off, WHITE, 20),
    offWell: mix(off, WHITE, 10),
    offLine: mix(off, WHITE, 45),
    offInk: mix(off, BLACK, 30),
    pill: '#ced4da',
  };
});

const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

const reset = () => Object.assign(variants, clone(seed));

// --- Export ---
const exportScss = computed(() => {
  const solids = order
    .map((v) => `$${v}: ${variants[v].solidBg};  // fill; text ${variants[v].solidText}`)
    .join('\n');
  const softs = order
    .map(
      (v) =>
        `$soft-${v}-bg: ${variants[v].softBg};\n$soft-${v}-text: ${variants[v].softText};`,
    )
    .join('\n');
  const emphasis = order.map((v) => `$emphasis-${v}: ${variants[v].emphasis};`).join('\n');
  return [
    '// Solid semantic fills (primary / danger buttons; the fill behind text-bg)',
    solids,
    '',
    '// Soft semantic tints (soft buttons, badges, alerts, toasts, status)',
    softs,
    '',
    '// Readable-on-light shade (outline buttons, coloured links, .text-{variant})',
    emphasis,
  ].join('\n');
});

const copied = ref(false);
const copyExport = async () => {
  try {
    await navigator.clipboard.writeText(exportScss.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    copied.value = false;
  }
};

const showExport = ref(false);
</script>

<template>
  <div class="playground">
    <header class="pg-intro">
      <h1>Colour playground</h1>
      <p class="lead">
        Tune each variant's <strong>solid</strong> pair (button fill + text) and
        <strong>soft</strong> pair (status tint + text). Previews and WCAG AA
        readouts update live. Seeded with the Codex-proposed palette; when it
        looks right, export the values and I'll wire them into
        <code>theme.scss</code>.
      </p>
      <div class="pg-actions">
        <button class="pg-btn" @click="reset">Reset to seed</button>
        <button class="pg-btn" @click="showExport = !showExport">
          {{ showExport ? 'Hide' : 'Show' }} export
        </button>
      </div>
    </header>

    <div v-if="showExport" class="pg-export">
      <div class="pg-export-head">
        <span>theme.scss values</span>
        <button class="pg-btn pg-btn--sm" @click="copyExport">
          {{ copied ? 'Copied ✓' : 'Copy' }}
        </button>
      </div>
      <pre>{{ exportScss }}</pre>
    </div>

    <!-- The button hierarchy in a realistic screen, painted from the live values. -->
    <section class="pg-context">
      <h2>In context</h2>
      <p class="section-note">
        The hierarchy with the live values — a bold <strong>primary</strong> action (brand),
        a soft <strong>secondary</strong>, a <strong>ghost</strong> tertiary, and a semantic
        <strong>danger</strong>. Emphasis comes from weight and place, not loudness.
      </p>
      <div class="pg-mock">
        <div class="pg-mock-bar">
          <span class="pg-mock-title">1 Stop Wholesale</span>
          <span class="pg-mock-spacer" />
          <button
            class="pg-ghost"
            :style="{ color: 'var(--bs-body-color)' }"
          >New Receipt</button>
          <button
            class="pg-soft-btn"
            :style="{ background: variants.secondary.softBg, color: variants.secondary.softText }"
          >New Account</button>
        </div>
        <div class="pg-mock-body">
          <div class="pg-mock-field"><span>Account name</span><em>1 Stop Wholesale</em></div>
          <div class="pg-mock-field"><span>Account type</span><em>Liability</em></div>
        </div>
        <div class="pg-mock-footer">
          <button
            class="pg-solid-btn pg-solid-btn--lg"
            :style="{ background: variants.primary.solidBg, color: variants.primary.solidText }"
          >Save account</button>
          <button class="pg-ghost" :style="{ color: 'var(--bs-body-color)' }">Cancel</button>
          <span class="pg-mock-spacer" />
          <button
            class="pg-solid-btn"
            :style="{ background: variants.danger.solidBg, color: variants.danger.solidText }"
          >Delete</button>
        </div>
      </div>

      <!-- Filled switch (#158): the whole box carries the state colour, derived
           live from the success/danger SOLID values above. -->
      <p class="section-note pg-switch-note">
        The <strong>filled switch</strong> (<code>DXSwitch</code>) — green on, light red off, neutral
        pill. Its fills are <code>color.mix</code>ed from the success / danger solids, so tune those
        above and the switch follows.
      </p>
      <div class="pg-switch-row">
        <label class="pg-switch" :style="{ background: switchFills.onBg, borderColor: switchFills.onLine }">
          <span class="pg-switch-lab" :style="{ color: switchFills.onInk }">Product is current</span>
          <span class="pg-switch-well" :style="{ background: switchFills.onWell }">
            <span class="pg-switch-pill pg-switch-pill--on" :style="{ background: switchFills.pill }" />
          </span>
        </label>
        <label class="pg-switch" :style="{ background: switchFills.offBg, borderColor: switchFills.offLine }">
          <span class="pg-switch-lab" :style="{ color: switchFills.offInk }">Product is not current</span>
          <span class="pg-switch-well" :style="{ background: switchFills.offWell }">
            <span class="pg-switch-pill" :style="{ background: switchFills.pill }" />
          </span>
        </label>
      </div>
    </section>

    <div class="pg-grid">
      <section v-for="variant in order" :key="variant" class="pg-card">
        <h2 class="pg-name">{{ variant }}</h2>

        <!-- Preview cluster -->
        <div class="pg-preview">
          <span class="pg-button" :style="buttonStyle(variant)">
            Button
            <small class="pg-btn-tag">{{ isSolidButton(variant) ? 'solid' : 'soft' }}</small>
          </span>
          <span
            class="pg-outline"
            :style="{ borderColor: outlineColor(variant), color: outlineColor(variant) }"
          >
            Outline
          </span>
          <span
            class="pg-badge"
            :style="{ background: variants[variant].softBg, color: variants[variant].softText }"
          >
            Badge
          </span>
          <div
            class="pg-alert"
            :style="{
              background: variants[variant].softBg,
              color: variants[variant].softText,
              borderColor: variants[variant].solidBg,
            }"
          >
            Alert message
          </div>
        </div>

        <!-- SOLID controls -->
        <div class="pg-pair">
          <div class="pg-pair-head">
            <span class="pg-pair-label">Solid (button)</span>
            <span
              class="pg-aa"
              :class="ratio(variants[variant].solidBg, variants[variant].solidText) >= 4.5 ? 'ok' : 'bad'"
            >
              {{ ratio(variants[variant].solidBg, variants[variant].solidText).toFixed(2) }}:1
              {{ ratio(variants[variant].solidBg, variants[variant].solidText) >= 4.5 ? 'AA' : 'fail' }}
            </span>
          </div>
          <div class="pg-inputs">
            <label class="pg-input">
              <span>bg</span>
              <input type="color" v-model="variants[variant].solidBg" />
              <input
                type="text"
                class="pg-hex"
                :class="{ invalid: !isHex(variants[variant].solidBg) }"
                v-model="variants[variant].solidBg"
              />
            </label>
            <label class="pg-input">
              <span>text</span>
              <input type="color" v-model="variants[variant].solidText" />
              <input
                type="text"
                class="pg-hex"
                :class="{ invalid: !isHex(variants[variant].solidText) }"
                v-model="variants[variant].solidText"
              />
            </label>
          </div>
          <p class="pg-hint">
            Bootstrap would auto-pick <strong>{{ autoText(variants[variant].solidBg) }}</strong> text
            on a real <code>.btn-{{ variant }}</code>.
          </p>
        </div>

        <!-- OUTLINE / LINK emphasis shade -->
        <div class="pg-pair">
          <div class="pg-pair-head">
            <span class="pg-pair-label">Outline / link</span>
            <span
              class="pg-aa"
              :class="ratio(variants[variant].emphasis, '#ffffff') >= 4.5 ? 'ok' : 'bad'"
            >
              {{ ratio(variants[variant].emphasis, '#ffffff').toFixed(2) }}:1
              {{ ratio(variants[variant].emphasis, '#ffffff') >= 4.5 ? 'AA' : 'fail' }}
              on white
            </span>
          </div>
          <div class="pg-inputs">
            <label class="pg-input">
              <span>colour</span>
              <input type="color" v-model="variants[variant].emphasis" />
              <input
                type="text"
                class="pg-hex"
                :class="{ invalid: !isHex(variants[variant].emphasis) }"
                v-model="variants[variant].emphasis"
              />
            </label>
          </div>
        </div>

        <!-- SOFT controls -->
        <div class="pg-pair">
          <div class="pg-pair-head">
            <span class="pg-pair-label">Soft (badge / status)</span>
            <span
              class="pg-aa"
              :class="ratio(variants[variant].softBg, variants[variant].softText) >= 4.5 ? 'ok' : 'bad'"
            >
              {{ ratio(variants[variant].softBg, variants[variant].softText).toFixed(2) }}:1
              {{ ratio(variants[variant].softBg, variants[variant].softText) >= 4.5 ? 'AA' : 'fail' }}
            </span>
          </div>
          <div class="pg-inputs">
            <label class="pg-input">
              <span>bg</span>
              <input type="color" v-model="variants[variant].softBg" />
              <input
                type="text"
                class="pg-hex"
                :class="{ invalid: !isHex(variants[variant].softBg) }"
                v-model="variants[variant].softBg"
              />
            </label>
            <label class="pg-input">
              <span>text</span>
              <input type="color" v-model="variants[variant].softText" />
              <input
                type="text"
                class="pg-hex"
                :class="{ invalid: !isHex(variants[variant].softText) }"
                v-model="variants[variant].softText"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.playground {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1rem 0 4rem;
}

.pg-intro .lead {
  color: var(--bs-secondary-color);
  max-width: 64ch;
}

.pg-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.pg-btn {
  border: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  border-radius: var(--bs-border-radius);
  padding: 0.4rem 0.9rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}
.pg-btn:hover {
  background: var(--bs-light);
}
.pg-btn--sm {
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
}

.pg-export {
  margin-top: 1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  overflow: hidden;
}
.pg-export-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.9rem;
  background: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color);
  font-size: 0.8125rem;
  font-weight: 600;
}
.pg-export pre {
  margin: 0;
  padding: 1rem;
  font-size: 0.8125rem;
  overflow-x: auto;
}

/* In-context mock */
.pg-context {
  margin-top: 1.5rem;
}
.pg-mock {
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  overflow: hidden;
}
.pg-mock-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color);
}
.pg-mock-title {
  font-weight: 600;
}
.pg-mock-spacer {
  flex: 1;
}
.pg-mock-body {
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.pg-mock-field {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: 1rem;
  font-size: 0.875rem;
}
.pg-mock-field span {
  color: var(--bs-secondary-color);
  text-align: right;
}
.pg-mock-field em {
  font-style: normal;
}
.pg-mock-footer {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--bs-border-color);
}
.pg-solid-btn {
  border: none;
  padding: 0.5rem 1.1rem;
  border-radius: var(--bs-border-radius);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}
.pg-solid-btn--lg {
  padding: 0.65rem 1.6rem;
  font-size: 0.9375rem;
  font-weight: 600;
}
.pg-soft-btn {
  border: none;
  padding: 0.5rem 1.1rem;
  border-radius: var(--bs-border-radius);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}
.pg-ghost {
  border: none;
  background: transparent;
  padding: 0.5rem 0.9rem;
  border-radius: var(--bs-border-radius);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}
.pg-ghost:hover {
  background: var(--bs-light);
}

.pg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
  margin-top: 1.5rem;
}

.pg-card {
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pg-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}

.pg-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.pg-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: var(--bs-border-radius);
  font-size: 0.8125rem;
  font-weight: 500;
}
.pg-btn-tag {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
}

.pg-outline {
  display: inline-flex;
  align-items: center;
  padding: calc(0.5rem - 1.5px) calc(1rem - 1.5px);
  border: 1.5px solid;
  background: transparent;
  border-radius: var(--bs-border-radius);
  font-size: 0.8125rem;
  font-weight: 500;
}

.pg-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: var(--bs-border-radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.pg-outline-aa {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-weight: 600;
  padding: 0 0.25rem;
  border-radius: 3px;
}
.pg-outline-aa.ok {
  background: #dcfce7;
  color: #14532d;
}
.pg-outline-aa.bad {
  background: #fee2e2;
  color: #7f1d1d;
}

.pg-alert {
  flex: 1 1 100%;
  padding: 0.6rem 0.85rem;
  border-radius: var(--bs-border-radius);
  border-left: 3px solid;
  font-size: 0.8125rem;
}

.pg-pair {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pg-pair-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.pg-pair-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--bs-secondary-color);
}

.pg-aa {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.05rem 0.4rem;
  border-radius: var(--bs-border-radius-sm);
}
.pg-aa.ok {
  background: #dcfce7;
  color: #14532d;
}
.pg-aa.bad {
  background: #fee2e2;
  color: #7f1d1d;
}

.pg-inputs {
  display: flex;
  gap: 1rem;
}

.pg-input {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
}
.pg-input input[type='color'] {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-sm);
  background: none;
  cursor: pointer;
}
.pg-hex {
  width: 5.5rem;
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-sm);
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.75rem;
}
.pg-hex.invalid {
  border-color: var(--bs-danger);
}

.pg-hint {
  margin: 0;
  font-size: 0.72rem;
  color: var(--bs-secondary-color);
}

/* Filled-switch preview (#158) — painted live from switchFills. */
.pg-switch-note {
  margin-top: 1.5rem;
}
.pg-switch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.pg-switch {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  min-width: 260px;
  padding: 0.5rem 0.55rem 0.5rem 1rem;
  border: 1px solid;
  border-radius: 10px;
  font-size: 0.95rem;
}
.pg-switch-lab {
  font-weight: 500;
}
.pg-switch-well {
  display: inline-flex;
  padding: 0.4rem 0.55rem;
  border-radius: 8px;
}
.pg-switch-pill {
  position: relative;
  width: 2.6em;
  height: 1.5em;
  border-radius: 2em;
}
.pg-switch-pill::after {
  content: "";
  position: absolute;
  top: 0.18em;
  left: 0.18em;
  width: 1.14em;
  height: 1.14em;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}
.pg-switch-pill--on::after {
  left: auto;
  right: 0.18em;
}
</style>
