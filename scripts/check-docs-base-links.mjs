#!/usr/bin/env node
/**
 * Guard for #146: every root-relative link in the built docs must carry the
 * site `base` (`/dashboard-for-laravel`), or it 404s on GitHub Pages.
 *
 * The failure mode is SILENT — un-prefixed links resolve fine in every local
 * preview (browsed from the base path or via nav) and only break on the
 * project-pages host. The `rehypeBasePrefix` plugin in `astro.config.mjs`
 * prefixes authored markdown/MDX content links at build time; this script scans
 * the emitted HTML and fails the build if any un-prefixed root-relative href
 * survives, so a removed/broken plugin can't ship un-noticed.
 *
 * Verify against the EMITTED dist, never a preview (a preview masks the bug).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '/dashboard-for-laravel';
const DIST = fileURLToPath(new URL('../docs/dist', import.meta.url));

// Root-relative hrefs that are intentionally NOT documentation routes: they are
// illustrative placeholders inside interactive component demos (e.g. the user
// menu in the DXUserAvatar / DXDashboardNavbar demo). They are rendered by Vue
// islands, not the markdown pipeline, so the rehype plugin never sees them and
// prefixing them would not make them resolve anyway.
const ALLOWLIST = new Set(['/settings', '/notifications']);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (entry.endsWith('.html')) yield full;
  }
}

function isUnprefixed(href) {
  if (!href.startsWith('/')) return false; // external, fragment, mailto, relative
  if (href.startsWith('//')) return false; // protocol-relative
  if (
    href === BASE ||
    href.startsWith(`${BASE}/`) ||
    href.startsWith(`${BASE}#`) ||
    href.startsWith(`${BASE}?`)
  ) {
    return false; // already prefixed
  }
  return !ALLOWLIST.has(href);
}

const hrefRe = /href="([^"]*)"/g;
const offenders = [];

for (const file of walk(DIST)) {
  const html = readFileSync(file, 'utf8');
  for (const [, href] of html.matchAll(hrefRe)) {
    if (isUnprefixed(href)) {
      offenders.push({ file: file.slice(DIST.length + 1), href });
    }
  }
}

if (offenders.length > 0) {
  console.error(
    `\n✗ ${offenders.length} root-relative link(s) missing the "${BASE}" base ` +
      `prefix — these 404 on GitHub Pages (#146):\n`,
  );
  for (const { file, href } of offenders) {
    console.error(`  ${file}  →  ${href}`);
  }
  console.error(
    `\nFix at build level (the rehypeBasePrefix plugin in astro.config.mjs), ` +
      `not per-link. If a new href is a deliberate demo placeholder, add it to ` +
      `ALLOWLIST in scripts/check-docs-base-links.mjs.\n`,
  );
  process.exit(1);
}

console.log(`✓ docs base-link check passed (${BASE}).`);
