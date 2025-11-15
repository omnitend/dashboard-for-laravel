#!/usr/bin/env node

/**
 * Generate /llms.txt file for AI agent discovery
 *
 * This script auto-generates a structured markdown file following the llms.txt
 * specification (https://llmstxt.org/) to help AI agents understand and use
 * the documentation.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read package.json for project info
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));

// Scan component exports from index.ts
function getComponentLists() {
  const indexTs = readFileSync(join(rootDir, 'resources/js/index.ts'), 'utf8');

  const baseComponents = [];
  const extendedComponents = [];

  // Extract D* component exports (base components)
  const baseMatches = indexTs.matchAll(/export \{ default as (D[A-Z][a-zA-Z]+) \} from "\.\/components\/base\//g);
  for (const match of baseMatches) {
    baseComponents.push(match[1]);
  }

  // Extract DX* component exports (extended components)
  const extendedMatches = indexTs.matchAll(/export \{ default as (DX[A-Z][a-zA-Z]+) \} from "\.\/components\/extended\//g);
  for (const match of extendedMatches) {
    extendedComponents.push(match[1]);
  }

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
function generateLlmsTxt() {
  const { baseComponents, extendedComponents } = getComponentLists();
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
    'DXBasicForm': 'Auto-generated forms from field definitions',
    'DXForm': 'Advanced form wrapper with defineForm integration',
    'DXTable': 'Data table with pagination, filtering, and sorting',
    'DXDashboard': 'Complete dashboard layout with sidebar and navbar',
    'DXDashboardSidebar': 'Collapsible sidebar with navigation',
    'DXDashboardNavbar': 'Top navbar with user dropdown'
  };
  return descriptions[name] || 'Extended dashboard component';
}

// Main execution
const llmsTxt = generateLlmsTxt();
const outputPath = join(rootDir, 'docs/public/llms.txt');

writeFileSync(outputPath, llmsTxt, 'utf8');

console.log('✅ Generated llms.txt');
console.log(`📝 Output: ${outputPath}`);
console.log(`📊 File size: ${(llmsTxt.length / 1024).toFixed(2)} KB`);
