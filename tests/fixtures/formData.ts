import type { FieldDefinition } from '../../resources/js/types';

export const contactFormFields: FieldDefinition[] = [
  {
    key: 'name',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'Enter your name',
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
    placeholder: 'your@email.com',
  },
  {
    key: 'message',
    label: 'Message',
    type: 'textarea',
    required: true,
    placeholder: 'Your message here...',
  },
];

export const registrationFormFields: FieldDefinition[] = [
  {
    key: 'username',
    label: 'Username',
    type: 'text',
    required: true,
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    required: true,
  },
  {
    key: 'country',
    label: 'Country',
    type: 'select',
    required: true,
    options: [
      { value: 'UK', text: 'United Kingdom' },
      { value: 'US', text: 'United States' },
      { value: 'CA', text: 'Canada' },
    ],
  },
  {
    key: 'newsletter',
    label: 'Subscribe to newsletter',
    type: 'checkbox',
    required: false,
  },
];

export const initialContactFormData = {
  name: '',
  email: '',
  message: '',
};

export const initialRegistrationFormData = {
  username: '',
  email: '',
  password: '',
  country: 'UK',
  newsletter: false,
};
