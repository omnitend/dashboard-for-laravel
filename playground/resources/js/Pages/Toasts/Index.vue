<script setup lang="ts">
import PlaygroundLayout from '../../Layouts/PlaygroundLayout.vue';
import { DCard, DButton, useToast } from '@omnitend/dashboard-for-laravel';

const toast = useToast();
const { create } = toast;

const showSuccessToast = () => {
  console.log('Toast object:', toast);
  console.log('create exists?', !!create);

  create?.({
    title: 'Success',
    body: 'This is a success message!',
    variant: 'success',
    modelValue: 3000,
  });
};

const showErrorToast = () => {
  create?.({
    title: 'Error',
    body: 'This is an error message!',
    variant: 'danger',
    modelValue: 5000,
  });
};

const showInfoToast = () => {
  create?.({
    title: 'Info',
    body: 'This is an informational message.',
    variant: 'info',
    modelValue: 4000,
  });
};

const showWarningToast = () => {
  create?.({
    title: 'Warning',
    body: 'This is a warning message!',
    variant: 'warning',
    modelValue: 4000,
  });
};
</script>

<template>
  <PlaygroundLayout current-url="/toasts" page-title="Toast Notifications">
    <DCard>
      <template #header>
        <h4 class="mb-0">Toast Notification Testing</h4>
      </template>

      <div class="p-4">
        <p class="mb-4">
          Click the buttons below to test toast notifications with Bootstrap Vue Next 0.40.7.
        </p>

        <div class="d-flex flex-wrap gap-3">
          <DButton variant="success" @click="showSuccessToast">
            Show Success Toast
          </DButton>

          <DButton variant="danger" @click="showErrorToast">
            Show Error Toast
          </DButton>

          <DButton variant="info" @click="showInfoToast">
            Show Info Toast
          </DButton>

          <DButton variant="warning" @click="showWarningToast">
            Show Warning Toast
          </DButton>
        </div>

        <hr class="my-4">

        <h5 class="mb-3">Toast API (Bootstrap Vue Next 0.40.7)</h5>
        <pre class="bg-light p-3 rounded"><code>const { create } = useToast();

create?.({
  title: 'Success',
  body: 'Message here',
  variant: 'success',
  modelValue: 3000, // Auto-dismiss after 3 seconds
});</code></pre>

        <p class="text-muted small mt-3">
          Note: DToaster component must be present in the layout for toasts to appear.
          Check PlaygroundLayout.vue - it's already included.
        </p>
      </div>
    </DCard>
  </PlaygroundLayout>
</template>
