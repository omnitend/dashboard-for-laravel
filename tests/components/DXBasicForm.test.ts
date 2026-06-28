import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXBasicForm from '../../resources/js/components/extended/DXBasicForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

describe('DXBasicForm (deprecated alias of DXForm)', () => {
  it('renders the form and logs a one-time deprecation warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const form = useForm({ name: '' });
    const fields: FieldDefinition[] = [{ key: 'name', type: 'text', label: 'Name' }];

    const screen = render(DXBasicForm, {
      props: { form, fields, showSubmit: false },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Renders the same output as DXForm (flat).
    expect(screen.container.querySelector('input')).toBeTruthy();
    const labels = Array.from(screen.container.querySelectorAll('.form-label, label')).map(
      (el) => el.textContent?.trim(),
    );
    expect(labels).toContain('Name');

    // Warns about the deprecation.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('DXBasicForm is deprecated'));
    warn.mockRestore();
  });
});
