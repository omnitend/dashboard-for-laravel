<template>
  <div class="collapse-examples">
    <div class="example-section">
      <h5>Basic Collapse</h5>
      <DButton variant="primary" @click="visible = !visible">
        {{ visible ? 'Hide' : 'Show' }} Content
      </DButton>
      <DCollapse v-model="visible" class="mt-3">
        <DCard>
          <p>This content can be collapsed and expanded by clicking the button above.</p>
          <p class="mb-0">The collapse animation is smooth and uses Bootstrap's built-in transitions.</p>
        </DCard>
      </DCollapse>
    </div>

    <div class="example-section">
      <h5>Accordion Example</h5>
      <div class="accordion-group">
        <div class="accordion-item">
          <DButton
            variant="outline-primary"
            class="w-100 text-start"
            @click="toggleAccordion(1)"
          >
            Accordion Item #1
          </DButton>
          <DCollapse v-model="accordionStates[1]">
            <div class="accordion-body">
              <p>This is the content for the first accordion item. Click another item to collapse this one.</p>
            </div>
          </DCollapse>
        </div>

        <div class="accordion-item">
          <DButton
            variant="outline-primary"
            class="w-100 text-start"
            @click="toggleAccordion(2)"
          >
            Accordion Item #2
          </DButton>
          <DCollapse v-model="accordionStates[2]">
            <div class="accordion-body">
              <p>This is the content for the second accordion item.</p>
            </div>
          </DCollapse>
        </div>

        <div class="accordion-item">
          <DButton
            variant="outline-primary"
            class="w-100 text-start"
            @click="toggleAccordion(3)"
          >
            Accordion Item #3
          </DButton>
          <DCollapse v-model="accordionStates[3]">
            <div class="accordion-body">
              <p>This is the content for the third accordion item.</p>
            </div>
          </DCollapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import DCollapse from '../../../resources/js/components/base/DCollapse.vue';
import DButton from '../../../resources/js/components/base/DButton.vue';
import DCard from '../../../resources/js/components/base/DCard.vue';

const visible = ref(false);
const accordionStates = reactive<Record<number, boolean>>({
  1: false,
  2: false,
  3: false,
});

const toggleAccordion = (item: number) => {
  // Close all items
  Object.keys(accordionStates).forEach(key => {
    accordionStates[Number(key)] = false;
  });
  // Open the clicked item
  accordionStates[item] = true;
};
</script>

<style scoped>
.collapse-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.accordion-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.accordion-item {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
}

.accordion-body {
  padding: 1rem;
  background-color: var(--bs-light);
}
</style>
