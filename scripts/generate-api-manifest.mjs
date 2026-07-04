#!/usr/bin/env node

/**
 * Generate component API manifest (JSON)
 *
 * This script uses vue-docgen-api to parse all Vue components and extract
 * their props, events, slots, and methods into a machine-readable JSON format.
 */

import { parse } from 'vue-docgen-api';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * Fallback component description: vue-docgen-api doesn't surface the
 * file-leading comment for our `<script setup>` SFCs, so read it ourselves.
 * Supports a leading `/** ... *​/` JS block or a leading `<!-- ... -->` HTML
 * comment (before the first SFC block), stripping `@component`/`@displayName`
 * marker lines and comment decoration.
 */
function extractLeadingDescription(source) {
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

// Parse a single component
async function parseComponent(filePath, name, category) {
  try {
    const componentInfo = await parse(filePath);
    const description =
      componentInfo.description?.trim() ||
      extractLeadingDescription(readFileSync(filePath, 'utf8'));

    return {
      name,
      category,
      filePath: filePath.replace(rootDir + '/', ''),
      description,
      props: (componentInfo.props || []).map(prop => ({
        name: prop.name,
        type: prop.type?.name || 'any',
        required: prop.required || false,
        default: prop.defaultValue?.value,
        description: prop.description || ''
      })),
      events: (componentInfo.events || []).map(event => ({
        name: event.name,
        description: event.description || '',
        properties: event.properties || []
      })),
      slots: (componentInfo.slots || []).map(slot => ({
        name: slot.name,
        description: slot.description || '',
        bindings: slot.bindings || []
      })),
      methods: (componentInfo.methods || []).map(method => ({
        name: method.name,
        description: method.description || '',
        params: method.params || [],
        returns: method.returns || {}
      }))
    };
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${name}: ${error.message}`);
    return {
      name,
      category,
      filePath: filePath.replace(rootDir + '/', ''),
      description: '',
      props: [],
      events: [],
      slots: [],
      methods: [],
      error: error.message
    };
  }
}

// Parse all components in a directory
async function parseComponentsInDirectory(dir, category) {
  const components = [];
  const files = readdirSync(dir);

  for (const file of files) {
    if (file.endsWith('.vue')) {
      const name = file.replace('.vue', '');
      const filePath = join(dir, file);
      const component = await parseComponent(filePath, name, category);
      components.push(component);
    }
  }

  return components;
}

// Main execution
async function generateManifest() {
  console.log('🔍 Parsing component files...');

  const baseDir = join(rootDir, 'resources/js/components/base');
  const extendedDir = join(rootDir, 'resources/js/components/extended');
  const chartsDir = join(rootDir, 'resources/js/components/charts');

  const baseComponents = await parseComponentsInDirectory(baseDir, 'base');
  // Chart wrappers (DX*Chart) are grouped with the extended components.
  const extendedComponents = [
    ...(await parseComponentsInDirectory(extendedDir, 'extended')),
    ...(await parseComponentsInDirectory(chartsDir, 'extended')),
  ];

  const manifest = {
    generated: new Date().toISOString(),
    package: {
      name: '@omnitend/dashboard-for-laravel',
      version: JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')).version
    },
    components: {
      base: baseComponents.sort((a, b) => a.name.localeCompare(b.name)),
      extended: extendedComponents.sort((a, b) => a.name.localeCompare(b.name))
    },
    stats: {
      totalComponents: baseComponents.length + extendedComponents.length,
      baseComponents: baseComponents.length,
      extendedComponents: extendedComponents.length
    }
  };

  const outputPath = join(rootDir, 'docs/public/api-reference.json');
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('✅ Generated API manifest');
  console.log(`📝 Output: ${outputPath}`);
  console.log(`📊 Components: ${manifest.stats.totalComponents} (${manifest.stats.baseComponents} base + ${manifest.stats.extendedComponents} extended)`);
}

generateManifest().catch(error => {
  console.error('❌ Error generating API manifest:', error);
  process.exit(1);
});
