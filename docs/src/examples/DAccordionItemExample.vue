<template>
  <div class="examples">
    <div class="example-section">
      <h5>Accordion Item Usage</h5>
      <DAccordion>
        <DAccordionItem title="First Item" visible>
          <strong>This item starts expanded.</strong> Use the <code>visible</code> prop to control initial state.
        </DAccordionItem>
        <DAccordionItem title="Second Item">
          Click the header to expand this item.
        </DAccordionItem>
        <DAccordionItem title="Disabled Item" disabled>
          This item cannot be expanded.
        </DAccordionItem>
      </DAccordion>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DAccordion, DAccordionItem } from '@omnitend/dashboard-for-laravel';
</script>
