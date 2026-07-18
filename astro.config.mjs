import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import pagefind from './docs/pagefind.integration.mjs';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import IconsResolver from 'unplugin-icons/resolver';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// The path the docs are served under on GitHub Pages. Single source of truth so
// the site `base` and the link-prefixing rehype plugin below can't drift.
const base = '/dashboard-for-laravel';

/**
 * rehype plugin: prefix root-relative internal links with the site `base` (#146).
 *
 * Astro prepends `base` to links rendered through its layout components (nav,
 * sidebar) but NOT to root-relative links authored in markdown/MDX *content*
 * (`[Style guide](/showcase)`). On GitHub Pages those resolve to
 * `omnitend.github.io/showcase` → 404. This normalises every authored
 * root-relative href at build time, in one place, for both .md and .mdx (MDX
 * extends the markdown config, so it runs this processor too). Local previews
 * mask the bug because they can be browsed from the base path.
 *
 * Only bare root-relative links are rewritten — external (`http(s):`,
 * protocol-relative `//`), in-page fragments (`#…`), `mailto:`, relative
 * (`./…`), and already-prefixed links are left untouched, so it is idempotent.
 */
function rehypeBasePrefix() {
  const shouldPrefix = (href) => {
    if (typeof href !== 'string') return false;
    if (!href.startsWith('/')) return false; // http(s), #frag, mailto:, ./relative
    if (href.startsWith('//')) return false; // protocol-relative
    // Already carries the base (exact, or as a path/fragment/query boundary).
    if (
      href === base ||
      href.startsWith(`${base}/`) ||
      href.startsWith(`${base}#`) ||
      href.startsWith(`${base}?`)
    ) {
      return false;
    }
    return true;
  };

  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'a' && node.properties) {
      if (shouldPrefix(node.properties.href)) {
        node.properties.href = base + node.properties.href;
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) visit(child);
    }
  };

  return (tree) => visit(tree);
}

// https://astro.build/config
export default defineConfig({
  srcDir: './docs/src',
  publicDir: './docs/public',
  site: 'https://omnitend.github.io',
  base,
  outDir: './docs/dist',
  markdown: {
    // Astro 7 deprecated `markdown.rehypePlugins` in favour of an explicit
    // processor. `unified()` is the same remark/rehype pipeline the old config
    // fed, so this preserves syntax highlighting + GFM while keeping our
    // heading-slug + autolink plugins.
    processor: unified({
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        rehypeBasePrefix,
      ],
    }),
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
