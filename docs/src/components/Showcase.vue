<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DBadge } from '@omnitend/dashboard-for-laravel';

/*
 * A single-page visual reference for the whole design system — the tokens
 * (colour, type, radius, spacing, shadow) and every component's live example on
 * one scrollable page. Built for a design pass: open it, screenshot it, critique
 * the whole surface at once instead of clicking through 72 pages.
 *
 * The component gallery reuses the existing per-component examples via a glob, so
 * it stays in step automatically as examples are added or changed. The token
 * swatches read their COMPUTED value off `var(--bs-*)` at runtime, so they can
 * never drift from `resources/css/theme.scss`.
 */

// --- Design tokens -------------------------------------------------------

// Brand + semantic variants. The swatch is styled with Bootstrap's own
// `.text-bg-{name}` utility, so its foreground is the SAME auto-contrast colour
// the framework paints on buttons/badges — the swatch can't disagree with the
// components (an earlier hardcoded white text made success look different from
// its button, and was itself below AA).
const brandColors = [
  { name: 'primary', bg: '--bs-primary', role: 'Primary actions, links, focus' },
  { name: 'secondary', bg: '--bs-secondary', role: 'Secondary actions, muted UI' },
  { name: 'success', bg: '--bs-success', role: 'Positive state, confirmations' },
  { name: 'danger', bg: '--bs-danger', role: 'Destructive, errors' },
  { name: 'warning', bg: '--bs-warning', role: 'Caution, pending' },
  { name: 'info', bg: '--bs-info', role: 'Informational' },
  { name: 'light', bg: '--bs-light', role: 'Subtle backgrounds' },
  { name: 'dark', bg: '--bs-dark', role: 'Sidebar, high-contrast surfaces' },
];

const surfaceColors = [
  { name: 'body-bg', bg: '--bs-body-bg', role: 'Page background' },
  { name: 'body-color', bg: '--bs-body-color', role: 'Body text' },
  { name: 'secondary-color', bg: '--bs-secondary-color', role: 'Muted text' },
  { name: 'border-color', bg: '--bs-border-color', role: 'Dividers, input borders' },
];

const typeScale = [
  { tag: 'h1', label: 'Heading 1', sample: 'The quick brown fox' },
  { tag: 'h2', label: 'Heading 2', sample: 'The quick brown fox' },
  { tag: 'h3', label: 'Heading 3', sample: 'The quick brown fox' },
  { tag: 'h4', label: 'Heading 4', sample: 'The quick brown fox' },
  { tag: 'h5', label: 'Heading 5', sample: 'The quick brown fox' },
  { tag: 'h6', label: 'Heading 6', sample: 'The quick brown fox' },
];

const weights = [
  { weight: 400, label: 'Regular (base)' },
  { weight: 500, label: 'Medium (buttons, labels)' },
  { weight: 600, label: 'Semibold (headings)' },
];

const radii = [
  { name: 'sm', var: '--bs-border-radius-sm' },
  { name: 'base', var: '--bs-border-radius' },
  { name: 'lg', var: '--bs-border-radius-lg' },
];

const spacing = [
  { name: '0.25', rem: '0.25rem' },
  { name: '0.5', rem: '0.5rem' },
  { name: '1 (spacer)', rem: '1rem' },
  { name: '1.5', rem: '1.5rem' },
  { name: '3', rem: '3rem' },
];

// Resolved hexes/values, filled on mount from the real computed styles so the
// swatch labels are the source of truth, not a hand-copied duplicate.
const resolved = ref<Record<string, string>>({});

const rgbToHex = (value: string): string => {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return value.trim();
  const parts = match[1].split(',').map((p) => p.trim());
  const [r, g, b] = parts.map((p) => parseInt(p, 10));
  if ([r, g, b].some((n) => Number.isNaN(n))) return value.trim();
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
};

onMounted(() => {
  const styles = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const token of [...brandColors, ...surfaceColors]) {
    const raw = styles.getPropertyValue(token.bg).trim();
    out[token.bg] = raw.startsWith('rgb') ? rgbToHex(raw) : raw || '—';
  }
  for (const radius of radii) {
    out[radius.var] = styles.getPropertyValue(radius.var).trim() || '—';
  }
  resolved.value = out;
});

// --- Component gallery ---------------------------------------------------

// Every per-component example, imported once. `eager` bundles them so the whole
// page renders without 69 async waterfalls.
const exampleModules = import.meta.glob('../examples/*.vue', { eager: true }) as Record<
  string,
  { default: any }
>;

