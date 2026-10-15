import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import { playwright } from '@vitest/browser-playwright';

// DX_PLAYWRIGHT_WS_ENDPOINT runs the suite in a remote browser, e.g. CI's
// Linux Chromium in Playwright's Docker image (`npm run test:linux`, see
// scripts/test-linux.sh). Linux lays text out differently from macOS (glyph
// advances are not proportional to the font size), which hid CI-only
// failures in measurement-driven code such as DXStatCard's fit. The
// browser reaches this machine's Vite server through Playwright's tunnel.
const remoteBrowserEndpoint = process.env.DX_PLAYWRIGHT_WS_ENDPOINT;

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
          provider: playwright(
            remoteBrowserEndpoint
              ? { connectOptions: { wsEndpoint: remoteBrowserEndpoint, exposeNetwork: '<loopback>' } }
              : {},
          ),
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
  // Pre-bundled up front: the phone-menu hydration test imports it, and when
  // Vite only discovers it mid-run it re-optimises and reloads, leaving two
  // copies of Vue ("Cannot read properties of null (reading 'ce')"). That
  // fails the first run on any fresh cache, CI included.
  optimizeDeps: {
    include: ['vue/server-renderer'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './resources/js'),
      '@components': resolve(__dirname, './resources/js/components'),
    },
  },
});
