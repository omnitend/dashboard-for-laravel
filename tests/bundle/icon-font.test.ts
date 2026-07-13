import { describe, it, expect } from 'vitest';
// Tests run in a real browser, so the built artefacts come in through Vite
// (`?raw` / `?url`) rather than node:fs — same as scoped-deep-styles.test.ts.
import stylesheet from '../../dist/style.css?raw';

/**
 * #77. The Bootstrap Icons webfont must ship as a real file, not inlined.
 *
 * Vite ALWAYS inlines CSS-referenced assets as base64 data URIs in library mode
 * (`build.assetsInlineLimit` is documented as ignored when `build.lib` is set),
 * which is pathological for a woff2: it is already Brotli-compressed, base64
 * inflates it by a third, and gzip recovers none of it. Inlined, the font alone
 * was 137 KB of the stylesheet's 191 KB gzip — 72% of the CSS, carried by every
 * consumer whether or not they ever render a glyph.
 *
 * `scripts/extract-icon-font.mjs` writes it back out post-build. These tests pin
 * that, because the failure mode is silent: the package still works, it just
 * quietly triples its CSS again.
 */
describe('icon font is not inlined into the stylesheet (#77)', () => {
  it('embeds no base64 font in style.css', () => {
    expect(stylesheet).not.toMatch(/url\(data:font/);
  });

  it('references the font as a real, emitted file that is actually fetchable', async () => {
    const reference = /url\(\.\/assets\/(bootstrap-icons-[a-f0-9]+\.woff2)\)/.exec(stylesheet);
    expect(reference).not.toBeNull();

    // Resolve it the way a consumer's bundler does — relative to the stylesheet.
    const response = await fetch(new URL(`../../dist/assets/${reference![1]}`, import.meta.url));
    expect(response.ok).toBe(true);

    // A plausible woff2, not a stub.
    const font = await response.arrayBuffer();
    expect(font.byteLength).toBeGreaterThan(50_000);
  });

  it('keeps the stylesheet far below its inlined-font size', () => {
    // Raw bytes: the font was 179 KB of base64 on its own, so a raw ceiling
    // catches re-inlining without needing gzip in the browser.
    expect(stylesheet.length).toBeLessThan(450_000);
  });

  it("still ships the .bi-* glyph classes, so DButton's icon prop works", () => {
    // These are cheap (~14 KB gzip for all 2078). The font was the problem, not
    // the classes — dropping them would break `icon="save"` silently.
    expect(stylesheet).toContain('.bi-save');
    expect(stylesheet).toMatch(/@font-face\{[^}]*font-family:bootstrap-icons/);
  });

  it('references exactly one font file', () => {
    const references = stylesheet.match(/url\(\.\/assets\/[^)]*\.woff2\)/g) ?? [];
    expect(references).toHaveLength(1);
  });
});
