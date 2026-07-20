/**
 * Single source of truth for component documentation metadata (#136).
 *
 * Historically four generator scripts each discovered "what components exist"
 * and parsed their APIs their own way, and they disagreed:
 *   - generate-component-docs.mjs reimplemented TS/prop parsing with REGEXES;
 *   - generate-api-manifest.mjs dir-scanned + used vue-docgen-api (the good one);
 *   - generate-llms-txt.mjs matched only `export { default as … }` in index.ts,
 *     so RAW BVN RE-EXPORTS (DTab, DCarousel, DCarouselSlide — exported as
 *     `export { BTab as DTab }`) were silently OMITTED.
 *
 * This module consolidates onto ONE parser (`vue-docgen-api`) and ONE registry.
 * The registry is the union of:
 *   (a) every local `.vue` under components/{base,extended,charts} — a SUPERSET
 *       that, like the old api-manifest, includes internal (non-exported)
 *       pieces such as DXTableShell so api-reference.json loses nothing; and
 *   (b) the raw re-exports declared in index.ts (DTab/DCarousel/DCarouselSlide),
 *       which have no `.vue` file and were the thing llms.txt was missing.
 *
 * Each consumer filters this one manifest for its own audience (see the
 * per-consumer notes below), but the knowledge of what exists / what is public
 * / what is a re-export lives here, once.
 */

import { parse } from 'vue-docgen-api';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const rootDir = join(__dirname, '..', '..');

const COMPONENTS_ROOT = join(rootDir, 'resources/js/components');
const INDEX_TS = join(rootDir, 'resources/js/index.ts');
const CHARTS_TS = join(rootDir, 'resources/js/charts.ts');

/**
 * Extract the leading component description. vue-docgen-api does NOT surface the
 * file-leading comment for our `<script setup>` SFCs, so read it ourselves.
 * Supports a leading `/** ... *​/` JS block or a leading `<!-- ... -->` HTML
 * comment, stripping `@component`/`@displayName` markers and comment decoration.
 * (Ported verbatim from the old generate-api-manifest.mjs so api-reference.json
 * descriptions are unchanged.)
 */
