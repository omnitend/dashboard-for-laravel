import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXFieldLabel from '../../resources/js/components/extended/DXFieldLabel.vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const affordance = (root: Element) => root.querySelector('.dx-field-label__info');

describe('DXFieldLabel info popover (#91)', () => {
  it('shows no info affordance without `info` or a popover slot', async () => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DXFieldLabel, { label: 'Name' })),
    });
    await flush();
    expect(affordance(screen.container)).toBeNull();
  });

  it('shows the info affordance for a plain `info` string', async () => {
    const screen = render({
      render: () => h(BApp, {}, () => h(DXFieldLabel, { label: 'Name', info: 'Some help' })),
    });
    await flush();
    expect(affordance(screen.container)).not.toBeNull();
  });

  it('shows the info affordance when a rich #popover slot is given (no info string)', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXFieldLabel, { label: 'Account type' }, {
            popover: () => h('ul', [h('li', 'Personal'), h('li', 'Business')]),
          }),
        ),
    });
    await flush();
    // The slot alone must surface the affordance — otherwise rich popover
    // content would be unreachable.
    expect(affordance(screen.container)).not.toBeNull();
  });
});

describe('DXForm forwards #info-popover(key) to the field label (#91)', () => {
  it('surfaces the label affordance from a keyed info-popover slot alone', async () => {
    const form = useForm({ account_type: '' });
    const screen = render({
      render: () =>
        h(
          BApp,
          {},
          () =>
            h(
              DXForm,
              {
                form,
                fields: [{ key: 'account_type', type: 'text', label: 'Account type' }],
                showSubmit: false,
              },
              {
                // A rich popover body, no `info` string on the field — the
                // affordance must still appear, proving the slot forwarded
                // DXForm → DXFormField → DXField → DXFieldLabel.
                'info-popover(account_type)': () =>
                  h('ul', [h('li', 'Personal'), h('li', 'Business')]),
              },
            ),
        ),
    });
    await flush();
    expect(affordance(screen.container)).not.toBeNull();
  });
});
