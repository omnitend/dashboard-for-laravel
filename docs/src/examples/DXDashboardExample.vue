<template>
  <div class="dashboard-example">
    <h5>Complete Dashboard Layout</h5>
    <p>DXDashboard combines sidebar, navbar, and content area into a complete dashboard layout.</p>

    <div class="demo-frame">
      <iframe
        src="/examples/dxdashboard-demo.html"
        class="dashboard-iframe"
        title="DXDashboard Interactive Example"
      ></iframe>
    </div>

    <DAlert variant="info" class="mt-3">
      <strong>Tip:</strong> Click the hamburger menu in the example above to toggle the sidebar. This documentation site itself also uses DXDashboard!
    </DAlert>
  </div>
</template>

<script setup lang="ts">
import DAlert from '../../../resources/js/components/base/DAlert.vue';
</script>

<style scoped>
.dashboard-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.dashboard-example p {
  margin-bottom: 1.5rem;
  color: var(--bs-secondary);
}

.demo-frame {
  margin-top: 1.5rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
  background-color: var(--bs-white);
}

.dashboard-iframe {
  width: 100%;
  height: 600px;
  border: none;
  display: block;
}
</style>
