#!/usr/bin/env node

/**
 * Generate MDX documentation pages for Vue components.
 *
 * Metadata (description, props, events, slots) now comes from the SINGLE shared
 * manifest (scripts/lib/component-manifest.mjs), which parses every component
 * with vue-docgen-api — the ~350 lines of bespoke regex TS/prop/emit parsing
 * that used to live here are gone (#136). The prose the parser can't give us —
 * the leading-JSDoc description + `@example`, and the "forwards all slots
 * dynamically" wrapper detection — is preserved (it's carried on each manifest
 * entry as `jsDoc` / `templateSlots`).
 *
 * NB: this generator is a manually-run, curated step (`npm run docs:generate`).
 * It is NOT part of `docs:build` (which only runs `docs:generate:ai` + astro),
 * and it deliberately mirrors the previous iteration behaviour: it walks the
 * component tree and emits a page for every component that has a JSDoc block.
 */

import { writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildManifest } from './lib/component-manifest.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMPONENTS_ROOT = join(__dirname, '../resources/js/components');
const OUTPUT_DIR = join(__dirname, '../docs/src/pages/components');

/** Component name from a .vue file path. */
function getComponentName(filePath) {
  return basename(filePath, '.vue');
}

/**
 * Determine the MDX page category from the file path (base vs extended). This is
 * intentionally path-based, matching the previous script: charts live outside
 * base/extended and render as a generic ('unknown') page.
 */
function getComponentCategory(filePath) {
  if (filePath.includes('/base/')) return 'base';
  if (filePath.includes('/extended/')) return 'extended';
  return 'unknown';
}

/** Make text safe for a single Markdown table cell (no newlines, escape pipes). */
function cell(text) {
  return String(text ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

/** A basic example for components whose JSDoc carries no `@example`. */
function generateBasicExample(componentName, category) {
  const examples = {
    DButton: '<DButton variant="primary">Click Me</DButton>',
    DCard: '<DCard>\n  <template #header>Card Header</template>\n  <p>Card content goes here.</p>\n</DCard>',
    DAlert: '<DAlert variant="info">This is an informational alert.</DAlert>',
    DBadge: '<DBadge variant="success">New</DBadge>',
    DSpinner: '<DSpinner variant="primary" />',
    DCollapse: '<DCollapse id="example-collapse">\n  <p>This content can be collapsed.</p>\n</DCollapse>',
  };
  if (examples[componentName]) return examples[componentName];
  if (category === 'base') return `<${componentName}>\n  Example content\n</${componentName}>`;
  return `<${componentName} />\n<!-- Configure props as needed -->`;
}

/**
 * Generate MDX for one component, driven by its shared-manifest entry.
 * Returns the markdown string, or null to skip (no JSDoc block — same skip rule
 * as before).
 */
function generateAstro(filePath, component) {
  const componentName = getComponentName(filePath);
  const category = getComponentCategory(filePath);

  const jsDoc = component?.jsDoc;
  if (!jsDoc) {
    console.log(`⚠️  No JSDoc found for ${componentName}, skipping...`);
    return null;
  }

  const props = category === 'extended' ? component.props : [];
  const events = category === 'extended' ? component.events : [];
  const templateSlots = component.templateSlots ?? { dynamic: false, names: [] };

  const layoutPath = '../../../layouts/DashboardLayout.astro';

  let markdown = `---
layout: ${layoutPath}
title: ${componentName}
---

import ComponentExample from '../../../components/ComponentExample.vue';
import ${componentName}Example from '../../../examples/${componentName}Example.vue';

# ${componentName}

${jsDoc.description}
`;

  // Example
  if (jsDoc.example) {
    let exampleCode = jsDoc.example.trim();
    if (exampleCode.startsWith('```')) {
      const lines = exampleCode.split('\n');
      exampleCode = lines.slice(1, -1).join('\n');
    }
    markdown += `
## Example

\`\`\`vue
${exampleCode}
\`\`\`
`;
  } else {
    markdown += `
## Example

\`\`\`vue
${generateBasicExample(componentName, category)}
\`\`\`
`;
  }

  // Props (extended only)
  if (category === 'extended' && props.length > 0) {
    markdown += `
## Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
`;
    props.forEach((prop) => {
      const required = prop.required ? 'Yes' : 'No';
      const defaultValue = cell(prop.default ?? '-');
      const description = cell(prop.description);
      markdown += `| ${cell(prop.name)} | \`${cell(prop.typeLabel || prop.type)}\` | ${required} | ${defaultValue} | ${description} |\n`;
    });
  }

  // Events (extended only)
  if (category === 'extended' && events.length > 0) {
    markdown += `
## Events

| Name | Parameters |
|------|------------|
`;
    events.forEach((event) => {
      const params =
        (event.properties || []).map((p) => p.name).join(', ') ||
        event.description ||
        '-';
      markdown += `| ${cell(event.name)} | ${cell(params)} |\n`;
    });
  }

  // Slots
  const hasSlots = templateSlots.dynamic || templateSlots.names.length > 0;
  if (hasSlots) {
    markdown += `
## Slots

`;
    if (templateSlots.dynamic) {
      markdown += `This component forwards all slots dynamically from the underlying Bootstrap Vue Next component.
`;
    } else {
      markdown += `| Name | Description |
|------|-------------|
`;
      templateSlots.names.forEach((slotName) => {
        markdown += `| ${slotName} | - |\n`;
      });
    }
  }

  // Footer
  if (category === 'base') {
    markdown += `
## Bootstrap Vue Next Wrapper

This is a lightweight type-safe wrapper around the corresponding Bootstrap Vue Next component.
It provides API stability and forwards all props, events, and slots.

**For complete API documentation** (props, events, methods), refer to the [Bootstrap Vue Next documentation](https://bootstrap-vue-next.github.io/bootstrap-vue-next/).
`;
  } else if (category === 'extended') {
    markdown += `
## Extended Component

This is a custom component that extends beyond simple Bootstrap Vue Next wrappers,
providing additional functionality specific to Laravel dashboards.
`;
  }

  return markdown;
}

/** Find all Vue component files recursively (PascalCase .vue). */
function findVueFiles(dir) {
  const files = [];
  function traverse(currentDir) {
    for (const entry of readdirSync(currentDir)) {
      const fullPath = join(currentDir, entry);
      if (statSync(fullPath).isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.vue') && /^[A-Z]/.test(entry)) {
        files.push(fullPath);
      }
    }
  }
  traverse(dir);
  return files;
}

async function main() {
  console.log('🔍 Building shared component manifest...');
  const manifest = await buildManifest();

  console.log('🔍 Finding Vue components...');
  const componentFiles = findVueFiles(COMPONENTS_ROOT);
  console.log(`📦 Found ${componentFiles.length} components\n`);

  try {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  } catch {
    // exists
  }

  let generated = 0;
  let skipped = 0;

  for (const filePath of componentFiles) {
    const componentName = getComponentName(filePath);
    const category = getComponentCategory(filePath);
    const component = manifest.byAbsPath.get(filePath);
    const astro = component ? generateAstro(filePath, component) : null;

    if (astro) {
      const categoryDir = join(OUTPUT_DIR, category);
      try {
        mkdirSync(categoryDir, { recursive: true });
      } catch {
        // exists
      }
      writeFileSync(join(categoryDir, `${componentName}.mdx`), astro, 'utf-8');
      console.log(`✅ Generated docs for ${componentName} (${category})`);
      generated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✨ Done! Generated ${generated} docs, skipped ${skipped}`);
}

main().catch((error) => {
  console.error('❌ Error generating component docs:', error);
  process.exit(1);
});
