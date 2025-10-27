import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from './docs/pagefind.integration.mjs';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import IconsResolver from 'unplugin-icons/resolver';

// https://astro.build/config
export default defineConfig({
  srcDir: './docs/src',
  publicDir: './docs/public',
  site: 'https://omnitend.github.io',
  // base: '/dashboard-for-laravel', // Uncomment for GitHub Pages deployment
  outDir: './docs/dist',
  integrations: [
    vue(),
    mdx(),
    sitemap(),
    pagefind(),
  ],
  vite: {
    plugins: [
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
      alias: {
        '@': '/resources/js',
        '@components': '/resources/js/components',
      },
    },
    optimizeDeps: {
      exclude: ['@omni-tend/dashboard-for-laravel'],
    },
  },
});
