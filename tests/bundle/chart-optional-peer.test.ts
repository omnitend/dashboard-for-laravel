import { describe, it, expect } from 'vitest';
// Read the BUILT entry bundles as raw text through Vite (`?raw`), not node:fs —
// same pattern as icon-font.test.ts / scoped-deep-styles.test.ts.
import mainBundle from '../../dist/dashboard-for-laravel.js?raw';
import chartsBundle from '../../dist/charts.js?raw';

/*
 * chart.js / vue-chartjs are OPTIONAL peer deps, but they only stay optional if
 * the MAIN entry never references them (#142). It used to import them statically
 * at module top level (via the barrel re-exporting the chart components), so a
 * chart-free consumer's `vite build` failed resolving the "optional" peers
 * (custard #104). The chart components now live behind the
 * `@omnitend/dashboard-for-laravel/charts` entry.
 *
 * The failure mode is silent — re-adding a chart export to the barrel compiles
 * fine and just quietly makes chart.js mandatory again — so guard it.
 */
describe('chart libs are isolated to the /charts entry (#142)', () => {
  it('the MAIN bundle references neither chart.js nor vue-chartjs', () => {
    // Would this pass if the bug were present? No — a static import of either
    // lib puts its specifier in the bundle text, which this matches.
    expect(mainBundle).not.toMatch(/["']chart\.js["']/);
    expect(mainBundle).not.toMatch(/["']vue-chartjs["']/);
  });

  it('the /charts bundle imports both as external (not bundled) deps', () => {
    // Sanity: the split didn't drop the components' actual dependency.
    expect(chartsBundle).toMatch(/from\s*["']chart\.js["']/);
    expect(chartsBundle).toMatch(/from\s*["']vue-chartjs["']/);
  });
});

/*
 * axios was the other not-actually-optional peer (#132): two plain GETs
 * (DXTable's internal provider, useResourceEditor's showUrl fetch) imported it
 * statically while everything else already used the library's own fetch client
 * (utils/api). Those GETs now go through `api.get` and axios is no longer a
 * peer at all. Same silent failure mode as the charts: one `import axios`
 * anywhere reachable from the barrel makes it mandatory again for every
 * consumer.
 */
describe('axios is not referenced by any entry (#132)', () => {
  it('neither bundle references axios', () => {
    // Would this pass if the bug were present? No — a static import puts the
    // "axios" specifier in the bundle text, which this matches.
    expect(mainBundle).not.toMatch(/["']axios["']/);
    expect(chartsBundle).not.toMatch(/["']axios["']/);
  });
});
