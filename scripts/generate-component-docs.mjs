#!/usr/bin/env node

/**
 * Simple custom documentation generator for Vue components
 * Parses JSDoc comments and generates Markdown files for Astro
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMPONENTS_ROOT = join(__dirname, '../resources/js/components');
const OUTPUT_DIR = join(__dirname, '../docs/src/pages/components');

/**
 * Extract JSDoc comment block from file content
 */
function extractJSDoc(content) {
  const jsDocRegex = /\/\*\*([\s\S]*?)\*\//g;
  const matches = [...content.matchAll(jsDocRegex)];

  if (matches.length === 0) return null;

  // Get the first (main) JSDoc block
  const mainDoc = matches[0][1];

  // Parse the JSDoc content
  const lines = mainDoc.split('\n').map(line => {
    // Remove leading * and whitespace
    return line.replace(/^\s*\*\s?/, '').trim();
  }).filter(line => line.length > 0);

  const parsed = {
    description: '',
    component: false,
    example: '',
    tags: {}
  };

  let currentSection = 'description';
  let exampleLines = [];

  for (const line of lines) {
    if (line.startsWith('@component')) {
      parsed.component = true;
      continue;
    }

    if (line.startsWith('@example')) {
      currentSection = 'example';
      continue;
    }

    const tagMatch = line.match(/^@(\w+)\s+(.+)/);
    if (tagMatch) {
      parsed.tags[tagMatch[1]] = tagMatch[2];
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
 * Extract component name from file path
 */
function getComponentName(filePath) {
  return basename(filePath, '.vue');
}

/**
 * Determine component category (base wrapper vs extended)
 */
function getComponentCategory(filePath) {
  if (filePath.includes('/base/')) {
    return 'base';
  } else if (filePath.includes('/extended/')) {
    return 'extended';
  }
  return 'unknown';
}

/**
 * Extract props from TypeScript interface in script section
 */
function extractProps(content) {
  const props = [];

  // Match interface Props { ... } or interface PropsType { ... }
  // Support generics like Props<T> or Props<TItem = any>
  const interfaceRegex = /interface\s+(Props|PropsType)(?:<[^>]+>)?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s;
  const match = content.match(interfaceRegex);

  if (!match) return props;

  const interfaceContent = match[2];

  // Match each property line
  // Format: key?: type; or key: type; with optional JSDoc comment
  const propRegex = /\/\*\*\s*([^*]+?)\s*\*\/\s*\n\s*(\w+)(\?)?:\s*([^;]+);/g;
  const simplePropRegex = /^\s*(\w+)(\?)?:\s*([^;]+);/gm;

  // First try to match props with JSDoc comments
  let propMatch;
  const propsWithDocs = new Map();

  while ((propMatch = propRegex.exec(interfaceContent)) !== null) {
    const [, description, name, optional, type] = propMatch;
    propsWithDocs.set(name, {
      name,
      type: type.trim(),
      required: !optional,
      description: description.trim()
    });
  }

  // Then get all props (including those without JSDoc)
  while ((propMatch = simplePropRegex.exec(interfaceContent)) !== null) {
    const [, name, optional, type] = propMatch;

    if (!propsWithDocs.has(name)) {
      props.push({
        name,
        type: type.trim(),
        required: !optional,
        description: ''
      });
    }
  }

  // Add props with docs
  props.push(...propsWithDocs.values());

  // Try to find defaults from withDefaults
  // Handle both simple and complex default objects
  const defaultsRegex = /withDefaults\s*\([^,]+,\s*\{([\s\S]*?)\n\}\)/;
  const defaultsMatch = content.match(defaultsRegex);

  if (defaultsMatch) {
    const defaultsContent = defaultsMatch[1];
    props.forEach(prop => {
      // Try to match various formats:
      // propertyName: value,
      // propertyName: () => ({ ... }),
      const defaultRegex = new RegExp(`${prop.name}:\\s*([^,\n]+(?:\\([^)]*\\))?(?:\\s*=>\\s*\\([^)]*\\))?)`);
      const defaultMatch = defaultsContent.match(defaultRegex);
      if (defaultMatch) {
        let defaultValue = defaultMatch[1].trim();

        // Simplify function defaults
        if (defaultValue.startsWith('() =>')) {
          defaultValue = 'function';
        }

        // Remove quotes from strings
        defaultValue = defaultValue.replace(/^['"]|['"]$/g, '');

        prop.default = defaultValue;
      }
    });
  }

  return props;
}

/**
 * Extract events from defineEmits in script section
 */
function extractEvents(content) {
  const events = [];

  // Match defineEmits<{ eventName: [...] }> or defineEmits(['eventName'])
  const emitsTypeRegex = /defineEmits<\{([^}]+)\}>/s;
  const emitsArrayRegex = /defineEmits\(\[([^\]]+)\]/;

  const typeMatch = content.match(emitsTypeRegex);
  const arrayMatch = content.match(emitsArrayRegex);

  if (typeMatch) {
    // Parse type-based emits
    const emitsContent = typeMatch[1];
    const eventRegex = /(\w+):\s*\[([^\]]*)\]/g;

    let eventMatch;
    while ((eventMatch = eventRegex.exec(emitsContent)) !== null) {
      const [, name, params] = eventMatch;
      events.push({
        name,
        params: params.trim() || 'none'
      });
    }
  } else if (arrayMatch) {
    // Parse array-based emits
    const eventNames = arrayMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    eventNames.forEach(name => {
      if (name) {
        events.push({ name, params: 'unknown' });
      }
    });
  }

  return events;
}

/**
 * Extract slots from template section
 */
function extractSlots(content) {
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  if (!templateMatch) return [];

  const template = templateMatch[1];

  // Check for v-for slot forwarding pattern first
  // This pattern indicates the component forwards all slots dynamically
  if (template.includes('v-for="(_, name) in $slots"') || template.includes('v-for="(_, name) in slots"')) {
    return ['*']; // Indicates dynamic slot forwarding
  }

  // Only extract explicit slot names if not using dynamic forwarding
  const slotRegex = /<slot\s+name="([^"]+)"/g;
  const slots = new Set();

  let match;
  while ((match = slotRegex.exec(template)) !== null) {
    const slotName = match[1];
    if (slotName && !slotName.includes('${')) { // Ignore template literals
      slots.add(slotName);
    }
  }

  // Check for default slot
  if (template.includes('<slot') && !template.match(/<slot\s+name=/)) {
    slots.add('default');
  }

  return Array.from(slots);
}

/**
 * Generate a basic example for a component if none provided
 */
function generateBasicExample(componentName, category) {
  // Define some basic examples for common components
  const examples = {
    'DButton': '<DButton variant="primary">Click Me</DButton>',
    'DCard': '<DCard>\n  <template #header>Card Header</template>\n  <p>Card content goes here.</p>\n</DCard>',
    'DAlert': '<DAlert variant="info">This is an informational alert.</DAlert>',
    'DBadge': '<DBadge variant="success">New</DBadge>',
    'DSpinner': '<DSpinner variant="primary" />',
    'DCollapse': '<DCollapse id="example-collapse">\n  <p>This content can be collapsed.</p>\n</DCollapse>',
  };

  // Return specific example if available, otherwise generic
  if (examples[componentName]) {
    return examples[componentName];
  }

  // Generate a generic example
  if (category === 'base') {
    return `<${componentName}>\n  Example content\n</${componentName}>`;
  } else {
    return `<${componentName} />\n<!-- Configure props as needed -->`;
  }
}

/**
 * Generate MDX documentation for a component
 */
function generateAstro(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const componentName = getComponentName(filePath);
  const category = getComponentCategory(filePath);
  const jsDoc = extractJSDoc(content);
  const slots = extractSlots(content);
  const props = category === 'extended' ? extractProps(content) : [];
  const events = category === 'extended' ? extractEvents(content) : [];

  if (!jsDoc) {
    console.log(`⚠️  No JSDoc found for ${componentName}, skipping...`);
    return null;
  }

  // Determine paths based on category
  const layoutPath = '../../../layouts/DashboardLayout.astro';

  // Build MDX frontmatter and imports
  let markdown = `---
layout: ${layoutPath}
title: ${componentName}
---

import ComponentExample from '../../../components/ComponentExample.vue';
import ${componentName}Example from '../../../examples/${componentName}Example.vue';

# ${componentName}

${jsDoc.description}
`;

  // Add example if present
  if (jsDoc.example) {
    // Remove code fences if they exist
    let exampleCode = jsDoc.example.trim();
    if (exampleCode.startsWith('```')) {
      // Extract code from fences
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
    // Generate a basic example if none provided
    const basicExample = generateBasicExample(componentName, category);
    markdown += `
## Example

\`\`\`vue
${basicExample}
\`\`\`
`;
  }

  // Add props section for extended components
  if (category === 'extended' && props.length > 0) {
    markdown += `
## Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
`;
    props.forEach(prop => {
      const required = prop.required ? 'Yes' : 'No';
      const defaultValue = prop.default || '-';
      const description = prop.description || '';
      markdown += `| ${prop.name} | \`${prop.type}\` | ${required} | ${defaultValue} | ${description} |\n`;
    });
  }

  // Add events section for extended components
  if (category === 'extended' && events.length > 0) {
    markdown += `
## Events

| Name | Parameters |
|------|------------|
`;
    events.forEach(event => {
      markdown += `| ${event.name} | ${event.params} |\n`;
    });
  }

  // Add slots section
  if (slots.length > 0) {
    markdown += `
## Slots

`;
    if (slots.includes('*')) {
      markdown += `This component forwards all slots dynamically from the underlying Bootstrap Vue Next component.
`;
    } else {
      markdown += `| Name | Description |
|------|-------------|
`;
      slots.forEach(slotName => {
        markdown += `| ${slotName} | - |\n`;
      });
    }
  }

  // Add footer note based on component category
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

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '{': '&#123;',
    '}': '&#125;',
  };
  return text.replace(/[&<>"'{}]/g, m => map[m]);
}

/**
 * Find all Vue component files recursively
 */
function findVueFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.vue') && /^[A-Z]/.test(entry)) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Finding Vue components...');
  const componentFiles = findVueFiles(COMPONENTS_ROOT);
  console.log(`📦 Found ${componentFiles.length} components\n`);

  // Ensure output directory exists
  try {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  } catch (err) {
    // Directory already exists
  }

  let generated = 0;
  let skipped = 0;

  for (const filePath of componentFiles) {
    const componentName = getComponentName(filePath);
    const category = getComponentCategory(filePath);
    const astro = generateAstro(filePath);

    if (astro) {
      // Organize by category: base/ and extended/ subdirectories
      const categoryDir = join(OUTPUT_DIR, category);
      try {
        mkdirSync(categoryDir, { recursive: true });
      } catch (err) {
        // Directory already exists
      }

      const outputPath = join(categoryDir, `${componentName}.mdx`);
      writeFileSync(outputPath, astro, 'utf-8');
      console.log(`✅ Generated docs for ${componentName} (${category})`);
      generated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✨ Done! Generated ${generated} docs, skipped ${skipped}`);
}

main();
