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
 *
 * The same applies to the theme's bundled text fonts (Maven Pro, Poppins in
 * resources/fonts/), so EVERY inlined woff2 is extracted. A data URI carries no
 * name, so each is named after the source file with identical bytes
 * (`MavenPro-Regular-<hash>.woff2`, `bootstrap-icons-<hash>.woff2`); one with no
 * known source is still extracted, as `font-<hash>.woff2`.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(rootDir, 'dist');
const stylesheetPath = join(distDir, 'style.css');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Every woff2 the stylesheet can reference, keyed by content hash, so an
// inlined font can be given its source file's name.
const fontsDir = join(rootDir, 'resources', 'fonts');
const knownFonts = [
  join(rootDir, 'node_modules', 'bootstrap-icons', 'font', 'fonts', 'bootstrap-icons.woff2'),
  ...readdirSync(fontsDir, { recursive: true })
    .filter((path) => path.endsWith('.woff2'))
    .map((path) => join(fontsDir, path)),
];
const nameByHash = new Map(
  knownFonts.map((path) => [sha256(readFileSync(path)), basename(path, '.woff2')]),
);

const stylesheet = readFileSync(stylesheetPath, 'utf8');
const dataUris = [...new Set(stylesheet.match(/url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\)/g) ?? [])];

if (dataUris.length === 0) {
  // Not an error: a Vite change that stops inlining is the outcome we want.
  console.log('[fonts] no inlined woff2 found — nothing to extract.');
  process.exit(0);
}

mkdirSync(join(distDir, 'assets'), { recursive: true });

let rewritten = stylesheet;
for (const dataUri of dataUris) {
  const font = Buffer.from(dataUri.slice('url(data:font/woff2;base64,'.length, -1), 'base64');
  const hash = sha256(font);
  const fontFile = `${nameByHash.get(hash) ?? 'font'}-${hash.slice(0, 8)}.woff2`;
  writeFileSync(join(distDir, 'assets', fontFile), font);
  rewritten = rewritten.replaceAll(dataUri, `url(./assets/${fontFile})`);
  console.log(`[fonts] extracted ${fontFile} (${(font.length / 1024).toFixed(0)} KB)`);
}
writeFileSync(stylesheetPath, rewritten);

console.log(
  `[fonts] style.css ${(Buffer.byteLength(stylesheet) / 1024).toFixed(0)} KB -> ` +
    `${(Buffer.byteLength(rewritten) / 1024).toFixed(0)} KB`,
);
