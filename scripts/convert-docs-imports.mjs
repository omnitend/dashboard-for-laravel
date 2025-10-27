#!/usr/bin/env node

/**
 * Converts docs imports from source files to package imports
 *
 * FROM: import DButton from '../../../resources/js/components/base/DButton.vue'
 * TO:   import { DButton } from '@omni-tend/dashboard-for-laravel'
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const files = [
  'docs/src/config/navigation.ts',
  'docs/src/components/DashboardLayoutWrapper.vue',
  'docs/src/components/ComponentsTable.vue',
  'docs/src/components/PropsTable.vue',
  'docs/src/components/SlotsTable.vue',
  'docs/src/components/EventsTable.vue',
  'docs/src/examples/DAccordionExample.vue',
  'docs/src/examples/DAlertExample.vue',
  'docs/src/examples/DAvatarExample.vue',
  'docs/src/examples/DBadgeExample.vue',
  'docs/src/examples/DBreadcrumbExample.vue',
  'docs/src/examples/DButtonExample.vue',
  'docs/src/examples/DButtonGroupExample.vue',
  'docs/src/examples/DButtonToolbarExample.vue',
  'docs/src/examples/DCardExample.vue',
  'docs/src/examples/DCarouselExample.vue',
  'docs/src/examples/DColExample.vue',
  'docs/src/examples/DCollapseExample.vue',
  'docs/src/examples/DContainerExample.vue',
  'docs/src/examples/DDropdownExample.vue',
  'docs/src/examples/DDropdownDividerExample.vue',
  'docs/src/examples/DDropdownItemExample.vue',
  'docs/src/examples/DFormExample.vue',
  'docs/src/examples/DFormCheckboxExample.vue',
  'docs/src/examples/DFormGroupExample.vue',
  'docs/src/examples/DFormInputExample.vue',
  'docs/src/examples/DFormRadioExample.vue',
  'docs/src/examples/DFormSelectExample.vue',
  'docs/src/examples/DFormSpinbuttonExample.vue',
  'docs/src/examples/DFormTagsExample.vue',
  'docs/src/examples/DFormTextareaExample.vue',
  'docs/src/examples/DImageExample.vue',
  'docs/src/examples/DInputGroupExample.vue',
  'docs/src/examples/DLinkExample.vue',
  'docs/src/examples/DListGroupExample.vue',
  'docs/src/examples/DModalExample.vue',
  'docs/src/examples/DNavExample.vue',
  'docs/src/examples/DNavbarExample.vue',
  'docs/src/examples/DNavItemExample.vue',
  'docs/src/examples/DOffcanvasExample.vue',
  'docs/src/examples/DOverlayExample.vue',
  'docs/src/examples/DPaginationExample.vue',
  'docs/src/examples/DPlaceholderExample.vue',
  'docs/src/examples/DPopoverExample.vue',
  'docs/src/examples/DProgressExample.vue',
  'docs/src/examples/DRowExample.vue',
  'docs/src/examples/DSpinnerExample.vue',
  'docs/src/examples/DTableExample.vue',
  'docs/src/examples/DTabsExample.vue',
  'docs/src/examples/DToastExample.vue',
  'docs/src/examples/DToasterExample.vue',
  'docs/src/examples/DTooltipExample.vue',
  'docs/src/examples/DXBasicFormExample.vue',
  'docs/src/examples/DXDashboardExample.vue',
  'docs/src/examples/DXDashboardNavbarExample.vue',
  'docs/src/examples/DXDashboardSidebarExample.vue',
  'docs/src/examples/DXFormExample.vue',
  'docs/src/examples/DXTableExample.vue',
];

const packageName = '@omni-tend/dashboard-for-laravel';

files.forEach(file => {
  const filePath = resolve(process.cwd(), file);
  let content = readFileSync(filePath, 'utf-8');

  // Extract all component imports from source
  const importPattern = /import\s+(\w+)\s+from\s+['"](\.\.\/){3}resources\/js\/(components|composables|types|utils)\/[^'"]+['"]/g;
  const imports = [];
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    imports.push(match[1]);
  }

  if (imports.length === 0) {
    console.log(`✓ ${file} - No imports to convert`);
    return;
  }

  // Remove all old import lines
  content = content.replace(
    /import\s+\w+\s+from\s+['"](\.\.\/){3}resources\/js\/(components|composables|types|utils)\/[^'"]+['"]\s*;?\n/g,
    ''
  );

  // Remove type imports from source
  content = content.replace(
    /import\s+type\s+\{[^}]+\}\s+from\s+['"](\.\.\/){3}resources\/js\/[^'"]+['"]\s*;?\n/g,
    ''
  );

  // Find the script setup section
  const scriptMatch = content.match(/(<script setup lang="ts">)/);

  if (scriptMatch) {
    const insertPos = scriptMatch.index + scriptMatch[0].length;

    // Create new import statement
    const newImport = `\nimport { ${imports.join(', ')} } from '${packageName}';\n`;

    content = content.slice(0, insertPos) + newImport + content.slice(insertPos);
  }

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ ${file} - Converted ${imports.length} imports`);
});

console.log('\n✅ All files converted!');
