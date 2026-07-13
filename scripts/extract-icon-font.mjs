/**
 * Extract the Bootstrap Icons webfont out of the built stylesheet.
 *
 * Vite ALWAYS inlines CSS-referenced assets as base64 data URIs in library mode
 * — `build.assetsInlineLimit` is documented as ignored when `build.lib` is set —
 * so the icon font embeds directly into `dist/style.css`. That is pathological
 * for a woff2: the format is already Brotli-compressed, base64 inflates it by a
 * third, and gzip can recover none of it. Measured on this package, the inlined
 * font alone was 137 KB of the stylesheet's 191 KB gzip — 72% of the CSS, for a
 * font most consumers never render a glyph from.
 *
 * Writing it back out as a real file costs nothing and changes nothing for
 * consumers (a bundler resolves the relative `url()` out of node_modules; a
 * plain `<link>` resolves it next to the stylesheet) — but the browser now only
 * fetches the font if an element actually uses a `.bi-*` glyph. An app that
 * never touches `DButton`'s `icon` prop pays zero for it.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const stylesheetPath = join(distDir, 'style.css');

const stylesheet = readFileSync(stylesheetPath, 'utf8');
const dataUri = /url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/.exec(stylesheet);

if (!dataUri) {
  // Not an error: a Vite change that stops inlining is the outcome we want.
  console.log('[icon-font] no inlined woff2 found — nothing to extract.');
  process.exit(0);
}

const font = Buffer.from(dataUri[1], 'base64');
const hash = createHash('sha256').update(font).digest('hex').slice(0, 8);
const fontFile = `bootstrap-icons-${hash}.woff2`;

mkdirSync(join(distDir, 'assets'), { recursive: true });
writeFileSync(join(distDir, 'assets', fontFile), font);
writeFileSync(stylesheetPath, stylesheet.replace(dataUri[0], `url(./assets/${fontFile})`));

const before = Buffer.byteLength(stylesheet);
const after = Buffer.byteLength(readFileSync(stylesheetPath, 'utf8'));
console.log(
  `[icon-font] extracted ${fontFile} (${(font.length / 1024).toFixed(0)} KB); ` +
    `style.css ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`,
);
