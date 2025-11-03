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
      // Externalize deps that shouldn't be bundled
      external: ['vue', '@inertiajs/vue3', 'axios'],
      output: {
        // Provide global variables to use in the UMD build
        globals: {
          vue: 'Vue',
          '@inertiajs/vue3': 'Inertia',
          axios: 'axios',
        },
        assetFileNames: 'style.css',
      },
    },
  },
});
