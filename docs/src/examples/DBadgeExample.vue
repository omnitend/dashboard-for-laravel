<template>
  <div class="badge-examples">
    <div class="example-section">
      <h5>Badge Variants</h5>
      <div class="badge-group">
        <DBadge variant="primary">Primary</DBadge>
        <DBadge variant="secondary">Secondary</DBadge>
        <DBadge variant="success">Success</DBadge>
        <DBadge variant="danger">Danger</DBadge>
        <DBadge variant="warning">Warning</DBadge>
        <DBadge variant="info">Info</DBadge>
        <DBadge variant="light">Light</DBadge>
        <DBadge variant="dark">Dark</DBadge>
      </div>
    </div>

    <div class="example-section">
      <h5>Pill Badges</h5>
      <div class="badge-group">
        <DBadge variant="primary" pill>Primary</DBadge>
        <DBadge variant="success" pill>Success</DBadge>
        <DBadge variant="danger" pill>Danger</DBadge>
        <DBadge variant="warning" pill>Warning</DBadge>
      </div>
    </div>

    <div class="example-section">
      <h5>Badges in Context</h5>
      <div class="context-examples">
        <h6>Notifications <DBadge variant="danger" pill>4</DBadge></h6>
        <h6>Messages <DBadge variant="primary" pill>12</DBadge></h6>
        <h6>Tasks <DBadge variant="success" pill>3</DBadge></h6>
      </div>
    </div>

    <div class="example-section">
      <h5>Status Badges</h5>
      <div class="badge-group">
        <DBadge variant="success">Active</DBadge>
        <DBadge variant="warning">Pending</DBadge>
        <DBadge variant="danger">Inactive</DBadge>
        <DBadge variant="info">Draft</DBadge>
        <DBadge variant="secondary">Archived</DBadge>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DBadge } from '@omni-tend/dashboard-for-laravel';

</script>

<style scoped>
.badge-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.badge-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.context-examples {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.context-examples h6 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}
</style>
