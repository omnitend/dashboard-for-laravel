import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXField from '../../resources/js/components/extended/DXField.vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import { defineForm } from '../../resources/js/composables/defineForm';
import type { FieldDefinition, FieldOption } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const ALLERGENS: FieldOption[] = [
  { value: 1, text: 'Celery', description: 'Includes celeriac' },
  { value: 2, text: 'Cereals containing gluten' },
  { value: 3, text: 'Crustaceans' },
];

const field = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  key: 'allergens',
  type: 'switch-list',
  options: ALLERGENS,
  ...overrides,
});

const renderField = (
  fieldDef: FieldDefinition,
  data: Record<string, any>,
  extraProps: Record<string, any> = {},
  slots: Record<string, any> = {},
) => {
  const form = useForm(data);
  const screen = render({
    render: () =>
      h(BApp, {}, () =>
        h(DXField, { field: fieldDef, form, ...extraProps }, slots),
      ),
  });
  return { screen, form };
};

const rowInputs = (container: Element) =>
  Array.from(
    container.querySelectorAll<HTMLInputElement>(
      '.dx-switch-list-row .form-switch input',
    ),
  );

describe('DXField switch-list (#160)', () => {
  it('renders one labelled track-switch row per option', async () => {
    const { screen } = renderField(field(), { allergens: [] });
    await flush();

    const rows = screen.container.querySelectorAll('.dx-switch-list-row');
    expect(rows.length).toBe(3);
    expect(rowInputs(screen.container).length).toBe(3);
    expect(screen.container.textContent).toContain('Celery');
    expect(screen.container.textContent).toContain('Crustaceans');
    // Track switches, not the filled-box DXSwitch.
    expect(screen.container.querySelector('.dx-switch')).toBeNull();
  });

  it('puts each row label in the form grid label column (horizontal layout)', async () => {
    const { screen } = renderField(
      field(),
      { allergens: [] },
      { layout: 'horizontal' },
    );
    await flush();

    // Would this pass with hardcoded markup instead of DFormGroup? No — the
    // col-form-label class and the column wrapper come from the real group.
    const firstRow = screen.container.querySelector('.dx-switch-list-row')!;
    const label = firstRow.querySelector('.col-form-label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toContain('Celery');
    expect(firstRow.querySelector('[class*="col-"]')).not.toBeNull();
  });

  it('seeds on-state from the array model and toggling adds/removes values', async () => {
    const { screen, form } = renderField(field(), { allergens: [2] });
    await flush();

    const inputs = rowInputs(screen.container);
    expect(inputs[0].checked).toBe(false);
    expect(inputs[1].checked).toBe(true);

    await userEvent.click(inputs[0]);
    expect(form.data.allergens).toEqual([2, 1]);

    await userEvent.click(inputs[1]);
    expect(form.data.allergens).toEqual([1]);
  });

  it('clears the field validation error on toggle', async () => {
    const { screen, form } = renderField(field(), { allergens: [] });
    await flush();
    form.setErrors({ allergens: ['Pick at least one'] });
    expect(form.hasError('allergens')).toBe(true);

    await userEvent.click(rowInputs(screen.container)[0]);
    expect(form.hasError('allergens')).toBe(false);
  });

  it('switchVariant "neutral" opts rows out of the green/red valence', async () => {
    const { screen } = renderField(field({ switchVariant: 'neutral' }), {
      allergens: [],
    });
    await flush();
    const switches = screen.container.querySelectorAll('.dx-switch-list-row .form-switch');
    expect(switches.length).toBe(3);
    switches.forEach((el) => expect(el.classList.contains('switch-neutral')).toBe(true));

    // Default stays the house success valence (no opt-out class).
    const { screen: plain } = renderField(field(), { allergens: [] });
    await flush();
    expect(plain.container.querySelector('.switch-neutral')).toBeNull();
  });

  it('populates rows from an async optionsLoader', async () => {
    const { screen } = renderField(
      field({ options: undefined, optionsLoader: async () => ALLERGENS }),
      { allergens: [] },
    );
    await flush();
    expect(screen.container.querySelectorAll('.dx-switch-list-row').length).toBe(3);
  });

  it('renders the per-row slot with { option, on } beside the switch', async () => {
    const { screen } = renderField(
      field(),
      { allergens: [3] },
      {},
      {
        'switch-list-item': (props: { option: FieldOption; on: boolean }) =>
          h('span', { class: 'row-extra' }, `${props.option.text}:${props.on}`),
      },
    );
    await flush();

    const extras = Array.from(screen.container.querySelectorAll('.row-extra'));
    expect(extras.map((el) => el.textContent)).toEqual([
      'Celery:false',
      'Cereals containing gluten:false',
      'Crustaceans:true',
    ]);
    // Beside the switch — inside the control cell, not below the list.
    expect(extras[0].closest('.dx-switch-list-control')).not.toBeNull();
  });

  it('renders a section heading only when the field has a label', async () => {
    const { screen } = renderField(field({ label: 'Allergens' }), { allergens: [] });
    await flush();
    expect(screen.container.querySelector('.dx-switch-list-heading')!.textContent).toContain('Allergens');

    const { screen: unlabelled } = renderField(field(), { allergens: [] });
    await flush();
    expect(unlabelled.container.querySelector('.dx-switch-list-heading')).toBeNull();
  });

  it('handles empty options without crashing', async () => {
    const { screen } = renderField(field({ options: [] }), { allergens: [] });
    await flush();
    expect(screen.container.querySelectorAll('.dx-switch-list-row').length).toBe(0);
  });
});

describe('switch-list through DXForm (#160)', () => {
  it('forwards the keyed #switch-list-item(<key>) slot across the DXForm hop', async () => {
    const { form, fields } = defineForm([field({ label: 'Allergens' })]);
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(
            DXForm,
            { form, fields, showSubmit: false },
            {
              'switch-list-item(allergens)': (props: { option: FieldOption; on: boolean }) =>
                h('em', { class: 'keyed-extra' }, props.option.text),
            },
          ),
        ),
    });
    await flush();

    expect(screen.container.querySelectorAll('.keyed-extra').length).toBe(3);
  });

  it('defineForm seeds switch-list (and checkbox-group) as [], not ""', () => {
    const { form } = defineForm([
      field(),
      { key: 'tags', type: 'checkbox-group', options: ALLERGENS },
    ]);
    expect(form.data.allergens).toEqual([]);
    expect(form.data.tags).toEqual([]);
  });
});
