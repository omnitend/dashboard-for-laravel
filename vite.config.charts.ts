import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';

/**
 * Second lib build for the chart entry (#142). Runs AFTER the main build
 * (`vite build`) with `emptyOutDir: false`, so it adds `dist/charts.*` alongside
 * the main bundle instead of wiping it. Kept as its own single-entry `build.lib`
 * (rather than folding charts into the main build as a multi-entry lib) so the
 * MAIN package's output format stays byte-stable — a multi-entry lib can't emit
 * UMD, which would change every consumer's `require` path for a chart-only fix.
 *
 * The chart entry imports no CSS (the `.dx-chart` container rule is global in
 * the main stylesheet), so this build emits JS only.
 */
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [IconsResolver({ prefix: 'i' })],
    }),
    Icons({ compiler: 'vue3' }),
  ],
  resolve: {
    dedupe: ['vue'],
  },
  build: {
    // CRITICAL: do not wipe the main build's dist (this runs second).
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'resources/js/charts.ts'),
      name: 'DashboardForLaravelCharts',
      fileName: (format) => (format === 'es' ? 'charts.js' : 'charts.umd.cjs'),
    },
    rollupOptions: {
      // chart.js / vue-chartjs are the whole reason this entry exists — keep them
      // external (optional peers). vue is external too.
      external: ['vue', 'chart.js', 'vue-chartjs'],
      output: {
        globals: {
          vue: 'Vue',
          'chart.js': 'Chart',
          'vue-chartjs': 'VueChartjs',
        },
      },
    },
  },
});
