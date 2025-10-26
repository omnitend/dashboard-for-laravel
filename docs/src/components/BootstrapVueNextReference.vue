<template>
  <div class="bvn-reference">
    <h2>Slots</h2>
    <p>This component forwards all slots dynamically from the underlying Bootstrap Vue Next component.</p>

    <h2>Bootstrap Vue Next Wrapper</h2>
    <p>
      This is a lightweight type-safe wrapper around the corresponding Bootstrap Vue Next component.
      It provides API stability and forwards all props, events, and slots.
    </p>
    <p>
      <strong>For complete API documentation</strong> (props, events, methods), refer to the
      <a :href="bvnUrl" target="_blank" rel="noopener noreferrer" class="bvn-link">
        Bootstrap Vue Next {{ bootstrapComponentName }} documentation
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          fill="currentColor"
          viewBox="0 0 16 16"
          class="external-icon"
        >
          <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/>
          <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>
        </svg>
      </a>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  componentName: string; // e.g., "DAccordion", "DButton"
}

const props = defineProps<Props>();

// Convert DAccordion -> BAccordion
const bootstrapComponentName = computed(() => {
  return 'B' + props.componentName.substring(1);
});

// Convert DAccordion -> accordion for URL
const urlSlug = computed(() => {
  return props.componentName.substring(1).toLowerCase();
});

const bvnUrl = computed(() => {
  return `https://bootstrap-vue-next.github.io/bootstrap-vue-next/docs/components/${urlSlug.value}.html`;
});
</script>

<style scoped>
.bvn-reference {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--bs-border-color);
}

.bvn-reference h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: var(--bs-dark);
}

.bvn-reference p {
  margin-bottom: 1rem;
  line-height: 1.6;
  color: var(--bs-body-color);
}

.bvn-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--bs-primary);
  text-decoration: none;
  font-weight: 500;
}

.bvn-link:hover {
  text-decoration: underline;
}

.external-icon {
  flex-shrink: 0;
  margin-left: 0.125rem;
}
</style>
