import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [
        IconsResolver({
          prefix: 'i',
        }),
      ],
    }),
    Icons({
      compiler: 'vue3',
    }),
  ],
  resolve: {
    dedupe: ['vue'],
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3's own SCSS still uses `@import`, global built-in
        // functions, and `red()`/`green()`/`blue()` — none migrated to the Sass
        // module system — so compiling it floods the build with Dart Sass
        // deprecation warnings we can't fix without Bootstrap upstreaming a
        // module-based rewrite. `quietDeps` silences warnings originating inside
        // node_modules (Bootstrap's internals) while still surfacing any in our
        // own SCSS; `silenceDeprecations: ['import']` covers our own three
        // `@import` lines in theme.scss (Bootstrap 5.3 has no clean `@use`
        // entry point to migrate them to yet).
        quietDeps: true,
        silenceDeprecations: ['import'],
      },
    },
    postcss: {
      map: {
        inline: false,
        annotation: true,
      },
    },
  },
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'resources/js/index.ts'),
      name: 'DashboardForLaravel',
      fileName: (format) => {
        return format === 'es' ? 'dashboard-for-laravel.js' : 'dashboard-for-laravel.umd.cjs';
      },
    },
    rollupOptions: {
      // `vite:css` doesn't emit a sourcemap when it transforms each component's
      // scoped `<style>` block, so with `build.sourcemap` on, Rollup logs
      // SOURCEMAP_BROKEN once per scoped block per output (13 blocks × ES+UMD =
      // 26 identical warnings). We ship JS sourcemaps but no CSS sourcemap, so
      // there is nothing to fix here — filter just this one warning and let
      // every other Rollup warning through unchanged.
      onwarn(warning, warn) {
        if (warning.code === 'SOURCEMAP_BROKEN' && warning.plugin === 'vite:css') {
          return;
        }
        warn(warning);
      },
      // Externalize deps that shouldn't be bundled. chart.js / vue-chartjs are
      // OPTIONAL peer deps (only the DX*Chart components need them), so they
      // stay external — consumers who chart install them; others pay nothing.
      external: ['vue', '@inertiajs/vue3', 'chart.js', 'vue-chartjs'],
      output: {
        // Provide global variables to use in the UMD build
        globals: {
          vue: 'Vue',
          '@inertiajs/vue3': 'Inertia',
          'chart.js': 'Chart',
          'vue-chartjs': 'VueChartjs',
        },
        // Keep the single stylesheet named `style.css` (the package `exports`
        // point at `./dist/style.css`), but let every OTHER emitted asset keep
        // a distinct hashed name instead of also being forced to `style.css`
        // (which would clobber the stylesheet).
        //
        // Note Vite ALWAYS inlines CSS-referenced assets as base64 data URIs in
        // library mode — `assetsInlineLimit` is documented as ignored when
        // `build.lib` is set — so the Bootstrap Icons woff2 still embeds itself
        // here and nothing reaches the `assets/` branch during the Vite pass.
        // `scripts/extract-icon-font.mjs` pulls it back out afterwards (#77);
        // that's the only reason `dist/assets/` exists.
        assetFileNames: (assetInfo) => {
          const assetName = assetInfo.names?.[0] ?? assetInfo.name ?? '';
          return assetName.endsWith('.css')
            ? 'style.css'
            : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
