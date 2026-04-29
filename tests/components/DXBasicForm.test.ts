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

      // Check all field labels are rendered (use specific queries to avoid ambiguity)
      const fullNameLabel = screen.container.querySelector('label[for="name"]');
      const emailLabel = screen.container.querySelector('label[for="email"]');
      const messageLabel = screen.container.querySelector('label[for="message"]');

      expect(fullNameLabel?.textContent).toBe('Full Name');
      expect(emailLabel?.textContent).toBe('Email Address');
      expect(messageLabel?.textContent).toBe('Message');

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

  describe('Conditional fields (show predicate)', () => {
    it('hides fields whose show() returns false', async () => {
      const form = useForm({ name: '', email: '', message: '', secret: '' });

      const fields = [
        ...contactFormFields,
        {
          key: 'secret',
          type: 'text' as const,
          label: 'Secret Field',
          show: () => false,
        },
      ];

      const screen = render(DXBasicForm, {
        props: { fields, form },
      });

      const secretLabel = screen.container.querySelector('label[for="secret"]');
      expect(secretLabel).toBeNull();

      // The other three fields are still rendered.
      expect(screen.container.querySelector('label[for="name"]')).toBeTruthy();
      expect(screen.container.querySelector('label[for="email"]')).toBeTruthy();
      expect(screen.container.querySelector('label[for="message"]')).toBeTruthy();
    });

    it('reactively re-evaluates show() when form data changes', async () => {
      const form = useForm({ type: 'a', conditional: '' });

      const fields = [
        { key: 'type', type: 'text' as const, label: 'Type' },
        {
          key: 'conditional',
          type: 'text' as const,
          label: 'Only when B',
          show: () => form.data.type === 'b',
        },
      ];

      const screen = render(DXBasicForm, {
        props: { fields, form },
      });

      // Initially hidden because type === 'a'.
      expect(screen.container.querySelector('label[for="conditional"]')).toBeNull();

      // Flip the predicate's input and re-check after Vue flushes.
      form.data.type = 'b';
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(screen.container.querySelector('label[for="conditional"]')).toBeTruthy();
    });

    it('treats fields without a show predicate as always visible', async () => {
      const form = useForm(initialContactFormData);

      const screen = render(DXBasicForm, {
        props: { fields: contactFormFields, form },
      });

      // None of the existing contact form fields declare `show`, so all should render.
      expect(screen.container.querySelector('label[for="name"]')).toBeTruthy();
      expect(screen.container.querySelector('label[for="email"]')).toBeTruthy();
      expect(screen.container.querySelector('label[for="message"]')).toBeTruthy();
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
