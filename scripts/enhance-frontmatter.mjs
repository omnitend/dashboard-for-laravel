#!/usr/bin/env node

/**
 * Enhance MDX frontmatter with auto-extracted metadata
 *
 * This script enhances component documentation frontmatter by:
 * - Auto-extracting descriptions from component JSDoc comments
 * - Adding category tags (base/extended)
 * - Adding relevant tags based on component name/type
 * - Can be re-run anytime to update metadata
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'vue-docgen-api';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Generate tags based on component name
function generateTags(componentName, category) {
  const tags = [category === 'base' ? 'wrapper' : 'extended'];

  // Add tags based on component type
  if (componentName.includes('Form')) tags.push('forms');
  if (componentName.includes('Table')) tags.push('tables', 'data');
  if (componentName.includes('Dashboard')) tags.push('layout', 'navigation');
  if (componentName.includes('Navbar') || componentName.includes('Sidebar')) tags.push('navigation');
  if (componentName.includes('Button')) tags.push('buttons');
  if (componentName.includes('Card')) tags.push('containers');
  if (componentName.includes('Modal') || componentName.includes('Offcanvas')) tags.push('overlays');
  if (componentName.includes('Dropdown')) tags.push('dropdowns', 'menus');
  if (componentName.includes('Nav')) tags.push('navigation');
  if (componentName.includes('Alert') || componentName.includes('Toast')) tags.push('feedback');
  if (componentName.includes('Spinner') || componentName.includes('Progress')) tags.push('loading');
  if (componentName.includes('Badge')) tags.push('indicators');
  if (componentName.includes('Pagination')) tags.push('navigation', 'tables');
  if (componentName.includes('Collapse') || componentName.includes('Accordion')) tags.push('disclosure');

  return [...new Set(tags)]; // Remove duplicates
}

// Extract description from Vue component
async function extractComponentDescription(componentPath) {
  try {
    const componentInfo = await parse(componentPath);
    return componentInfo.description || '';
  } catch (error) {
    return '';
  }
}

// Update frontmatter in MDX file
function updateFrontmatter(filePath, componentName, category, vueComponentPath) {
  return new Promise(async (resolve) => {
    const content = readFileSync(filePath, 'utf8');

    // Check if frontmatter exists
    if (!content.startsWith('---')) {
      console.warn(`⚠️  No frontmatter in ${filePath}`);
      resolve(false);
      return;
    }

    // Extract existing frontmatter
    const frontmatterEnd = content.indexOf('---', 3);
    const frontmatter = content.substring(3, frontmatterEnd).trim();
    const body = content.substring(frontmatterEnd + 3);

    // Parse existing frontmatter
    const lines = frontmatter.split('\n');
    const metadata = {};
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }

    // Extract description from component if not present
    if (!metadata.description && vueComponentPath) {
      const desc = await extractComponentDescription(vueComponentPath);
      if (desc) {
        metadata.description = desc;
      } else {
        // Generate basic description
        metadata.description = category === 'base'
          ? `Type-safe wrapper around Bootstrap Vue Next's B${componentName.substring(1)} component`
          : `Extended dashboard component for ${componentName.replace(/^DX/, '').replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
      }
    }

    // Add category
    metadata.category = category === 'base' ? 'Base Component' : 'Extended Component';

    // Add tags
    if (!metadata.tags) {
      metadata.tags = generateTags(componentName, category).join(', ');
    }

    // Rebuild frontmatter
    const newFrontmatter = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const newContent = `---\n${newFrontmatter}\n---${body}`;

    writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Enhanced ${componentName}`);
    resolve(true);
  });
}

// Process all component docs
async function enhanceAllDocs() {
  console.log('🔍 Enhancing component documentation frontmatter...');

  let updated = 0;

  // Process base components
  const baseDocsDir = join(rootDir, 'docs/src/pages/components/base');
  const baseFiles = readdirSync(baseDocsDir).filter(f => f.endsWith('.mdx'));

  for (const file of baseFiles) {
    const componentName = file.replace('.mdx', '');
    const mdxPath = join(baseDocsDir, file);
    const vuePath = join(rootDir, `resources/js/components/base/${componentName}.vue`);

    const success = await updateFrontmatter(mdxPath, componentName, 'base', vuePath);
    if (success) updated++;
  }

  // Process extended components
  const extendedDocsDir = join(rootDir, 'docs/src/pages/components/extended');
  const extendedFiles = readdirSync(extendedDocsDir).filter(f => f.endsWith('.mdx'));

  for (const file of extendedFiles) {
    const componentName = file.replace('.mdx', '');
    const mdxPath = join(extendedDocsDir, file);
    const vuePath = join(rootDir, `resources/js/components/extended/${componentName}.vue`);

    const success = await updateFrontmatter(mdxPath, componentName, 'extended', vuePath);
    if (success) updated++;
  }

  console.log(`\n✅ Enhanced ${updated} component documentation files`);
}

enhanceAllDocs().catch(error => {
  console.error('❌ Error enhancing frontmatter:', error);
  process.exit(1);
});
