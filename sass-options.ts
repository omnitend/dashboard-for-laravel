import type { CSSOptions } from 'vite';

/**
 * Preprocessor (Sass) options shared by the library build (vite.config.ts) and the test
 * runner (vitest.config.ts), which compiles theme.scss for tests that import
 * it `?inline`. Without the second, every test run printed Bootstrap's
 * deprecation warnings that the build already silences.
 *
 * Bootstrap 5.3's own SCSS still uses `@import`, global built-in functions,
 * and `red()`/`green()`/`blue()` — none migrated to the Sass module system —
 * so compiling it floods the output with Dart Sass deprecation warnings we
 * can't fix without Bootstrap upstreaming a module-based rewrite. `quietDeps`
 * silences warnings originating inside node_modules (Bootstrap's internals)
 * while still surfacing any in our own SCSS; `silenceDeprecations: ['import']`
 * covers our own `@import` lines in theme.scss (Bootstrap 5.3 has no clean
 * `@use` entry point to migrate them to yet).
 */
export const cssPreprocessorOptions: CSSOptions['preprocessorOptions'] = {
  scss: {
    quietDeps: true,
    silenceDeprecations: ['import'],
  },
};
