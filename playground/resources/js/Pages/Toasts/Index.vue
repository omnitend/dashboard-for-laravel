<script setup lang="ts">
import PlaygroundLayout from '../../Layouts/PlaygroundLayout.vue';
import { DCard, DButton, DButtonGroup, useToast } from '@omnitend/dashboard-for-laravel';

const toast = useToast();

const showSuccessToast = () => {
  toast.show?.({
    props: {
      title: 'Success',
      body: 'This is a success message!',
      variant: 'success',
      value: 3000,
    }
  });
};

const showErrorToast = () => {
  toast.show?.({
    props: {
      title: 'Error',
      body: 'This is an error message!',
      variant: 'danger',
      value: 5000,
    }
  });
};

const showInfoToast = () => {
  toast.show?.({
    props: {
      title: 'Info',
      body: 'This is an informational message.',
      variant: 'info',
      value: 4000,
    }
  });
};

const showWarningToast = () => {
  toast.show?.({
    props: {
      title: 'Warning',
      body: 'This is a warning message!',
      variant: 'warning',
      value: 4000,
    }
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
          Click the buttons below to test toast notifications. Toasts will appear in the top-right corner.
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

        <h5 class="mb-3">Toast API Details</h5>
        <pre class="bg-light p-3 rounded"><code>const toast = useToast();

toast.show?.({
  props: {
    title: 'Success',
    body: 'Message here',
    variant: 'success',
    value: 3000, // Auto-dismiss after 3 seconds
  }
});</code></pre>

        <p class="text-muted small mt-3">
          Note: DToaster component must be present in the layout for toasts to appear.
          Check PlaygroundLayout.vue to see it's included.
        </p>
      </div>
    </DCard>
  </PlaygroundLayout>
</template>
