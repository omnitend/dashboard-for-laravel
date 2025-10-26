<template>
  <div class="offcanvas-examples">
    <div class="example-section">
      <h5>Offcanvas Placements</h5>
      <div class="button-group">
        <DButton variant="primary" @click="showStartOffcanvas = true">Start</DButton>
        <DButton variant="primary" @click="showEndOffcanvas = true">End</DButton>
        <DButton variant="primary" @click="showTopOffcanvas = true">Top</DButton>
        <DButton variant="primary" @click="showBottomOffcanvas = true">Bottom</DButton>
      </div>

      <DOffcanvas v-model="showStartOffcanvas" title="Offcanvas Start" placement="start">
        <p>This offcanvas slides in from the left side.</p>
        <p>Perfect for navigation menus or side panels.</p>
      </DOffcanvas>

      <DOffcanvas v-model="showEndOffcanvas" title="Offcanvas End" placement="end">
        <p>This offcanvas slides in from the right side.</p>
        <p>Commonly used for filters or additional options.</p>
      </DOffcanvas>

      <DOffcanvas v-model="showTopOffcanvas" title="Offcanvas Top" placement="top">
        <p>This offcanvas slides in from the top.</p>
        <p>Useful for notifications or announcements.</p>
      </DOffcanvas>

      <DOffcanvas v-model="showBottomOffcanvas" title="Offcanvas Bottom" placement="bottom">
        <p>This offcanvas slides in from the bottom.</p>
        <p>Great for mobile actions or sheets.</p>
      </DOffcanvas>
    </div>

    <div class="example-section">
      <h5>Offcanvas with Backdrop</h5>
      <div class="button-group">
        <DButton variant="secondary" @click="showBackdropOffcanvas = true">With Backdrop</DButton>
        <DButton variant="secondary" @click="showNoBackdropOffcanvas = true">No Backdrop</DButton>
        <DButton variant="secondary" @click="showStaticOffcanvas = true">Static Backdrop</DButton>
      </div>

      <DOffcanvas v-model="showBackdropOffcanvas" title="With Backdrop">
        <p>This offcanvas has a backdrop that closes when clicked.</p>
      </DOffcanvas>

      <DOffcanvas v-model="showNoBackdropOffcanvas" title="No Backdrop" no-backdrop>
        <p>This offcanvas has no backdrop. You can interact with the page behind it.</p>
      </DOffcanvas>

      <DOffcanvas v-model="showStaticOffcanvas" title="Static Backdrop" backdrop="static">
        <p>This offcanvas has a static backdrop. Clicking outside won't close it.</p>
        <p>Use the close button or press ESC to close.</p>
      </DOffcanvas>
    </div>

    <div class="example-section">
      <h5>Offcanvas with Navigation</h5>
      <DButton variant="info" @click="showNavOffcanvas = true">Open Navigation</DButton>
      <DOffcanvas v-model="showNavOffcanvas" title="Navigation Menu">
        <DNav vertical pills>
          <DNavItem active>Dashboard</DNavItem>
          <DNavItem>Customers</DNavItem>
          <DNavItem>Orders</DNavItem>
          <DNavItem>Products</DNavItem>
          <DNavItem>Reports</DNavItem>
          <DNavItem>Settings</DNavItem>
        </DNav>
      </DOffcanvas>
    </div>

    <div class="example-section">
      <h5>Offcanvas with Form</h5>
      <DButton variant="success" @click="showFormOffcanvas = true">Add New Item</DButton>
      <DOffcanvas v-model="showFormOffcanvas" title="Add New Item">
        <DFormGroup label="Item Name" label-for="item-name">
          <DFormInput id="item-name" v-model="itemForm.name" placeholder="Enter item name" />
        </DFormGroup>
        <DFormGroup label="Description" label-for="item-desc">
          <DFormTextarea id="item-desc" v-model="itemForm.description" rows="3" />
        </DFormGroup>
        <DFormGroup label="Category" label-for="item-category">
          <DFormSelect id="item-category" v-model="itemForm.category" :options="categoryOptions" />
        </DFormGroup>
        <div class="d-flex gap-2">
          <DButton variant="primary" @click="saveItem">Save</DButton>
          <DButton variant="secondary" @click="showFormOffcanvas = false">Cancel</DButton>
        </div>
      </DOffcanvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DButton from '../../../resources/js/components/base/DButton.vue';
import DOffcanvas from '../../../resources/js/components/base/DOffcanvas.vue';
import DNav from '../../../resources/js/components/base/DNav.vue';
import DNavItem from '../../../resources/js/components/base/DNavItem.vue';
import DFormGroup from '../../../resources/js/components/base/DFormGroup.vue';
import DFormInput from '../../../resources/js/components/base/DFormInput.vue';
import DFormTextarea from '../../../resources/js/components/base/DFormTextarea.vue';
import DFormSelect from '../../../resources/js/components/base/DFormSelect.vue';

const showStartOffcanvas = ref(false);
const showEndOffcanvas = ref(false);
const showTopOffcanvas = ref(false);
const showBottomOffcanvas = ref(false);
const showBackdropOffcanvas = ref(false);
const showNoBackdropOffcanvas = ref(false);
const showStaticOffcanvas = ref(false);
const showNavOffcanvas = ref(false);
const showFormOffcanvas = ref(false);

const itemForm = ref({
  name: '',
  description: '',
  category: '',
});

const categoryOptions = [
  { value: '', text: 'Select a category' },
  { value: 'electronics', text: 'Electronics' },
  { value: 'clothing', text: 'Clothing' },
  { value: 'books', text: 'Books' },
  { value: 'home', text: 'Home & Garden' },
];

const saveItem = () => {
  console.log('Saving item:', itemForm.value);
  showFormOffcanvas.value = false;
  itemForm.value = { name: '', description: '', category: '' };
};
</script>

<style scoped>
.offcanvas-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
</style>
