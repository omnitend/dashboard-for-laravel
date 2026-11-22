<template>
  <div class="toast-demo">
    <DButton variant="primary" @click="showSaved">Save product</DButton>
    <DButton variant="danger" @click="showFailure">Fail a save</DButton>
    <DButton variant="secondary" @click="showWaiting">Send for approval</DButton>
  </div>
</template>

<script setup lang="ts">
// useToast() must be called inside <DApp> (see DToastDemo.vue).
import { DButton, useToast } from '@omnitend/dashboard-for-laravel';

const toast = useToast();

// With no modelValue a toast shows for 5 seconds. A number sets the
// duration in milliseconds; hovering pauses the countdown.
const showSaved = () => {
  toast.create({ body: 'Desk lamp saved.', variant: 'success', modelValue: 3000 });
};

const showFailure = () => {
  toast.create({
    title: "Couldn't save",
    body: 'The server did not answer. Please try again.',
    variant: 'danger',
    modelValue: 6000,
  });
};

const showWaiting = () => {
  toast.create({ body: 'Sent to Priya for approval.', variant: 'pending' });
};
</script>

<style scoped>
.toast-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
