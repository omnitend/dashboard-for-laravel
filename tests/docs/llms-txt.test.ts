import { describe, it, expect } from 'vitest';
// Tests run in a real browser, so the generated artefact comes in through Vite
// (`?raw`) rather than node:fs — same pattern as tests/bundle/icon-font.test.ts.
import llmsTxt from '../../docs/public/llms.txt?raw';

/**
 * #136. `docs/public/llms.txt` is generated from the single shared component
 * manifest (scripts/lib/component-manifest.mjs). The manifest resolves the
 * PUBLIC export registry, including the raw bootstrap-vue-next RE-EXPORTS —
 * components exported as `export { BTab as DTab }` rather than
 * `export { default as … }`.
 *
 * The old generator matched only `export { default as … }`, so those
 * re-exports (DTab, DCarousel, DCarouselSlide) were silently OMITTED from
 * llms.txt — an AI agent reading it would believe those components don't exist.
 * These assertions pin that they are listed.
 *
 * The failure mode is silent (the file still generates, just missing entries),
 * so this guard reads the real generated artefact, not a mock.
 */
describe('llms.txt lists the raw bvn re-export components (#136)', () => {
  it('lists DTab (exported as `export { BTab as DTab }`)', () => {
    expect(llmsTxt).toContain('[DTab]');
  });

  it('lists DCarousel and DCarouselSlide (raw BCarousel re-exports)', () => {
    expect(llmsTxt).toContain('[DCarousel]');
    expect(llmsTxt).toContain('[DCarouselSlide]');
  });

  it('links each re-export to its component docs page', () => {
    expect(llmsTxt).toContain('[DTab](/components/base/dtab)');
    expect(llmsTxt).toContain('[DCarousel](/components/base/dcarousel)');
  });
});
