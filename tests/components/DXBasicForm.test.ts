import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXBasicForm from '../../resources/js/components/extended/DXBasicForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import { contactFormFields, initialContactFormData } from '../fixtures/formData';

describe('DXBasicForm', () => {
  describe('Basic Rendering', () => {
    it('renders form with all fields', async () => {
      const form = useForm(initialContactFormData);

      const screen = render(DXBasicForm, {
        props: {
          fields: contactFormFields,
          form: form,
          submitText: 'Send Message',
        },
      });

      // Check all field labels are rendered
      await expect.element(screen.getByText('Full Name')).toBeVisible();
      await expect.element(screen.getByText('Email Address')).toBeVisible();
      await expect.element(screen.getByText('Message')).toBeVisible();

      // Check submit button
      await expect.element(screen.getByRole('button', { name: 'Send Message' })).toBeVisible();
    });

    it('renders different field types correctly', async () => {
      const form = useForm(initialContactFormData);

      const screen = render(DXBasicForm, {
        props: {
          fields: contactFormFields,
          form: form,
        },
      });

      // Check input exists for text field
      const nameInput = screen.container.querySelector('input[type="text"]');
      expect(nameInput).toBeTruthy();

      // Check input exists for email field
      const emailInput = screen.container.querySelector('input[type="email"]');
      expect(emailInput).toBeTruthy();

      // Check textarea exists
      const messageTextarea = screen.container.querySelector('textarea');
      expect(messageTextarea).toBeTruthy();
    });
  });

  describe('Form State', () => {
    it('shows validation errors when provided', async () => {
      const form = useForm(initialContactFormData);

      // Set validation errors
      form.errors = {
        email: ['The email field is required.'],
        message: ['The message must be at least 10 characters.'],
      };

      const screen = render(DXBasicForm, {
        props: {
          fields: contactFormFields,
          form: form,
        },
      });

      // Check error messages are displayed
      await expect.element(screen.getByText('The email field is required.')).toBeVisible();
      await expect.element(screen.getByText('The message must be at least 10 characters.')).toBeVisible();
    });

    it('disables submit button when form is processing', async () => {
      const form = useForm(initialContactFormData);
      form.processing = true;

      const screen = render(DXBasicForm, {
        props: {
          fields: contactFormFields,
          form: form,
          submitText: 'Submit',
        },
      });

      // Submit button should be disabled
      const submitButton = await screen.getByRole('button', { name: 'Submit' });
      const button = submitButton.element() as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });
  });

  describe('Required Fields', () => {
    it('marks required fields with required attribute', async () => {
      const form = useForm(initialContactFormData);

      const screen = render(DXBasicForm, {
        props: {
          fields: contactFormFields,
          form: form,
        },
      });

      // All contact form fields are required
      const requiredInputs = screen.container.querySelectorAll('[required]');
      expect(requiredInputs.length).toBe(3); // name, email, message
    });
  });

  describe('Placeholders', () => {
    it('displays placeholder text for fields', async () => {
      const form = useForm(initialContactFormData);

      const screen = render(DXBasicForm, {
        props: {
          fields: contactFormFields,
          form: form,
        },
      });

      // Check placeholders
      const nameInput = screen.container.querySelector('input[placeholder="Enter your name"]');
      expect(nameInput).toBeTruthy();

      const emailInput = screen.container.querySelector('input[placeholder="your@email.com"]');
      expect(emailInput).toBeTruthy();
    });
  });
});
