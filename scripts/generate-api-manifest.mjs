#!/usr/bin/env node

/**
 * Generate component API manifest (JSON) → docs/public/api-reference.json.
 *
 * Consumes the single shared manifest (scripts/lib/component-manifest.mjs),
 * which parses every component with vue-docgen-api. The output JSON SHAPE is
 * unchanged from before; the only difference is coverage: the raw bvn
 * re-exports (DTab/DCarousel/DCarouselSlide) now appear alongside the local-file
 * components, so this file and llms.txt finally agree on what exists (#136).
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildManifest, rootDir } from './lib/component-manifest.mjs';

// Map a shared-manifest component → the exact api-reference.json entry shape.
function toEntry(component) {
  const entry = {
    name: component.name,
    category: component.category,
    filePath: component.filePath,
    description: component.description,
    props: component.props.map((prop) => ({
      name: prop.name,
      type: prop.type,
      required: prop.required,
      default: prop.default,
      description: prop.description,
    })),
    events: component.events,
    slots: component.slots,
    methods: component.methods,
  };
  if (component.error) entry.error = component.error;
  return entry;
}

async function generateManifest() {
  console.log('🔍 Parsing component files...');

  const { components } = await buildManifest();

  const byName = (a, b) => a.name.localeCompare(b.name);
  const baseComponents = components
    .filter((c) => c.category === 'base')
    .map(toEntry)
    .sort(byName);
  const extendedComponents = components
    .filter((c) => c.category === 'extended')
    .map(toEntry)
    .sort(byName);

  const manifest = {
    generated: new Date().toISOString(),
    package: {
      name: '@omnitend/dashboard-for-laravel',
      version: JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')).version,
    },
    components: {
      base: baseComponents,
      extended: extendedComponents,
    },
    stats: {
      totalComponents: baseComponents.length + extendedComponents.length,
      baseComponents: baseComponents.length,
      extendedComponents: extendedComponents.length,
    },
  };

  const outputPath = join(rootDir, 'docs/public/api-reference.json');
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('✅ Generated API manifest');
  console.log(`📝 Output: ${outputPath}`);
  console.log(
    `📊 Components: ${manifest.stats.totalComponents} (${manifest.stats.baseComponents} base + ${manifest.stats.extendedComponents} extended)`,
  );
}

generateManifest().catch((error) => {
  console.error('❌ Error generating API manifest:', error);
  process.exit(1);
});
