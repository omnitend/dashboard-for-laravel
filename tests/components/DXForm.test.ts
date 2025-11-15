import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { defineForm } from '../../resources/js/composables/defineForm';
import { contactFormFields } from '../fixtures/formData';

describe('DXForm', () => {
  describe('Basic Rendering', () => {
    it('renders form with fields from defineForm', async () => {
      const form = defineForm(contactFormFields);

      const screen = render(DXForm, {
        props: {
          form: form,
          submitText: 'Send',
        },
      });

      // Check field labels are rendered
      await expect.element(screen.getByText('Full Name')).toBeVisible();
      await expect.element(screen.getByText('Email Address')).toBeVisible();
      await expect.element(screen.getByText('Message')).toBeVisible();

      // Check submit button
      await expect.element(screen.getByRole('button', { name: 'Send' })).toBeVisible();
    });

    it('renders with default submit text', async () => {
      const form = defineForm(contactFormFields);

      const screen = render(DXForm, {
        props: {
          form: form,
        },
      });

      // Default submit text should be "Submit"
      await expect.element(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
    });
  });

  describe('Form State', () => {
    it('shows validation errors', async () => {
      const form = defineForm(contactFormFields);

      // Set validation errors on the underlying form instance
      form.form.errors = {
        email: ['Invalid email format'],
      };

      const screen = render(DXForm, {
        props: {
          form: form,
        },
      });

      // Error should be displayed
      await expect.element(screen.getByText('Invalid email format')).toBeVisible();
    });

    it('disables submit button when processing', async () => {
      const form = defineForm(contactFormFields);
      form.form.processing = true;

      const screen = render(DXForm, {
        props: {
          form: form,
        },
      });

      const submitButton = await screen.getByRole('button', { name: 'Submit' });
      const button = submitButton.element() as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });
  });

  describe('Form Submission', () => {
    it('emits submit event when form is submitted', async () => {
      const form = defineForm(contactFormFields);

      // Fill required fields to pass HTML5 validation
      form.form.data.name = 'John Doe';
      form.form.data.email = 'john@example.com';
      form.form.data.message = 'Test message';

      const screen = render(DXForm, {
        props: {
          form: form,
        },
      });

      // Find and click submit button
      const submitButton = await screen.getByRole('button', { name: 'Submit' });
      (submitButton.element() as HTMLElement).click();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Check submit event was emitted
      const submitEvents = screen.emitted('submit');
      expect(submitEvents).toBeTruthy();
    });
  });
});