interface GalleryEntry {
  name: string;
  component: any;
  category: 'extended' | 'base';
  docUrl: string;
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

const gallery: GalleryEntry[] = Object.entries(exampleModules)
  .map(([path, module]) => {
    const fileName = path.split('/').pop() ?? '';
    const name = fileName.replace(/Example\.vue$/, '');
    const category: 'extended' | 'base' = name.startsWith('DX') ? 'extended' : 'base';
    return { name, component: module.default, category, docUrl: `${base}/components/${category}/${name}` };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const extended = gallery.filter((entry) => entry.category === 'extended');
const baseComponents = gallery.filter((entry) => entry.category === 'base');
</script>

<template>
  <div class="showcase">
    <header class="showcase-intro">
      <h1>Style guide</h1>
      <p class="lead">
        The whole design system on one page — tokens and every component's live
        example — for reviewing the look and feel at a glance. Swatch values are
        read live from the built theme, so they always match
        <code>theme.scss</code>.
      </p>
      <nav class="showcase-toc">
        <a href="#tokens">Tokens</a>
        <a href="#colour">Colour</a>
        <a href="#type">Typography</a>
        <a href="#shape">Shape &amp; space</a>
        <a href="#extended">Extended components</a>
        <a href="#base">Base components</a>
      </nav>
    </header>

    <!-- ================= TOKENS ================= -->
    <section id="tokens" class="showcase-section">
      <h2 id="colour">Colour</h2>
      <p class="section-note">
        Brand and semantic variants. Each swatch shows its foreground on its
        background, so on-colour legibility is visible directly.
      </p>
      <div class="swatch-grid">
        <div
          v-for="colour in brandColors"
          :key="colour.name"
          class="swatch"
          :class="`text-bg-${colour.name}`"
        >
          <span class="swatch-name">{{ colour.name }}</span>
          <span class="swatch-hex">{{ resolved[colour.bg] ?? '…' }}</span>
          <span class="swatch-role">{{ colour.role }}</span>
        </div>
      </div>

      <h3 class="subhead">Surfaces &amp; text</h3>
      <div class="swatch-grid">
        <div v-for="colour in surfaceColors" :key="colour.name" class="swatch swatch--surface">
          <span class="swatch-chip" :style="{ background: `var(${colour.bg})` }" />
          <span class="swatch-name">{{ colour.name }}</span>
          <span class="swatch-hex">{{ resolved[colour.bg] ?? '…' }}</span>
          <span class="swatch-role">{{ colour.role }}</span>
        </div>
      </div>

      <h3 class="subhead">Solid fill vs badge</h3>
      <p class="section-note">
        Each variant's <strong>solid fill</strong> (buttons, above) sits beside its
        <strong>badge</strong>. <code>success</code> and <code>danger</code> badges use
        Omni Tend's soft tint — a light same-hue background with dark same-hue text —
        while the rest stay solid until their brand tint pairs are defined.
      </p>
      <div class="variant-table">
        <div v-for="colour in brandColors" :key="colour.name" class="variant-row">
          <span class="variant-name">{{ colour.name }}</span>
          <span class="variant-fill" :class="`text-bg-${colour.name}`">fill</span>
          <DBadge :variant="colour.name">{{ colour.name }}</DBadge>
        </div>
      </div>
    </section>

    <section class="showcase-section">
      <h2 id="type">Typography</h2>
      <p class="section-note">
        Base family is <strong>Poppins</strong>, base size <strong>14px</strong>
        (0.875rem), body weight 400, headings 600.
      </p>
      <div class="type-scale">
        <div v-for="row in typeScale" :key="row.tag" class="type-row">
          <component :is="row.tag" class="type-sample">{{ row.sample }}</component>
          <span class="type-meta">{{ row.label }} · &lt;{{ row.tag }}&gt;</span>
        </div>
        <div class="type-row">
          <p class="type-sample" style="margin: 0">Body copy — the quick brown fox jumps over the lazy dog.</p>
          <span class="type-meta">Body · &lt;p&gt;</span>
        </div>
        <div class="type-row">
          <small class="type-sample text-muted">Small / muted — supporting detail.</small>
          <span class="type-meta">Small · &lt;small&gt;</span>
        </div>
      </div>

      <h3 class="subhead">Weights</h3>
      <div class="weight-list">
        <div v-for="item in weights" :key="item.weight" class="weight-row">
          <span class="weight-sample" :style="{ fontWeight: item.weight }">Poppins {{ item.weight }}</span>
          <span class="type-meta">{{ item.label }}</span>
        </div>
      </div>
    </section>

    <section class="showcase-section">
      <h2 id="shape">Shape &amp; space</h2>
      <h3 class="subhead">Corner radius</h3>
      <div class="radius-row">
        <div v-for="radius in radii" :key="radius.name" class="radius-demo">
          <span class="radius-box" :style="{ borderRadius: `var(${radius.var})` }" />
          <span class="type-meta">{{ radius.name }} · {{ resolved[radius.var] ?? '…' }}</span>
        </div>
      </div>

      <h3 class="subhead">Spacing scale</h3>
      <div class="space-row">
        <div v-for="space in spacing" :key="space.name" class="space-demo">
          <span class="space-bar" :style="{ width: space.rem, height: space.rem }" />
          <span class="type-meta">{{ space.name }} · {{ space.rem }}</span>
        </div>
      </div>
    </section>

    <!-- ================= COMPONENTS ================= -->
    <section id="extended" class="showcase-section">
      <h2>Extended components (DX*)</h2>
      <p class="section-note">Dashboard-specific building blocks composed from the base wrappers.</p>
      <div class="gallery">
        <article v-for="entry in extended" :key="entry.name" class="gallery-card">
          <div class="gallery-head">
            <h3 :id="entry.name">{{ entry.name }}</h3>
            <a :href="entry.docUrl" class="gallery-docs">docs →</a>
          </div>
          <div class="gallery-body">
            <component :is="entry.component" />
          </div>
        </article>
      </div>
    </section>

    <section id="base" class="showcase-section">
      <h2>Base components (D*)</h2>
      <p class="section-note">Type-safe wrappers around Bootstrap Vue Next.</p>
      <div class="gallery">
        <article v-for="entry in baseComponents" :key="entry.name" class="gallery-card">
          <div class="gallery-head">
            <h3 :id="entry.name">{{ entry.name }}</h3>
            <a :href="entry.docUrl" class="gallery-docs">docs →</a>
          </div>
          <div class="gallery-body">
            <component :is="entry.component" />
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.showcase {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1rem 0 4rem;
}

.showcase-intro .lead {
  color: var(--bs-secondary-color);
  max-width: 60ch;
}

.showcase-toc {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  font-size: 0.8125rem;
  font-weight: 500;
}

.showcase-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--bs-border-color);
}

.showcase-section > h2 {
  font-weight: 600;
}

.section-note {
  color: var(--bs-secondary-color);
  margin-bottom: 1.5rem;
  max-width: 62ch;
}

.subhead {
  font-size: 1rem;
  font-weight: 600;
  margin: 2rem 0 1rem;
  color: var(--bs-secondary-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Colour swatches */
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.swatch {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-height: 108px;
  padding: 0.875rem;
  border-radius: var(--bs-border-radius);
  border: 1px solid rgba(0, 0, 0, 0.06);
  justify-content: flex-end;
}

.swatch--surface {
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  border-color: var(--bs-border-color);
}

.swatch-chip {
  display: block;
  width: 100%;
  height: 40px;
  border-radius: var(--bs-border-radius-sm);
  border: 1px solid var(--bs-border-color);
  margin-bottom: 0.5rem;
}

.swatch-name {
  font-weight: 600;
  font-size: 0.9375rem;
}

.swatch-hex {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.8125rem;
  opacity: 0.9;
}

.swatch-role {
  font-size: 0.75rem;
  opacity: 0.85;
  line-height: 1.3;
}

/* Solid fill vs badge, per variant */
.variant-table {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.5rem 1.5rem;
}

.variant-row {
  display: grid;
  grid-template-columns: 5.5rem 4rem auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0;
}

.variant-name {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
}

.variant-fill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0;
  border-radius: var(--bs-border-radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

/* Typography */
.type-scale,
.weight-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.type-row,
.weight-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--bs-border-color);
}

.type-sample {
  margin: 0;
}

.type-meta {
  flex-shrink: 0;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
}

.weight-sample {
  font-size: 1.25rem;
}

/* Shape & space */
.radius-row,
.space-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.radius-demo,
.space-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.radius-box {
  width: 72px;
  height: 72px;
  background: var(--bs-primary);
}

.space-demo {
  justify-content: flex-end;
}

.space-bar {
  background: var(--bs-primary);
  border-radius: 2px;
}

/* Component gallery */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.gallery-card {
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  overflow: hidden;
  background: var(--bs-body-bg);
  display: flex;
  flex-direction: column;
}

.gallery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  background: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color);
}

.gallery-head h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}

.gallery-docs {
  font-size: 0.75rem;
  font-weight: 500;
  text-decoration: none;
  color: var(--bs-primary);
}

.gallery-body {
  padding: 1.25rem;
  overflow-x: auto;
}
</style>
