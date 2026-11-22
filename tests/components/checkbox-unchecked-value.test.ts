/**
 * Unticking a checkbox or switch emits exactly `false` (#249).
 *
 * bvn 0.46.0 changed BFormCheckbox's `uncheckedValue` default from `false`
 * to "no value" (null/undefined), so an unticked box stopped emitting a
 * boolean. Laravel's `boolean` rule rejects null, and `form.data.flag ===
 * false` checks break. DFormCheckbox restores the `false` default
 * (DIVERGENCES.md); a consumer's explicit `unchecked-value` still wins.
 *
 * Every case starts ticked and clicks once, so the value read is the one
 * bvn emits for the unchecked state, with a positive control that the click
 * actually changed something.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DFormCheckbox from '../../resources/js/components/base/DFormCheckbox.vue';
import DXSwitch from '../../resources/js/components/extended/DXSwitch.vue';
import DXField from '../../resources/js/components/extended/DXField.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Mounts `component` with a v-model starting at `initial`; records every emit. */
const mountWithModel = (
  component: unknown,
  initial: unknown,
  extraProps: Record<string, unknown> = {},
) => {
  const model = ref<unknown>(initial);
  const emittedValues: unknown[] = [];
  const screen = render({
    render: () =>
      h(BApp, {}, () =>
        h(component as never, {
          ...extraProps,
          modelValue: model.value,
          'onUpdate:modelValue': (value: unknown) => {
            emittedValues.push(value);
            model.value = value;
          },
        }),
      ),
  });
  return { screen, model, emittedValues };
};

const checkboxInput = (container: Element) =>
  container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;

const renderField = (
  fieldDef: FieldDefinition,
  data: Record<string, unknown>,
  layout: 'vertical' | 'horizontal' = 'vertical',
) => {
  const form = useForm(data);
  const screen = render({
    render: () => h(BApp, {}, () => h(DXField, { field: fieldDef, form, layout })),
  });
  return { screen, form };
};

describe('unticking emits exactly false (#249)', () => {
  it('DFormCheckbox', async () => {
    const { screen, emittedValues } = mountWithModel(DFormCheckbox, true);
    await flush();
    const input = checkboxInput(screen.container);
    expect(input.checked).toBe(true);

    await userEvent.click(input);

    expect(input.checked).toBe(false);
    expect(emittedValues).toEqual([false]);
  });

  it('DFormCheckbox still ticks to true', async () => {
    const { screen, emittedValues } = mountWithModel(DFormCheckbox, false);
    await flush();

    await userEvent.click(checkboxInput(screen.container));

    expect(emittedValues).toEqual([true]);
  });

  it('DFormCheckbox honours an explicit unchecked-value', async () => {
    const { screen, emittedValues } = mountWithModel(DFormCheckbox, 'yes', {
      value: 'yes',
      uncheckedValue: 'no',
    });
    await flush();
    expect(checkboxInput(screen.container).checked).toBe(true);

    await userEvent.click(checkboxInput(screen.container));

    expect(emittedValues).toEqual(['no']);
  });

  it('DFormCheckbox keeps an explicit empty-string unchecked-value', async () => {
    const { screen, emittedValues } = mountWithModel(DFormCheckbox, 'yes', {
      value: 'yes',
      'unchecked-value': '',
    });
    await flush();

    await userEvent.click(checkboxInput(screen.container));

    expect(emittedValues).toEqual(['']);
  });

  it('DFormCheckbox: an explicit undefined unchecked-value opts into bvn\'s default', async () => {
    const { screen, emittedValues } = mountWithModel(DFormCheckbox, true, {
      uncheckedValue: undefined,
    });
    await flush();

    await userEvent.click(checkboxInput(screen.container));

    expect(emittedValues).toEqual([undefined]);
  });

  it('DXSwitch', async () => {
    const { screen, emittedValues } = mountWithModel(DXSwitch, true, { label: 'Visible' });
    await flush();
    const input = checkboxInput(screen.container);
    expect(input.checked).toBe(true);

    await userEvent.click(input);

    expect(input.checked).toBe(false);
    expect(emittedValues).toEqual([false]);
  });

  for (const [type, layout] of [
    ['checkbox', 'vertical'],
    ['checkbox', 'horizontal'],
    ['switch', 'vertical'],
    ['switch', 'horizontal'],
  ] as const) {
    it(`DXField type "${type}" (${layout})`, async () => {
      const { screen, form } = renderField(
        { key: 'is_current', type, label: 'Current' } as FieldDefinition,
        { is_current: true },
        layout,
      );
      await flush();
      const input = checkboxInput(screen.container);
      expect(input.checked).toBe(true);

      await userEvent.click(input);

      expect(input.checked).toBe(false);
      expect(form.data.is_current).toBe(false);
    });
  }

  // Regression check only: DXField coerces each row's emit with `=== true`,
  // so this passes with or without DFormCheckbox's default.
  it('DXField switch-list row: unticking removes the value, leaves no null', async () => {
    const { screen, form } = renderField(
      {
        key: 'allergens',
        type: 'switch-list',
        options: [
          { value: 1, text: 'Celery' },
          { value: 2, text: 'Crustaceans' },
        ],
      } as FieldDefinition,
      { allergens: [1, 2] },
    );
    await flush();
    const inputs = screen.container.querySelectorAll<HTMLInputElement>(
      '.dx-switch-list-row input[type="checkbox"]',
    );
    expect(inputs).toHaveLength(2);
    expect(inputs[0].checked).toBe(true);

    await userEvent.click(inputs[0]);

    expect(inputs[0].checked).toBe(false);
    expect(form.data.allergens).toEqual([2]);
  });
});
