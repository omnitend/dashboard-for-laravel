#!/usr/bin/env node

/**
 * Generate /llms.txt file for AI agent discovery
 *
 * This script auto-generates a structured markdown file following the llms.txt
 * specification (https://llmstxt.org/) to help AI agents understand and use
 * the documentation.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { buildManifest, rootDir } from './lib/component-manifest.mjs';

// Read package.json for project info
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));

// Component lists come from the single shared manifest (#136). The old
// implementation scanned index.ts for `export { default as … }` ONLY, which
// silently omitted the raw bvn re-exports (DTab, DCarousel, DCarouselSlide,
// exported as `export { BTab as DTab }`) — they were missing from llms.txt.
// The manifest resolves those, so they now appear.
//
// Audience filter: the PUBLIC main-entry components (`exported && entry main`).
// Charts live behind a separate subpath entry and were never listed here, so
// filtering to `entry === 'main'` preserves that; internal (non-exported)
// pieces such as DXTableShell stay out, as before.
function getComponentLists(manifest) {
  const isPublicMain = (c) => c.exported && c.entry === 'main';
  const baseComponents = manifest.components
    .filter((c) => c.category === 'base' && isPublicMain(c))
    .map((c) => c.name);
  const extendedComponents = manifest.components
    .filter((c) => c.category === 'extended' && isPublicMain(c))
    .map((c) => c.name);

  return { baseComponents, extendedComponents };
}

// Scan guide pages
function getGuidePages() {
  const guidesDir = join(rootDir, 'docs/src/pages/guide');
  const files = readdirSync(guidesDir);

  return files
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = readFileSync(join(guidesDir, f), 'utf8');
      const titleMatch = content.match(/^title:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1] : f.replace('.md', '');
      const slug = f.replace('.md', '');
      return { title, slug };
    });
}

// Generate llms.txt content
function generateLlmsTxt(manifest) {
  const { baseComponents, extendedComponents } = getComponentLists(manifest);
  const guides = getGuidePages();

  const content = `# ${packageJson.name}

> ${packageJson.description}
>
> A dual-package library (NPM + Composer) providing ${baseComponents.length + extendedComponents.length} Vue 3 components for building Laravel dashboards with Bootstrap Vue Next.

## Installation

- [NPM Installation](https://github.com/omnitend/dashboard-for-laravel#npm-package): Install via npm/yarn
- [Composer Installation](https://github.com/omnitend/dashboard-for-laravel#composer-package): Install via Composer for Laravel integration

## Getting Started

${guides.map(g => `- [${g.title}](/guide/${g.slug}): ${getGuideDescription(g.slug)}`).join('\n')}

## Base Components (${baseComponents.length} components)

Lightweight type-safe wrappers around Bootstrap Vue Next components providing API stability and consistent theming.

${baseComponents.sort().map(name => `- [${name}](/components/base/${name.toLowerCase()}): Bootstrap Vue Next ${name.substring(1)} wrapper`).join('\n')}

## Extended Components (${extendedComponents.length} components)

Custom dashboard components with advanced functionality beyond Bootstrap Vue Next.

${extendedComponents.sort().map(name => `- [${name}](/components/extended/${name.toLowerCase()}): ${getExtendedDescription(name)}`).join('\n')}

## Composables

- [useForm](/guide/forms#useform-composable): Type-safe form state management with validation
- [defineForm](/guide/forms#defineform): Define forms from field definitions with type inference
- [useToast](/components/base/dtoaster): Toast notification system

## PHP Integration

- [BaseFormRequest](/guide/installation#laravel-integration): Laravel form request base class with validation
- [HasApiResponses](/guide/installation#laravel-integration): Trait for consistent API responses
- [PaginatedResource](/guide/installation#laravel-integration): Resource for paginated API responses

## Optional

Additional resources for advanced usage:

- [TypeScript Guide](/guide/typescript): Full type safety and IDE support
- [Theming Guide](/guide/theming): Customize Bootstrap theme with CSS variables
- [Common Patterns](/examples/common-patterns): Real-world usage examples
- [GitHub Repository](https://github.com/omnitend/dashboard-for-laravel): Source code and issue tracker
`;

  return content;
}

// Helper: Get description for guide pages
function getGuideDescription(slug) {
  const descriptions = {
    'installation': 'Install and configure the package',
    'getting-started': 'Quick start guide and core concepts',
    'forms': 'Type-safe form handling and validation',
    'theming': 'Customize appearance with CSS variables',
    'typescript': 'TypeScript types and best practices'
  };
  return descriptions[slug] || 'Documentation guide';
}

// Helper: Get description for extended components
function getExtendedDescription(name) {
  const descriptions = {
    'DXForm': 'Form renderer driven by field definitions, with optional tabs, conditional fields, per-field slots, async options, nested repeaters, and auto error-tab switching',
    'DXField': 'Single-field renderer for any field type with value/span/info/hint slots',
    'DXRepeater': 'Repeatable nested sub-form (field array) primitive',
    'DXTable': 'Data table with pagination, filtering, and sorting',
    'DXDashboard': 'Complete dashboard layout with sidebar and navbar',
    'DXDashboardSidebar': 'Collapsible sidebar with navigation',
    'DXDashboardNavbar': 'Top navbar with user dropdown'
  };
  return descriptions[name] || 'Extended dashboard component';
}

// Main execution
const manifest = await buildManifest();
const llmsTxt = generateLlmsTxt(manifest);
const outputPath = join(rootDir, 'docs/public/llms.txt');

writeFileSync(outputPath, llmsTxt, 'utf8');

console.log('✅ Generated llms.txt');
console.log(`📝 Output: ${outputPath}`);
console.log(`📊 File size: ${(llmsTxt.length / 1024).toFixed(2)} KB`);
