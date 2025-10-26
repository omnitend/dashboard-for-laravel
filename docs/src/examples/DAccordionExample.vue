<template>
  <div class="examples">
    <div class="example-section">
      <h5>Basic Accordion</h5>
      <DAccordion>
        <BAccordionItem title="Accordion Item #1" visible>
          <strong>This is the first item's content.</strong> It is shown by default.
        </BAccordionItem>
        <BAccordionItem title="Accordion Item #2">
          This is the second item's content.
        </BAccordionItem>
        <BAccordionItem title="Accordion Item #3">
          This is the third item's content.
        </BAccordionItem>
      </DAccordion>
    </div>
  </div>
</template>

<script setup lang="ts">
import DAccordion from "../../../resources/js/components/base/DAccordion.vue";
import { BAccordionItem } from "bootstrap-vue-next";
</script>
