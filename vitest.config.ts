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
    // Scope collection to tests/ — playground/vendor/omnitend/dashboard-for-laravel
    // is a symlink back to the repo root, so a broader glob collects every test twice.
    include: ['tests/**/*.{test,spec}.ts'],
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
    // Generates the gitignored docs/public/llms.txt the #136 guard reads, so
    // that test is self-contained (CI builds dist but not the docs; local
    // ignore-scripts disables the pre-test hooks). See tests/global-setup.ts.
    globalSetup: ['./tests/global-setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './resources/js'),
      '@components': resolve(__dirname, './resources/js/components'),
    },
  },
});
