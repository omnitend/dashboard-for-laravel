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
      // Externalize deps that shouldn't be bundled. chart.js / vue-chartjs are
      // OPTIONAL peer deps (only the DX*Chart components need them), so they
      // stay external — consumers who chart install them; others pay nothing.
      external: ['vue', '@inertiajs/vue3', 'axios', 'chart.js', 'vue-chartjs'],
      output: {
        // Provide global variables to use in the UMD build
        globals: {
          vue: 'Vue',
          '@inertiajs/vue3': 'Inertia',
          axios: 'axios',
          'chart.js': 'Chart',
          'vue-chartjs': 'VueChartjs',
        },
        // Keep the single stylesheet named `style.css` (the package `exports`
        // point at `./dist/style.css`), but let every OTHER emitted asset keep
        // a distinct hashed name instead of also being forced to `style.css`.
        // Today this is DEFENSIVE: in library mode Vite inlines CSS-referenced
        // assets as data URIs, so the Bootstrap Icons woff2 embeds directly in
        // `style.css` and nothing hits the `assets/` branch. But if that ever
        // changes (a Vite bump, an asset over `assetsInlineLimit`, or an added
        // entry), a blanket `'style.css'` would name a font/other asset
        // `style.css` too and clobber the stylesheet — this keeps them separate.
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
