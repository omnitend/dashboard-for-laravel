import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import { playwright } from '@vitest/browser-playwright';

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
  test: {
    browser: {
      enabled: true,
      instances: [
        {
          browser: 'chromium',
          provider: playwright(),
        },
      ],
      headless: false, // Set to true for CI, false for local development to see tests
    },
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './resources/js'),
      '@components': resolve(__dirname, './resources/js/components'),
    },
  },
});
