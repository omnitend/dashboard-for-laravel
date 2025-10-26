<template>
  <div class="alert-examples">
    <div class="example-section">
      <h5>Alert Variants</h5>
      <div class="alert-group">
        <DAlert variant="primary">
          <strong>Primary Alert</strong> - This is a primary alert with important information.
        </DAlert>
        <DAlert variant="secondary">
          <strong>Secondary Alert</strong> - This is a secondary alert with less critical information.
        </DAlert>
        <DAlert variant="success">
          <strong>Success!</strong> Your changes have been saved successfully.
        </DAlert>
        <DAlert variant="danger">
          <strong>Error!</strong> There was a problem processing your request.
        </DAlert>
        <DAlert variant="warning">
          <strong>Warning!</strong> Please review the following information carefully.
        </DAlert>
        <DAlert variant="info">
          <strong>Info:</strong> System maintenance scheduled for tonight at 2:00 AM.
        </DAlert>
      </div>
    </div>

    <div class="example-section">
      <h5>Dismissible Alerts</h5>
      <div class="alert-group">
        <DAlert v-if="showAlert1" variant="success" dismissible @close="showAlert1 = false">
          <strong>Dismissible Alert</strong> - Click the × button to dismiss this alert.
        </DAlert>
        <DAlert v-if="showAlert2" variant="warning" dismissible @close="showAlert2 = false">
          <strong>Another Dismissible Alert</strong> - This one can also be closed.
        </DAlert>
        <DButton v-if="!showAlert1 || !showAlert2" variant="outline-primary" size="sm" @click="resetAlerts">
          Reset Alerts
        </DButton>
      </div>
    </div>

    <div class="example-section">
      <h5>Alerts with Additional Content</h5>
      <div class="alert-group">
        <DAlert variant="info">
          <h6 class="alert-heading">System Update Available</h6>
          <p>A new version of the system is available. This update includes security patches and new features.</p>
          <hr>
          <p class="mb-0">Click "Update Now" to install the latest version.</p>
        </DAlert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DAlert from '../../../resources/js/components/base/DAlert.vue';
import DButton from '../../../resources/js/components/base/DButton.vue';

const showAlert1 = ref(true);
const showAlert2 = ref(true);

const resetAlerts = () => {
  showAlert1.value = true;
  showAlert2.value = true;
};
</script>

<style scoped>
.alert-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.alert-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert-heading {
  font-weight: 600;
  margin-bottom: 0.5rem;
}
</style>
