import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DXChoiceField from '../../resources/js/components/extended/DXChoiceField.vue';
import DAutocomplete from '../../resources/js/components/base/DAutocomplete.vue';
import type { FieldDefinition } from '../../resources/js/types';

const field: FieldDefinition = {
  key: 'account_id',
  type: 'select',
  label: 'Payee',
  searchable: true,
};

/**
 * #189 review. While a searchable select's first options load, its value is
 * held back (the control shows an empty selection). Anything the control emits
 * then is an edit of that empty stand-in: in multiple mode, picking 42 emits
 * [42] and would drop the 51 the form holds. The control is disabled then, so
 * the UI cannot normally get here; this drives the child's emit directly to
 * pin the second guard, which drops the update rather than writing the form.
 */
describe('DXChoiceField searchable select while its options are pending', () => {
  it('drops updates while the value is held back, and passes them on after', async () => {
    const wrapper = mount(DXChoiceField, {
      props: { field, modelValue: [51], options: [], optionsPending: true, controlProps: { multiple: true } },
      attachTo: document.body,
    });
    try {
      const autocomplete = wrapper.findComponent(DAutocomplete);
      expect(autocomplete.exists()).toBe(true);

      autocomplete.vm.$emit('update:modelValue', [42]);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();

      await wrapper.setProps({ optionsPending: false });
      autocomplete.vm.$emit('update:modelValue', [51, 42]);
      expect(wrapper.emitted('update:modelValue')).toEqual([[[51, 42]]]);
    } finally {
      wrapper.unmount();
    }
  });
});
