<template>
  <div class="form-example">
    <h5>Advanced Form Example</h5>
    <p class="text-muted">DXForm uses defineForm for type-safe form handling with field definitions.</p>
    <DXForm
      :form="contactForm"
      submit-text="Send Message"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import DXForm from '../../../resources/js/components/extended/DXForm.vue';
import { defineForm } from '../../../resources/js/composables/defineForm';

const contactForm = defineForm([
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    required: true,
    placeholder: 'Enter your name',
    default: '',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'your@email.com',
    default: '',
  },
  {
    key: 'message',
    label: 'Message',
    type: 'textarea',
    required: true,
    placeholder: 'Your message here...',
    default: '',
  },
] as const);

const handleSubmit = () => {
  alert(`Form submitted!\nName: ${contactForm.form.data.name}\nEmail: ${contactForm.form.data.email}`);
};
</script>

<style scoped>
.form-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.form-example p {
  margin-bottom: 1.5rem;
}
</style>
