import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from './docs/pagefind.integration.mjs';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import IconsResolver from 'unplugin-icons/resolver';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
  srcDir: './docs/src',
  publicDir: './docs/public',
  site: 'https://omnitend.github.io',
  base: '/dashboard-for-laravel',
  outDir: './docs/dist',
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
    ],
  },
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
        // Map package imports to local dist for docs build (needed in CI where npm link isn't available)
        '@omnitend/dashboard-for-laravel': '/dist/dashboard-for-laravel.js',
      },
      // The dist bundle externalizes chart.js/vue-chartjs; without deduping,
      // Astro/Vite can load two chart.js instances (one for the wrappers'
      // Chart.register, one vue-chartjs constructs charts with) so registered
      // plugins (Legend, Tooltip) are missing on the active instance. Force one.
      dedupe: ['vue', 'chart.js', 'vue-chartjs'],
    },
    optimizeDeps: {
      exclude: ['@omnitend/dashboard-for-laravel'],
    },
    ssr: {
      noExternal: ['chart.js', 'vue-chartjs'],
    },
  },
});
