<template>
  <div class="examples">
    <div class="example-section">
      <h5>Basic Accordion</h5>
      <DAccordion>
        <DAccordionItem title="Accordion Item #1" visible>
          <strong>This is the first item's content.</strong> It is shown by default.
        </DAccordionItem>
        <DAccordionItem title="Accordion Item #2">
          This is the second item's content.
        </DAccordionItem>
        <DAccordionItem title="Accordion Item #3">
          This is the third item's content.
        </DAccordionItem>
      </DAccordion>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DAccordion, DAccordionItem } from '@omnitend/dashboard-for-laravel';

</script>