export function extractLeadingDescription(source) {
  const jsBlock = source.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  const htmlBlock = source.match(/^\s*<!--([\s\S]*?)-->/);
  const raw = jsBlock?.[1] ?? htmlBlock?.[1];
  if (!raw) return '';

  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter((line) => line && !/^@(component|displayName)\b/.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse the FIRST `/** ... *​/` JSDoc block anywhere in the file into a
 * description + `@example`. This is the prose/example extraction the old
 * generate-component-docs.mjs did (and which vue-docgen-api does NOT do for
 * these SFCs), preserved so the MDX pages keep their description + Example
 * sections. Its skip semantics are identical to the old script's `extractJSDoc`
 * (returns null when there is no JSDoc block), so the MDX generator emits the
 * exact same SET of pages it did before.
 */
export function extractJsDocBlock(content) {
  const matches = [...content.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
  if (matches.length === 0) return null;

  const lines = matches[0][1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter((line) => line.length > 0);

  const parsed = { description: '', example: '' };
  let currentSection = 'description';
  const exampleLines = [];

  for (const line of lines) {
    if (line.startsWith('@component')) continue;
    if (line.startsWith('@example')) {
      currentSection = 'example';
      continue;
    }
    const tagMatch = line.match(/^@(\w+)\s+(.+)/);
    if (tagMatch) {
      currentSection = null;
      continue;
    }
    if (currentSection === 'description' && !line.startsWith('@')) {
      parsed.description += (parsed.description ? ' ' : '') + line;
    } else if (currentSection === 'example') {
      exampleLines.push(line);
    }
  }

  parsed.example = exampleLines.join('\n');
  return parsed;
}

/**
 * Detect the "forwards all slots dynamically" pattern from the template — the
 * D* wrappers' `v-for="(_, name) in $slots"`. vue-docgen-api can't see this, and
 * the MDX pages render a specific note for it, so preserve the detection here.
 * Returns { dynamic: true } or an explicit list of slot names for the MDX docs.
 */
export function extractTemplateSlots(content) {
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  if (!templateMatch) return { dynamic: false, names: [] };
  const template = templateMatch[1];

  if (
    template.includes('v-for="(_, name) in $slots"') ||
    template.includes('v-for="(_, name) in slots"')
  ) {
    return { dynamic: true, names: [] };
  }

  const names = new Set();
  let m;
  const slotRegex = /<slot\s+name="([^"]+)"/g;
  while ((m = slotRegex.exec(template)) !== null) {
    if (m[1] && !m[1].includes('${')) names.add(m[1]);
  }
  if (template.includes('<slot') && !template.match(/<slot\s+name=/)) {
    names.add('default');
  }
  return { dynamic: false, names: Array.from(names) };
}

/** Readable type string for a vue-docgen-api prop type (unions joined). */
export function formatPropType(type) {
  if (!type) return 'any';
  if (type.name === 'union' && Array.isArray(type.elements)) {
    return type.elements.map((el) => el.name).join(' | ');
  }
  return type.name || 'any';
}

// Map vue-docgen-api output → the shapes the existing outputs expect. Kept
// byte-compatible with the old generate-api-manifest.mjs mapping.
function mapProps(info) {
  return (info.props || []).map((prop) => ({
    name: prop.name,
    type: prop.type?.name || 'any',
    typeLabel: formatPropType(prop.type),
    required: prop.required || false,
    default: prop.defaultValue?.value,
    description: prop.description || '',
  }));
}
function mapEvents(info) {
  return (info.events || []).map((event) => ({
    name: event.name,
    description: event.description || '',
    properties: event.properties || [],
  }));
}
function mapSlots(info) {
  return (info.slots || []).map((slot) => ({
    name: slot.name,
    description: slot.description || '',
    bindings: slot.bindings || [],
  }));
}
function mapMethods(info) {
  return (info.methods || []).map((method) => ({
    name: method.name,
    description: method.description || '',
    params: method.params || [],
    returns: method.returns || {},
  }));
}

async function parseLocalComponent({ name, category, entry, exported, absPath }) {
  const source = readFileSync(absPath, 'utf8');
  const relPath = absPath.replace(rootDir + '/', '');
  let info = {};
  let parseError = null;
  try {
    info = await parse(absPath);
  } catch (error) {
    parseError = error.message;
    console.warn(`⚠️  Failed to parse ${name}: ${error.message}`);
  }

  const description = info.description?.trim() || extractLeadingDescription(source);

  return {
    name,
    category,
    entry,
    exported,
    isReExport: false,
    bvnComponent: null,
    hasLocalFile: true,
    filePath: relPath,
    absPath,
    description,
    // MDX-oriented prose (unchanged from the old regex generator):
    jsDoc: extractJsDocBlock(source),
    templateSlots: extractTemplateSlots(source),
    // vue-docgen-api-parsed API (the single parser):
    props: mapProps(info),
    events: mapEvents(info),
    slots: mapSlots(info),
    methods: mapMethods(info),
    ...(parseError ? { error: parseError } : {}),
  };
}

function reExportComponent({ name, category, entry, bvnComponent }) {
  return {
    name,
    category,
    entry,
    exported: true,
    isReExport: true,
    bvnComponent,
    hasLocalFile: false,
    filePath: 'resources/js/index.ts',
    absPath: null,
    // Raw re-export of a bvn component (no local wrapper): its full API is
    // Bootstrap Vue Next's. Described consistently with the base-wrapper line.
    description: `Bootstrap Vue Next ${bvnComponent.replace(/^B/, '')} (re-exported as ${name}).`,
    jsDoc: null,
    templateSlots: { dynamic: true, names: [] },
    props: [],
    events: [],
    slots: [],
    methods: [],
  };
}

/**
 * Read the public export registry from a barrel file. Returns two maps keyed by
 * exported name: local-file default exports and bvn re-exports.
 */
function readRegistry(barrelPath, defaultCategory, entry) {
  const src = readFileSync(barrelPath, 'utf8');
  const locals = [];
  const reExports = [];

  // export { default as DName } from "./components/<dir>/File.vue";
  for (const m of src.matchAll(
    /export \{ default as ([A-Z][A-Za-z0-9]+) \} from "\.\/components\/(base|extended|charts)\/([A-Za-z0-9]+)\.vue"/g,
  )) {
    locals.push({ name: m[1], dir: m[2], file: m[3] });
  }

  // export { BName as DName } from "bootstrap-vue-next";
  for (const m of src.matchAll(
    /export \{ (B[A-Za-z0-9]+) as ([A-Z][A-Za-z0-9]+) \} from "bootstrap-vue-next"/g,
  )) {
    reExports.push({ bvnComponent: m[1], name: m[2] });
  }

  return { locals, reExports, defaultCategory, entry };
}

/**
 * Build the unified manifest. Returns:
 *   { components: [...], byAbsPath: Map, byName: Map }
 * `components` is the SUPERSET (all local .vue in base/extended/charts +
 * re-exports). Each entry carries `exported`/`entry`/`isReExport`/`category`
 * so a consumer can filter to its audience.
 */
export async function buildManifest() {
  const mainRegistry = readRegistry(INDEX_TS, null, 'main');
  const chartsRegistry = existsSync(CHARTS_TS)
    ? readRegistry(CHARTS_TS, 'extended', 'charts')
    : { locals: [], reExports: [] };

  // Which absolute file paths are publicly exported, and via which entry.
  // (Charts are grouped with `extended`, matching the old api-manifest.)
  const exportedByAbs = new Map();
  for (const loc of mainRegistry.locals) {
    const category = loc.dir === 'base' ? 'base' : 'extended';
    const abs = join(COMPONENTS_ROOT, loc.dir, `${loc.file}.vue`);
    exportedByAbs.set(abs, { category, entry: 'main', name: loc.name });
  }
  for (const loc of chartsRegistry.locals) {
    const abs = join(COMPONENTS_ROOT, 'charts', `${loc.file}.vue`);
    exportedByAbs.set(abs, { category: 'extended', entry: 'charts', name: loc.name });
  }

  // Dir-scan superset (base + extended + charts). Charts group under extended.
  const dirs = [
    { dir: 'base', category: 'base' },
    { dir: 'extended', category: 'extended' },
    { dir: 'charts', category: 'extended' },
  ];

  const components = [];
  for (const { dir, category } of dirs) {
    const abspath = join(COMPONENTS_ROOT, dir);
    if (!existsSync(abspath)) continue;
    for (const file of readdirSync(abspath)) {
      if (!file.endsWith('.vue')) continue;
      const absPath = join(abspath, file);
      const name = basename(file, '.vue');
      const exportMeta = exportedByAbs.get(absPath);
      components.push(
        await parseLocalComponent({
          name,
          category,
          entry: exportMeta?.entry ?? 'main',
          exported: Boolean(exportMeta),
          absPath,
        }),
      );
    }
  }

  // Raw bvn re-exports (base category, main entry) — the DTab/DCarousel fix.
  for (const re of mainRegistry.reExports) {
    components.push(
      reExportComponent({
        name: re.name,
        category: 'base',
        entry: 'main',
        bvnComponent: re.bvnComponent,
      }),
    );
  }

  const byAbsPath = new Map();
  const byName = new Map();
  for (const component of components) {
    if (component.absPath) byAbsPath.set(component.absPath, component);
    byName.set(component.name, component);
  }

  return { components, byAbsPath, byName };
}
