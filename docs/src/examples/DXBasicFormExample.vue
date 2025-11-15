<template>
  <div class="basic-form-examples">
    <div class="example-section">
      <h5>Contact Form Example</h5>
      <DXBasicForm
        :fields="contactFields"
        :form="contactForm"
        submit-text="Send Message"
        @submit="handleContactSubmit"
      />
    </div>

    <div class="example-section">
      <h5>Registration Form Example</h5>
      <DXBasicForm
        :fields="registerFields"
        :form="registerForm"
        submit-text="Register"
        @submit="handleRegisterSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DXBasicForm, useForm } from '@omnitend/dashboard-for-laravel';

// Contact form
const contactForm = useForm({
  name: '',
  email: '',
  subject: '',
  message: '',
});

const contactFields = [
  {
    key: 'name',
    label: 'Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Your name',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email' as const,
    required: true,
    placeholder: 'your@email.com',
  },
  {
    key: 'subject',
    label: 'Subject',
    type: 'select' as const,
    required: true,
    options: [
      { value: '', text: 'Select a subject' },
      { value: 'general', text: 'General Enquiry' },
      { value: 'support', text: 'Technical Support' },
      { value: 'feedback', text: 'Feedback' },
    ],
  },
  {
    key: 'message',
    label: 'Message',
    type: 'textarea' as const,
    required: true,
    placeholder: 'Your message...',
    rows: 4,
  },
];

const handleContactSubmit = () => {
  alert(`Message from ${contactForm.data.name} would be sent here!`);
  contactForm.reset();
};

// Registration form
const registerForm = useForm({
  username: '',
  email: '',
  password: '',
  country: 'UK',
  terms: false,
});

const registerFields = [
  {
    key: 'username',
    label: 'Username',
    type: 'text' as const,
    required: true,
    placeholder: 'Choose a username',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email' as const,
    required: true,
    placeholder: 'your@email.com',
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password' as const,
    required: true,
    placeholder: 'Minimum 8 characters',
  },
  {
    key: 'country',
    label: 'Country',
    type: 'select' as const,
    required: true,
    options: [
      { value: 'UK', text: 'United Kingdom' },
      { value: 'US', text: 'United States' },
      { value: 'CA', text: 'Canada' },
      { value: 'AU', text: 'Australia' },
    ],
  },
  {
    key: 'terms',
    label: 'I agree to the terms and conditions',
    type: 'checkbox' as const,
    required: true,
  },
];

const handleRegisterSubmit = () => {
  alert(`Registration for ${registerForm.data.username} would be processed here!`);
  registerForm.reset();
};
</script>

<style scoped>
.basic-form-examples {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.example-section h5 {
  margin-bottom: 1.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
