import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
// Deliberately the BUILT package, not the source: this asserts what a CONSUMER
// gets. The source-level tests live in tests/components/DXTable.dotted-keys.test.ts.
import { DXTable } from '../../dist/dashboard-for-laravel.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * #121, verified against the built bundle.
 *
 * The dotted-key fix hangs off a dynamic slot name (`#[`cell(${field.key})`]`)
 * and a slot-set read that must survive compilation and minification. This repo
 * has been burned before by a fix that worked against source and was inert once
 * bundled (#53/#54), so the consumer-facing artefact gets its own check.
 */
describe('dotted field keys work in the BUILT package (#121)', () => {
  it('renders a nested value for a dotted key', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable as any, {
            items: [
              { id: 1, name: 'Beta', paid_by: { card: 'Visa' } },
              { id: 2, name: 'Alpha', paid_by: { card: 'Amex' } },
            ],
            fields: [
              { key: 'name', label: 'Name' },
              { key: 'paid_by.card', label: 'Card' },
            ],
            clientSide: true,
          }),
        ),
    });
    await flush();

    const cardColumn = [...screen.container.querySelectorAll('tbody tr')].map((row) =>
      row.querySelectorAll('td')[1]?.textContent?.trim(),
    );

    expect(cardColumn).toEqual(['Visa', 'Amex']);
  });
});
