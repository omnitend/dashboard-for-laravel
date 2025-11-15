#!/usr/bin/env node

/**
 * Generate documentation map
 *
 * This script scans all documentation files and creates a hierarchical
 * overview in markdown format. Perfect for AI agents to understand
 * what documentation is available.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const docsDir = join(rootDir, 'docs/src/pages');

// Extract title from frontmatter
function extractTitle(content, filename) {
  const titleMatch = content.match(/^title:\s*(.+)$/m);
  if (titleMatch) return titleMatch[1];

  // Fallback: extract from first # heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1];

  // Final fallback: filename
  return filename.replace(/\.(md|mdx)$/, '');
}

// Extract description from frontmatter or content
function extractDescription(content) {
  const descMatch = content.match(/^description:\s*(.+)$/m);
  if (descMatch) return descMatch[1];

  // Try to get first paragraph after heading
  const lines = content.split('\n');
  let inFrontmatter = false;
  let foundHeading = false;

  for (const line of lines) {
    if (line === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;
    if (line.startsWith('#')) {
      foundHeading = true;
      continue;
    }
    if (foundHeading && line.trim() && !line.startsWith('import ') && !line.startsWith('<')) {
      return line.trim().substring(0, 100);
    }
  }

  return '';
}

// Recursively scan directory
function scanDirectory(dir, baseDir = dir) {
  const items = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const children = scanDirectory(fullPath, baseDir);
      if (children.length > 0) {
        items.push({
          type: 'directory',
          name: entry,
          path: relative(baseDir, fullPath),
          children
        });
      }
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      const content = readFileSync(fullPath, 'utf8');
      const title = extractTitle(content, entry);
      const description = extractDescription(content);
      const url = relative(baseDir, fullPath)
        .replace(/\.(md|mdx)$/, '')
        .replace(/\\/g, '/');

      items.push({
        type: 'file',
        name: entry,
        title,
        description,
        url: `/${url}`,
        path: relative(baseDir, fullPath)
      });
    }
  }

  return items;
}

// Generate markdown from structure
function generateMarkdown(items, level = 0) {
  let md = '';
  const indent = '  '.repeat(level);

  for (const item of items) {
    if (item.type === 'directory') {
      md += `\n${indent}### ${item.name.charAt(0).toUpperCase() + item.name.slice(1)}\n\n`;
      md += generateMarkdown(item.children, level);
    } else {
      md += `${indent}- [${item.title}](${item.url})`;
      if (item.description) {
        md += `: ${item.description}`;
      }
      md += '\n';
    }
  }

  return md;
}

// Main execution
function generateDocsMap() {
  console.log('🔍 Scanning documentation files...');

  const structure = scanDirectory(docsDir);

  const content = `# Documentation Map

> Auto-generated hierarchical overview of all documentation
> Last updated: ${new Date().toISOString()}

This file provides a complete map of all available documentation for AI agents and developers.

${generateMarkdown(structure)}

---

**Total Pages**: ${countPages(structure)}
`;

  return content;
}

// Helper: Count total pages
function countPages(items) {
  let count = 0;
  for (const item of items) {
    if (item.type === 'file') count++;
    if (item.children) count += countPages(item.children);
  }
  return count;
}

// Execute
const docsMap = generateDocsMap();
const outputPath = join(rootDir, 'docs/public/docs-map.md');

writeFileSync(outputPath, docsMap, 'utf8');

console.log('✅ Generated docs map');
console.log(`📝 Output: ${outputPath}`);
console.log(`📊 File size: ${(docsMap.length / 1024).toFixed(2)} KB`);
